import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LetterKind, LetterStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';
import { AuditService } from '../audit/audit.service';
import { normaliseEmail } from '../common/validators';
import { EmployeeHistoryService } from './employee-history.service';
import type { RequestUser } from './hrm.service';

export const LETTER_KINDS: LetterKind[] = ['OFFER_LETTER', 'COMPLETION_CERTIFICATE', 'PAYSLIP'];

export const LETTER_KIND_LABEL: Record<LetterKind, string> = {
  OFFER_LETTER: 'Offer letters',
  COMPLETION_CERTIFICATE: 'Internship certificates',
  PAYSLIP: 'Payslips',
};

/** HR and Admin handle every letter; Finance releases payroll, so only payslips. */
function visibleKinds(viewer?: RequestUser): LetterKind[] {
  if (!viewer) return [];
  if (viewer.role === 'SUPER_ADMIN' || viewer.role === 'HR_MANAGER') return LETTER_KINDS;
  if (viewer.role === 'FINANCE_MANAGER') return ['PAYSLIP'];
  return [];
}

export interface QueueInput {
  kind: LetterKind;
  employeeId?: string | null;
  payrollId?: string | null;
  documentId: string;
  to: string;
  subject: string;
  html: string;
  attachmentName: string;
  actor?: RequestUser | null;
}

export interface QueueResult {
  letterId: string;
  /** True once the email has actually gone out. */
  emailed: boolean;
  /** True when the letter is waiting in the outbox for someone to review it. */
  pending: boolean;
  error?: string;
}

const policyKey = (kind: LetterKind) => `letter_preview_${kind}`;

/**
 * The step between "a letter was generated" and "an email left the building".
 * Every letter the ERP mails (offer letters, internship certificates,
 * payslips) comes through here: it is stored as a draft until a person has
 * looked at the PDF and the recipient, unless HR has switched the preview off
 * for that kind of letter.
 */
@Injectable()
export class LetterOutboxService {
  private readonly logger = new Logger(LetterOutboxService.name);

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private audit: AuditService,
    private history: EmployeeHistoryService,
  ) {}

  // ---------- settings ----------

  async getSettings(): Promise<Record<LetterKind, boolean>> {
    const rows = await this.prisma.companyPolicy.findMany({ where: { key: { in: LETTER_KINDS.map(policyKey) } } });
    const out = {} as Record<LetterKind, boolean>;
    for (const k of LETTER_KINDS) out[k] = rows.find((r) => r.key === policyKey(k))?.value !== 'false';
    return out;
  }

  async setPreview(kind: LetterKind, on: boolean, viewer?: RequestUser) {
    if (!viewer || (viewer.role !== 'SUPER_ADMIN' && viewer.role !== 'HR_MANAGER')) {
      throw new ForbiddenException('Only HR and administrators can change preview settings.');
    }
    if (!LETTER_KINDS.includes(kind)) throw new BadRequestException('Unknown letter type.');
    await this.prisma.companyPolicy.upsert({
      where: { key: policyKey(kind) },
      update: { value: String(on), updatedById: viewer.id },
      create: {
        key: policyKey(kind),
        value: String(on),
        label: `Preview ${LETTER_KIND_LABEL[kind].toLowerCase()} before sending`,
        updatedById: viewer.id,
      },
    });
    await this.audit.log({
      userId: viewer.id, role: viewer.role, action: 'CHANGE_LETTER_PREVIEW', actionType: 'UPDATE', module: 'HR',
      entityType: 'CompanyPolicy', entityId: policyKey(kind),
      description: `${on ? 'Turned on' : 'Turned off'} preview-before-sending for ${LETTER_KIND_LABEL[kind].toLowerCase()}`,
    });
    return this.getSettings();
  }

  // ---------- queue ----------

  /** Stores the letter as a draft, or mails it straight away when preview is off for its kind. */
  async queue(input: QueueInput, options: { forceDraft?: boolean } = {}): Promise<QueueResult> {
    const actorName = input.actor ? await this.actorName(input.actor.id) : null;

    // A freshly generated letter replaces any older unsent copy of the same
    // letter (same person + type, or same payroll for payslips), so the Outbox
    // never offers an outdated version to send after details were edited.
    const sameLetter = input.payrollId
      ? { payrollId: input.payrollId }
      : input.employeeId ? { employeeId: input.employeeId } : null;
    if (sameLetter) {
      await this.prisma.outgoingLetter.updateMany({
        where: { ...sameLetter, kind: input.kind, status: { in: ['DRAFT', 'FAILED'] } },
        data: { status: 'DISCARDED', error: 'Replaced by a newer version of this letter.' },
      });
    }
    const letter = await this.prisma.outgoingLetter.create({
      data: {
        kind: input.kind,
        employeeId: input.employeeId ?? null,
        payrollId: input.payrollId ?? null,
        documentId: input.documentId,
        toEmail: input.to,
        subject: input.subject,
        htmlBody: input.html,
        attachmentName: input.attachmentName,
        createdById: input.actor?.id ?? null,
        createdByName: actorName,
      },
    });

    const previewOn = (await this.getSettings())[input.kind];
    if (previewOn || options.forceDraft) return { letterId: letter.id, emailed: false, pending: true };

    const sent = await this.dispatch(letter.id, input.actor ?? null);
    return { letterId: letter.id, emailed: sent.status === 'SENT', pending: false, error: sent.error ?? undefined };
  }

  // ---------- reading ----------

  async list(status: LetterStatus | undefined, viewer?: RequestUser) {
    const kinds = this.kindsOrThrow(viewer);
    const rows = await this.prisma.outgoingLetter.findMany({
      where: { kind: { in: kinds }, ...(status ? { status } : {}) },
      include: { employee: { select: { id: true, firstName: true, lastName: true, empCode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return rows.map(({ htmlBody, ...r }) => r);
  }

  async counts(viewer?: RequestUser) {
    const kinds = this.kindsOrThrow(viewer);
    const grouped = await this.prisma.outgoingLetter.groupBy({ by: ['status'], where: { kind: { in: kinds } }, _count: { _all: true } });
    const out: Record<string, number> = { DRAFT: 0, SENT: 0, FAILED: 0, DISCARDED: 0 };
    for (const g of grouped) out[g.status] = g._count._all;
    return out;
  }

  async get(id: string, viewer?: RequestUser) {
    const letter = await this.prisma.outgoingLetter.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, empCode: true } },
        document: { select: { id: true, fileName: true, kind: true } },
      },
    });
    if (!letter) throw new NotFoundException('Letter not found');
    this.assertVisible(letter.kind, viewer);
    return letter;
  }

  async resolvePdf(id: string, viewer?: RequestUser) {
    const letter = await this.prisma.outgoingLetter.findUnique({ where: { id }, include: { document: true } });
    if (!letter) throw new NotFoundException('Letter not found');
    this.assertVisible(letter.kind, viewer);
    const fullPath = path.join(process.cwd(), 'private-uploads', letter.document.storagePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('The stored PDF is missing on disk.');
    return { fullPath, fileName: letter.attachmentName };
  }

  // ---------- acting ----------

  async update(id: string, data: { toEmail?: string; subject?: string }, viewer?: RequestUser) {
    const letter = await this.get(id, viewer);
    this.assertOpen(letter.status);
    const patch: { toEmail?: string; subject?: string } = {};
    if (data.toEmail !== undefined) patch.toEmail = normaliseEmail(String(data.toEmail));
    if (data.subject !== undefined) {
      const subject = String(data.subject).trim();
      if (!subject) throw new BadRequestException('The subject cannot be empty.');
      patch.subject = subject.slice(0, 200);
    }
    return this.prisma.outgoingLetter.update({ where: { id }, data: patch });
  }

  async send(id: string, viewer?: RequestUser) {
    const letter = await this.get(id, viewer);
    this.assertOpen(letter.status);
    const result = await this.dispatch(id, viewer ?? null);
    return { id, status: result.status, error: result.error };
  }

  /** Sends several drafts one after another; one failure never stops the rest. */
  async sendMany(ids: string[], viewer?: RequestUser) {
    const out: { id: string; status: LetterStatus | 'SKIPPED'; error?: string | null }[] = [];
    for (const id of Array.from(new Set(ids ?? []))) {
      try {
        const r = await this.send(id, viewer);
        out.push({ id, status: r.status, error: r.error });
      } catch (e: any) {
        out.push({ id, status: 'SKIPPED', error: e?.message ?? 'Could not send' });
      }
    }
    return out;
  }

  async discard(id: string, viewer?: RequestUser) {
    const letter = await this.get(id, viewer);
    this.assertOpen(letter.status);
    await this.prisma.outgoingLetter.update({ where: { id }, data: { status: 'DISCARDED' } });
    await this.audit.log({
      userId: viewer?.id, role: viewer?.role, action: 'DISCARD_LETTER', actionType: 'UPDATE', module: 'HR',
      entityType: 'OutgoingLetter', entityId: id,
      description: `Discarded the unsent ${LETTER_KIND_LABEL[letter.kind].toLowerCase().replace(/s$/, '')} to ${letter.toEmail}`,
    });
    return { id, status: 'DISCARDED' as const };
  }

  /** Retires a draft that has been replaced by a freshly generated one. */
  async supersede(id: string) {
    await this.prisma.outgoingLetter.updateMany({ where: { id, status: { in: ['DRAFT', 'FAILED'] } }, data: { status: 'DISCARDED' } });
  }

  // ---------- internals ----------

  private async dispatch(id: string, actor: RequestUser | null) {
    const letter = await this.prisma.outgoingLetter.findUniqueOrThrow({ where: { id }, include: { document: true } });
    const fullPath = path.join(process.cwd(), 'private-uploads', letter.document.storagePath);

    let sent = false;
    let error: string | null = null;
    if (!fs.existsSync(fullPath)) {
      error = 'The stored PDF is missing on disk, so it cannot be attached.';
    } else {
      const result = await this.mailer.send({
        to: letter.toEmail,
        subject: letter.subject,
        html: letter.htmlBody,
        attachments: [{ filename: letter.attachmentName, path: fullPath }],
      });
      sent = result.sent;
      error = result.sent ? null : result.error;
    }

    const actorName = actor ? await this.actorName(actor.id) : null;
    const updated = await this.prisma.outgoingLetter.update({
      where: { id },
      data: sent
        ? { status: 'SENT', sentAt: new Date(), sentByName: actorName, error: null }
        : { status: 'FAILED', error },
    });

    await this.afterDispatch(letter, sent, error, actor);
    return updated;
  }

  /** What the rest of the app records once a letter has really gone out (or failed to). */
  private async afterDispatch(
    letter: { id: string; kind: LetterKind; employeeId: string | null; payrollId: string | null; documentId: string; toEmail: string },
    sent: boolean,
    error: string | null,
    actor: RequestUser | null,
  ) {
    try {
      if (letter.kind === 'OFFER_LETTER' && letter.employeeId) {
        await this.prisma.employee.update({
          where: { id: letter.employeeId },
          data: sent ? { offerLetterSentAt: new Date(), offerLetterSendError: null } : { offerLetterSendError: error },
        });
        await this.history.record({
          employeeId: letter.employeeId, type: 'OFFER_LETTER_ISSUED', documentId: letter.documentId, actor,
          title: sent ? `Offer letter issued and emailed to ${letter.toEmail}` : 'Offer letter generated — email failed',
          note: sent ? null : error,
        });
      } else if (letter.kind === 'COMPLETION_CERTIFICATE' && letter.employeeId) {
        if (sent) await this.prisma.employee.update({ where: { id: letter.employeeId }, data: { internshipCertSentAt: new Date() } });
        await this.history.record({
          employeeId: letter.employeeId, type: 'INTERNSHIP_CERTIFICATE_ISSUED', documentId: letter.documentId, actor,
          title: sent ? `Internship completion certificate issued and emailed to ${letter.toEmail}` : 'Internship completion certificate issued — email failed',
          note: sent ? null : error,
        });
      } else if (letter.kind === 'PAYSLIP' && letter.payrollId) {
        await this.prisma.payroll.update({
          where: { id: letter.payrollId },
          data: sent ? { payslipSentAt: new Date(), payslipSendError: null } : { payslipSendError: error },
        });
      }
      await this.audit.log({
        userId: actor?.id, role: actor?.role, action: sent ? 'SEND_LETTER' : 'SEND_LETTER_FAILED', actionType: 'UPDATE', module: 'HR',
        entityType: 'OutgoingLetter', entityId: letter.id,
        description: sent
          ? `Emailed ${LETTER_KIND_LABEL[letter.kind].toLowerCase().replace(/s$/, '')} to ${letter.toEmail}`
          : `Could not email ${LETTER_KIND_LABEL[letter.kind].toLowerCase().replace(/s$/, '')} to ${letter.toEmail}: ${error}`,
      });
    } catch (e: any) {
      // Bookkeeping must never turn a delivered email into an error.
      this.logger.error(`Post-send bookkeeping failed for letter ${letter.id}: ${e.message}`);
    }
  }

  private kindsOrThrow(viewer?: RequestUser): LetterKind[] {
    const kinds = visibleKinds(viewer);
    if (kinds.length === 0) throw new ForbiddenException('You do not have access to the letter outbox.');
    return kinds;
  }

  private assertVisible(kind: LetterKind, viewer?: RequestUser) {
    if (!this.kindsOrThrow(viewer).includes(kind)) throw new ForbiddenException('You do not have access to this letter.');
  }

  private assertOpen(status: LetterStatus) {
    if (status === 'SENT') throw new BadRequestException('This letter has already been sent.');
    if (status === 'DISCARDED') throw new BadRequestException('This letter was discarded.');
  }

  private async actorName(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true, employee: { select: { firstName: true, lastName: true } } },
    });
    if (!u) return null;
    return u.employee ? `${u.employee.firstName} ${u.employee.lastName}`.trim() : u.username || u.email || null;
  }
}
