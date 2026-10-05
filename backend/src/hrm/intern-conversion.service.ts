import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmpStatus, EmpType, WorkMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normaliseEmail } from '../common/validators';
import { formatDateDMY } from '../common/date-format';
import { TeamsService } from './teams.service';
import { OfferLetterService } from './offer-letter.service';
import { EmployeeHistoryService, EMP_TYPE_LABEL, HistoryChange, STATUS_LABEL, WORK_MODE_LABEL } from './employee-history.service';
import type { RequestUser } from './hrm.service';

const TARGET_TYPES = new Set<EmpType>(['FULL_TIME', 'PART_TIME']);
const START_STATUSES = new Set<EmpStatus>(['ACTIVE', 'PROBATION']);
const WORK_MODES = new Set<WorkMode>(['ONSITE', 'REMOTE', 'HYBRID']);

export interface ConversionInput {
  empType: EmpType;
  designation: string;
  department: string;
  workMode: WorkMode;
  reportingManagerId?: string | null;
  effectiveDate: string;
  startStatus?: EmpStatus;
  /** Part-time only: an optional fixed end to the new engagement. */
  engagementEndDate?: string | null;
  isPaid: boolean;
  basic?: number;
  hra?: number;
  specialAllowance?: number;
  firstName: string;
  lastName?: string;
  personalEmail: string;
  contact?: string | null;
  sendOfferLetter?: boolean;
  note?: string | null;
}

const DAY = 86400000;

/** "Software Engineering Intern" -> "Software Engineer"-style suggestion: drop intern/trainee wording. */
function suggestTitle(title: string): string {
  const stripped = title
    .replace(/\b(intern(ship)?|trainee|apprentice)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–,]+|[\s\-–,]+$/g, '')
    .trim()
    // "Software Engineering Intern" names a field; the job is "Software Engineer".
    .replace(/Engineering$/i, 'Engineer')
    .replace(/Development$/i, 'Developer')
    .replace(/Analytics$/i, 'Analyst')
    .replace(/Design$/i, 'Designer');
  return stripped || title;
}

/**
 * Date-only values (join date, internship end, role start) are stored as UTC
 * midnight across this app — `new Date('2026-10-01')` — so conversion dates
 * follow the same rule; local-midnight math would shift them a day in IST.
 */
function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Today's calendar date where the server is, as a UTC-midnight value. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Turns an intern whose completion certificate has been issued into a
 * part-time or full-time employee: one guarded transaction updates the role
 * everywhere it is read from, closes the stipend record and opens the new pay
 * record, and writes the history entry; then the matching offer letter is
 * generated and emailed and the person is notified in-app.
 */
@Injectable()
export class InternConversionService {
  private readonly logger = new Logger(InternConversionService.name);

  constructor(
    private prisma: PrismaService,
    private offerLetters: OfferLetterService,
    private history: EmployeeHistoryService,
    private audit: AuditService,
    private teams: TeamsService,
  ) {}

  private async loadIntern(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        reportingManager: { select: { id: true, firstName: true, lastName: true, empCode: true } },
        user: { select: { id: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  /** Every reason this person can't be converted right now — empty means eligible. */
  private blockers(e: Awaited<ReturnType<InternConversionService['loadIntern']>>): string[] {
    const reasons: string[] = [];
    if (e.convertedFromInternAt) reasons.push(`Already converted to ${EMP_TYPE_LABEL[e.empType]} on ${formatDateDMY(e.convertedFromInternAt)}.`);
    else if (e.empType !== 'INTERN') reasons.push('Only interns can be converted from here.');
    if (e.status === 'INACTIVE') reasons.push('This person has left the company.');
    if (e.internshipCertStatus !== 'APPROVED') reasons.push('Issue the internship completion certificate first.');
    return reasons;
  }

  /**
   * Everything the confirmation screen needs, pre-filled from the current
   * record, plus a factual summary of the internship (attendance, leave,
   * reviews, project work) to support the decision.
   */
  async getDraft(employeeId: string) {
    const e = await this.loadIntern(employeeId);
    const internStart = e.joinDate;
    const internEnd = e.internshipEndDate ?? e.engagementEndDate;
    const rangeEnd = internEnd ?? new Date();

    const [attendance, leaves, reviews, tasks, projects, salary] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { employeeId, date: { gte: utcDay(internStart), lte: rangeEnd } },
        _count: { _all: true },
      }),
      this.prisma.leave.findMany({
        where: { employeeId, status: 'APPROVED', startDate: { lte: rangeEnd }, endDate: { gte: internStart } },
        select: { startDate: true, endDate: true },
      }),
      this.prisma.performanceReview.findMany({
        where: { employeeId },
        select: { quarter: true, rating: true, review: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.groupBy({ by: ['status'], where: { assignedEmployeeId: employeeId }, _count: { _all: true } }),
      this.prisma.project.count({
        where: { OR: [{ projectManagerId: employeeId }, { assignments: { some: { employeeId } } }] },
      }),
      this.prisma.salaryStructure.findFirst({ where: { employeeId, effectiveTo: null }, orderBy: { effectiveFrom: 'desc' } }),
    ]);

    const att = Object.fromEntries(attendance.map((a) => [a.status, a._count._all])) as Record<string, number>;
    const marked = (att.PRESENT ?? 0) + (att.LATE ?? 0) + (att.HALF_DAY ?? 0) + (att.ABSENT ?? 0);
    const attended = (att.PRESENT ?? 0) + (att.LATE ?? 0) + 0.5 * (att.HALF_DAY ?? 0);
    const leaveDays = leaves.reduce((sum, l) => sum + Math.round((l.endDate.getTime() - l.startDate.getTime()) / DAY) + 1, 0);
    const taskCounts = Object.fromEntries(tasks.map((t) => [t.status, t._count._all])) as Record<string, number>;
    const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);

    const today = todayUtc();
    const dayAfterEnd = internEnd ? utcDay(new Date(internEnd.getTime() + DAY)) : today;
    const suggestedStart = dayAfterEnd > today ? dayAfterEnd : today;

    return {
      eligible: this.blockers(e).length === 0,
      blockers: this.blockers(e),
      employee: {
        id: e.id,
        empCode: e.empCode,
        firstName: e.firstName,
        lastName: e.lastName,
        personalEmail: e.personalEmail,
        contact: e.contact,
        empType: e.empType,
        status: e.status,
        workMode: e.workMode,
        designation: e.designation?.title ?? null,
        department: e.department?.name ?? null,
        reportingManager: e.reportingManager,
        hasLogin: !!e.user,
        hasStipend: e.hasStipend,
        stipendAmount: e.stipendAmount,
        currentSalary: salary && { basic: salary.basic, hra: salary.hra, specialAllowance: salary.specialAllowance },
      },
      internship: {
        startDate: internStart,
        endDate: internEnd,
        durationDays: internEnd ? Math.round((internEnd.getTime() - internStart.getTime()) / DAY) + 1 : null,
        certificateIssuedAt: e.internshipCertSentAt,
        attendance: {
          markedDays: marked,
          present: att.PRESENT ?? 0,
          late: att.LATE ?? 0,
          halfDay: att.HALF_DAY ?? 0,
          absent: att.ABSENT ?? 0,
          ratePercent: marked ? Math.round((attended / marked) * 100) : null,
        },
        approvedLeaveDays: leaveDays,
        reviews: {
          count: reviews.length,
          averageRating: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null,
          latest: reviews[0] ?? null,
        },
        work: { projects, tasksAssigned: totalTasks, tasksDone: taskCounts.DONE ?? 0 },
      },
      proposed: {
        empType: 'FULL_TIME' as EmpType,
        designation: suggestTitle(e.designation?.title ?? 'Employee'),
        department: e.department?.name ?? '',
        workMode: e.workMode,
        reportingManagerId: e.reportingManager?.id ?? null,
        effectiveDate: suggestedStart.toISOString().slice(0, 10),
        startStatus: 'ACTIVE' as EmpStatus,
        isPaid: e.hasStipend && !!e.stipendAmount,
        basic: salary?.basic ?? e.stipendAmount ?? null,
        hra: salary?.hra ?? 0,
        specialAllowance: salary?.specialAllowance ?? 0,
      },
    };
  }

  private parseDate(raw: string | null | undefined, label: string): Date {
    const d = raw ? new Date(String(raw).slice(0, 10)) : new Date(NaN);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} is not a valid date.`);
    return utcDay(d);
  }

  private money(raw: unknown, label: string): number {
    const n = raw === undefined || raw === null || raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${label} must be a number of zero or more.`);
    return Math.round(n * 100) / 100;
  }

  async convert(employeeId: string, input: ConversionInput, actor?: RequestUser) {
    const before = await this.loadIntern(employeeId);
    const blockers = this.blockers(before);
    if (blockers.length) throw new BadRequestException(blockers[0]);

    // ---- validate everything before touching the record ----
    if (!TARGET_TYPES.has(input.empType)) throw new BadRequestException('Choose Full Time or Part Time for the new role.');
    if (!WORK_MODES.has(input.workMode)) throw new BadRequestException('Choose a work mode: Onsite, Remote or Hybrid.');
    const startStatus = input.startStatus ?? 'ACTIVE';
    if (!START_STATUSES.has(startStatus)) throw new BadRequestException('Start status must be Active or Probation.');

    const designationName = input.designation?.trim();
    const departmentName = input.department?.trim();
    if (!designationName) throw new BadRequestException('A designation for the new role is required.');
    if (!departmentName) throw new BadRequestException('A department is required.');

    const firstName = input.firstName?.trim();
    if (!firstName) throw new BadRequestException('First name cannot be empty.');
    const lastName = (input.lastName ?? '').trim();
    if (!input.personalEmail) throw new BadRequestException('An email address is required — the offer letter is sent there.');
    const personalEmail = normaliseEmail(input.personalEmail);
    const contact = input.contact?.trim() || null;

    const internEnd = before.internshipEndDate ?? before.engagementEndDate;
    const effectiveDate = this.parseDate(input.effectiveDate, 'Start date of the new role');
    if (internEnd && effectiveDate < utcDay(internEnd)) {
      throw new BadRequestException(`The new role can't start before the internship ends (${formatDateDMY(internEnd)}).`);
    }

    let engagementEndDate: Date | null = null;
    if (input.empType === 'PART_TIME' && input.engagementEndDate) {
      engagementEndDate = this.parseDate(input.engagementEndDate, 'Contract end date');
      if (engagementEndDate <= effectiveDate) throw new BadRequestException('The contract end date must be after the start date.');
    }

    let reportingManagerId: string | null = null;
    if (input.reportingManagerId) {
      if (input.reportingManagerId === employeeId) throw new BadRequestException('Someone cannot report to themselves.');
      const manager = await this.prisma.employee.findUnique({ where: { id: input.reportingManagerId }, select: { status: true } });
      if (!manager) throw new BadRequestException('The chosen reporting manager no longer exists.');
      if (manager.status === 'INACTIVE') throw new BadRequestException('The chosen reporting manager has left the company.');
      reportingManagerId = input.reportingManagerId;
    }

    const isPaid = !!input.isPaid;
    const basic = isPaid ? this.money(input.basic, 'Basic pay') : 0;
    const hra = isPaid ? this.money(input.hra, 'HRA') : 0;
    const specialAllowance = isPaid ? this.money(input.specialAllowance, 'Special allowance') : 0;
    if (isPaid && basic <= 0) throw new BadRequestException('Basic pay must be greater than zero for a paid role.');
    const monthlyGross = basic + hra + specialAllowance;

    const roleLabel = EMP_TYPE_LABEL[input.empType];
    const note = input.note?.trim() || null;

    const beforeSnapshot = (await this.history.snapshot(employeeId))!;

    // ---- one transaction: role, pay record, history ----
    const event = await this.prisma.$transaction(async (tx) => {
      const [department, designation] = await Promise.all([
        tx.department.upsert({ where: { name: departmentName }, update: {}, create: { name: departmentName } }),
        tx.designation.upsert({ where: { title: designationName }, update: {}, create: { title: designationName } }),
      ]);

      // Conditional write: two HR users confirming at once must not both convert.
      const claimed = await tx.employee.updateMany({
        where: { id: employeeId, empType: 'INTERN', convertedFromInternAt: null, internshipCertStatus: 'APPROVED' },
        data: {
          empType: input.empType,
          status: startStatus,
          workMode: input.workMode,
          departmentId: department.id,
          designationId: designation.id,
          reportingManagerId,
          hasStipend: isPaid,
          stipendAmount: isPaid ? monthlyGross : null,
          engagementEndDate,
          internshipEndDate: internEnd,
          convertedFromInternAt: effectiveDate,
          firstName,
          lastName,
          personalEmail,
          contact,
        },
      });
      if (claimed.count === 0) throw new ConflictException('This intern was just converted by someone else — refresh to see the result.');

      // The stipend (if any) stops the day the new role starts; the new pay
      // record, if paid, starts that same day — so no period is ever counted twice.
      await tx.salaryStructure.updateMany({ where: { employeeId, effectiveTo: null }, data: { effectiveTo: effectiveDate } });
      if (isPaid) {
        await tx.salaryStructure.create({
          data: {
            employeeId,
            basic,
            hra,
            specialAllowance,
            effectiveFrom: effectiveDate,
            note: `Converted from Intern to ${roleLabel}`,
            createdById: actor?.id ?? null,
          },
        });
      }

      const afterSnapshot = (await this.history.snapshot(employeeId, tx))!;
      const changes: HistoryChange[] = this.history.diff(beforeSnapshot, afterSnapshot).filter((c) => c.field !== 'engagementEndDate');
      if (internEnd) changes.push({ field: 'internshipPeriod', label: 'Internship', from: `${formatDateDMY(before.joinDate)} – ${formatDateDMY(internEnd)}`, to: 'Completed' });
      if (isPaid) changes.push({ field: 'salarySplit', label: 'Pay split', from: null, to: `Basic ₹${basic.toLocaleString('en-IN')} · HRA ₹${hra.toLocaleString('en-IN')} · Special ₹${specialAllowance.toLocaleString('en-IN')}`, sensitive: true });
      if (engagementEndDate) changes.push({ field: 'engagementEndDate', label: 'Contract ends', from: null, to: formatDateDMY(engagementEndDate) });
      const nameBefore = `${before.firstName} ${before.lastName}`.trim();
      const nameAfter = `${firstName} ${lastName}`.trim();
      if (nameBefore !== nameAfter) changes.push({ field: 'name', label: 'Name', from: nameBefore, to: nameAfter });
      if ((before.personalEmail ?? null) !== personalEmail) changes.push({ field: 'personalEmail', label: 'Email', from: before.personalEmail, to: personalEmail });
      if ((before.contact ?? null) !== contact) changes.push({ field: 'contact', label: 'Phone', from: before.contact, to: contact });

      return this.history.record(
        {
          employeeId,
          type: 'ROLE_CONVERTED',
          title: `Converted from Intern to ${roleLabel} — ${designationName}`,
          effectiveDate,
          changes,
          actor,
          note,
        },
        tx,
      );
    });

    // ---- after commit: letter, notification, audit — never undo the conversion ----
    await this.teams.syncPayType(employeeId); // fixed pay just changed
    const offerLetter = await this.offerLetters
      .issueAndSend(employeeId, { sendEmail: input.sendOfferLetter !== false, actor })
      .catch((err) => {
        this.logger.error(`Offer letter after conversion failed for ${employeeId}: ${err.message}`);
        return { documentId: null, fileUrl: null, emailed: false, error: err.message as string };
      });

    if (offerLetter.documentId) {
      await this.prisma.employeeEvent.update({ where: { id: event.id }, data: { documentId: offerLetter.documentId } });
      // A letter that went through the outbox records its own history entry when
      // it is actually sent; only the "generated, never queued" case needs one here.
      if (input.sendOfferLetter === false) {
        await this.history.record({
          employeeId,
          type: 'OFFER_LETTER_ISSUED',
          title: `${roleLabel} offer letter generated (not emailed)`,
          documentId: offerLetter.documentId,
          actor,
        });
      }
    }

    if (before.user?.id) {
      await this.prisma.notification.create({
        data: {
          userId: before.user.id,
          title: 'Congratulations on your new role',
          message: `You have been offered the ${roleLabel} position of ${designationName}, starting ${formatDateDMY(effectiveDate)}.${offerLetter.emailed ? ` Your offer letter has been emailed to ${personalEmail}.` : ''}`,
          type: 'SUCCESS',
          link: '/',
        },
      });
    }

    await this.audit.log({
      userId: actor?.id,
      role: actor?.role,
      action: 'CONVERT_INTERN',
      actionType: 'UPDATE',
      module: 'HR',
      entityType: 'Employee',
      entityId: employeeId,
      targetLabel: `${firstName} ${lastName}`.trim(),
      description: `Converted ${firstName} ${lastName} from Intern to ${roleLabel} (${designationName}, ${departmentName}) effective ${formatDateDMY(effectiveDate)}`,
      details: { employeeId, empType: input.empType, designation: designationName, department: departmentName, effectiveDate, isPaid, offerLetterDocumentId: offerLetter.documentId },
    });

    this.logger.log(`Converted ${before.empCode} from INTERN to ${input.empType} effective ${effectiveDate.toISOString().slice(0, 10)}`);

    return {
      employeeId,
      empType: input.empType,
      designation: designationName,
      department: departmentName,
      effectiveDate,
      status: startStatus,
      monthlyGross: isPaid ? monthlyGross : null,
      statusLabel: STATUS_LABEL[startStatus],
      workModeLabel: WORK_MODE_LABEL[input.workMode],
      offerLetter,
    };
  }
}
