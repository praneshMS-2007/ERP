import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';

const COMPANY = {
  name: 'Shuroq',
  legalName: 'Shuroq Technologies',
  address: 'Hyderabad, Telangana, India',
  email: 'hr-team@shuroq.com',
  website: 'www.shuroq.com',
};

interface LetterData {
  candidateName: string;
  roleTitle: string;
  department: string;
  startDate: Date;
  engagementEndDate: Date | null;
  grossMonthly: number | null;
}

/**
 * Generates and emails the offer/confirmation letter for a newly onboarded
 * employee, choosing a template by employment type. Content follows the
 * clause structure of Shuroq's own uploaded documents (the Aarif part-time
 * offer and the Kishore internship offer) rather than a generic template —
 * this is not a pixel-perfect reproduction of the branded letterhead (no
 * logo/seal image assets are available to this service), but the wording
 * and section structure match what HR has actually issued before.
 *
 * Per team decision: the email carries the letter and a support contact —
 * never login credentials. Those are shown once in the UI and handed over
 * manually. See CredentialsPanel.tsx.
 */
@Injectable()
export class OfferLetterService {
  private readonly logger = new Logger(OfferLetterService.name);
  private readonly outDir = path.join(process.cwd(), 'uploads', 'offer-letters');

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  /**
   * Builds the PDF, saves it as a Document, links it to the employee, and
   * emails it. Never throws — a failure here should not undo an employee
   * that HR already successfully created. The caller gets back enough
   * detail to tell HR what happened and let them retry or download manually.
   */
  async issueAndSend(employeeId: string): Promise<{
    documentId: string | null;
    fileUrl: string | null;
    emailed: boolean;
    error?: string;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true, user: true },
    });
    if (!employee) return { documentId: null, fileUrl: null, emailed: false, error: 'Employee not found' };
    if (!employee.personalEmail) {
      return { documentId: null, fileUrl: null, emailed: false, error: 'No email address on file' };
    }

    const salary = await this.prisma.salaryStructure.findFirst({
      where: { employeeId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    const data: LetterData = {
      candidateName: `${employee.firstName} ${employee.lastName}`,
      roleTitle: employee.designation?.title ?? 'Employee',
      department: employee.department?.name ?? '',
      startDate: employee.joinDate,
      engagementEndDate: employee.engagementEndDate,
      grossMonthly: salary ? salary.basic + salary.hra + salary.specialAllowance : null,
    };

    let pdfBuffer: Buffer;
    let kind: 'OFFER_LETTER' | 'CONFIRMATION_LETTER' = 'OFFER_LETTER';
    try {
      if (employee.empType === 'INTERN') {
        pdfBuffer = await this.renderInternshipLetter(data);
        kind = 'CONFIRMATION_LETTER';
      } else if (employee.empType === 'PART_TIME') {
        pdfBuffer = await this.renderPartTimeLetter(data);
      } else {
        // FULL_TIME and CONTRACT both use the full-time structure — Shuroq
        // has not supplied a distinct contract template, and the clauses
        // (compensation, notice, statutory benefits) are the closest match.
        pdfBuffer = await this.renderFullTimeLetter(data);
      }
    } catch (err: any) {
      this.logger.error(`PDF generation failed for ${employeeId}: ${err.message}`);
      return { documentId: null, fileUrl: null, emailed: false, error: `Could not generate the letter: ${err.message}` };
    }

    const safeName = data.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${safeName}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const fullPath = path.join(this.outDir, fileName);
    fs.writeFileSync(fullPath, pdfBuffer);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const fileUrl = `/uploads/offer-letters/${fileName}`;

    const document = await this.prisma.document.create({
      data: {
        kind,
        ownerUserId: employee.userId,
        storagePath: fileUrl,
        fileName,
        sha256,
      },
    });
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { offerLetterDocumentId: document.id },
    });

    const contact = await this.getSupportContactLine();
    const letterWord = kind === 'CONFIRMATION_LETTER' ? 'internship confirmation letter' : 'offer letter';
    const result = await this.mailer.send({
      to: employee.personalEmail,
      subject: `Your ${letterWord} from Shuroq — ${data.roleTitle}`,
      html: `
        <p>Hi ${employee.firstName},</p>
        <p>Congratulations, and welcome to Shuroq! Please find your ${letterWord} attached.</p>
        <p>${contact}</p>
        <p>Warm regards,<br>HR Team, Shuroq</p>
      `,
      attachments: [{ filename: `${data.candidateName} - ${letterWord}.pdf`, path: fullPath }],
    });

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        offerLetterSentAt: result.sent ? new Date() : null,
        offerLetterSendError: result.sent ? null : result.error,
      },
    });

    if (!result.sent) {
      this.logger.warn(`Letter generated but not emailed for ${employeeId}: ${result.error}`);
    }

    return {
      documentId: document.id,
      fileUrl,
      emailed: result.sent,
      error: result.sent ? undefined : result.error,
    };
  }

  /**
   * HR fills this in once from a settings screen (not built yet) via
   * CompanyPolicy. Deliberately no fabricated phone number — an invented
   * contact number sent to a real new hire would be worse than none.
   */
  private async getSupportContactLine(): Promise<string> {
    const phone = await this.prisma.companyPolicy.findUnique({ where: { key: 'support_contact_phone' } });
    if (phone?.value) {
      return `If you have any questions, you can reach us at ${phone.value} or ${COMPANY.email}.`;
    }
    return `If you have any questions, you can reach us at ${COMPANY.email}.`;
  }

  // ---------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------

  private async renderFullTimeLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      this.letterhead(doc);
      this.title(doc, `${d.roleTitle.toUpperCase()} (FULL TIME) — OFFER LETTER`);
      this.dateAndCandidate(doc, d.candidateName);

      doc.text(
        `We are pleased to offer you the position of ${d.roleTitle} at ${COMPANY.name} under the following terms and conditions:`,
      );
      doc.moveDown();

      this.clause(doc, '1. Employment Start Date', `Start Date: ${fmtDate(d.startDate)}`);
      this.clause(
        doc,
        '2. Nature of Engagement',
        'This is a full-time, permanent role. You are expected to devote your full working time and attention to the company during working hours.',
      );
      this.clause(
        doc,
        '3. Role & Reporting',
        `You will join the ${d.department} department as ${d.roleTitle}, reporting to your assigned manager.`,
      );
      this.clause(
        doc,
        '4. Compensation',
        d.grossMonthly
          ? `Your gross monthly salary will be Rs. ${d.grossMonthly.toLocaleString('en-IN')}, payable monthly and subject to statutory deductions set out below. Compensation is reviewed annually at the company's discretion and is strictly confidential.`
          : 'Your compensation will be communicated separately and is strictly confidential.',
      );
      this.clause(
        doc,
        '5. Statutory Benefits & Deductions',
        'As a full-time employee you are covered by Provident Fund (PF) and, where eligible, Employees’ State Insurance (ESI) and gratuity, in accordance with applicable Indian law. Income Tax (TDS) and Professional Tax will be deducted at source as required.',
      );
      this.clause(
        doc,
        '6. Leave Entitlement',
        'You will accrue one sick leave and one casual leave for each completed month of service. Unused leave carries forward within the same calendar year and lapses on 31 December.',
      );
      this.clause(
        doc,
        '7. Notice Period / Termination',
        'Either party may terminate this engagement by providing one month’s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.',
      );
      this.clause(
        doc,
        '8. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`,
      );
      this.clause(
        doc,
        '9. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`,
      );
      this.clause(doc, '10. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');

      this.acceptanceBlock(doc, d.candidateName);
    });
  }

  private async renderPartTimeLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      this.letterhead(doc);
      this.title(doc, `${d.roleTitle.toUpperCase()} (PART TIME) — OFFER LETTER`);
      this.dateAndCandidate(doc, d.candidateName);

      doc.text(
        `We are pleased to offer you the position of ${d.roleTitle} (Part Time) at ${COMPANY.name} under the following terms and conditions:`,
      );
      doc.moveDown();

      this.clause(doc, '1. Employment Start Date', `Start Date: ${fmtDate(d.startDate)}`);
      this.clause(
        doc,
        '2. Nature of Engagement',
        'This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.',
      );
      this.clause(doc, '3. Role Scope', `You will perform assigned tasks and provide support under guidance from the ${d.department} team.`);
      this.clause(
        doc,
        '4. Compensation',
        d.grossMonthly
          ? `You will receive a monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}.`
          : 'Your compensation will be communicated separately.',
      );
      this.clause(
        doc,
        '5. Statutory Benefits',
        'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable for this part-time engagement.',
      );
      this.clause(doc, '6. Notice Period / Termination', 'Either party may terminate this engagement by providing 1 month prior written notice.');
      this.clause(
        doc,
        '7. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This offer letter and employment terms are strictly confidential.`,
      );
      this.clause(
        doc,
        '8. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of ${COMPANY.name}.`,
      );
      this.clause(doc, '9. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');

      this.acceptanceBlock(doc, d.candidateName);
    });
  }

  private async renderInternshipLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      this.letterhead(doc);
      this.title(doc, `${d.roleTitle.toUpperCase()} INTERN — OFFER LETTER`);
      this.dateAndCandidate(doc, d.candidateName);

      doc.text(
        `We are pleased to offer you the position of ${d.roleTitle} Intern (Internship) at ${COMPANY.name} under the following terms and conditions:`,
      );
      doc.moveDown();

      const duration = d.engagementEndDate
        ? `Start Date: ${fmtDate(d.startDate)}\nEnd Date: ${fmtDate(d.engagementEndDate)}`
        : `Start Date: ${fmtDate(d.startDate)}`;
      this.clause(doc, '1. Internship Duration', duration);
      this.clause(
        doc,
        '2. Nature of Engagement',
        'This engagement is purely for training and skill development purposes and does not constitute regular employment or create an employer–employee relationship.',
      );
      this.clause(doc, '3. Training Scope', 'You will undergo structured training and may perform supervised technical tasks strictly incidental to training and learning objectives.');
      this.clause(
        doc,
        '4. Training Allowance (Stipend)',
        d.grossMonthly
          ? `You will receive a training allowance of Rs. ${d.grossMonthly.toLocaleString('en-IN')} per month.`
          : 'This internship is unpaid. No stipend, salary, or wages shall be provided during the training period.',
      );
      this.clause(
        doc,
        '5. Statutory Benefits',
        'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable during the training period.',
      );
      this.clause(
        doc,
        '6. Termination / Early Exit',
        'This internship may be discontinued by either party at any time via written notice. In the event of an early exit, the Intern agrees to ensure a professional handover of all ongoing tasks and return any company property.',
      );
      this.clause(
        doc,
        '7. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation shall survive the completion or termination of the internship.`,
      );
      this.clause(
        doc,
        '8. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during the internship shall be the sole intellectual property of ${COMPANY.name}. You irrevocably assign all rights, title, and interest in such work to ${COMPANY.name}.`,
      );
      this.clause(doc, '9. Completion & Absorption', 'Upon successful completion, a Training / Internship Completion Certificate will be issued. Completion does not guarantee employment.');
      this.clause(doc, '10. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');

      this.acceptanceBlock(doc, d.candidateName);
    });
  }

  // ---------------------------------------------------------------------
  // PDF building blocks — kept small and shared so the three templates stay
  // visually consistent with each other.
  // ---------------------------------------------------------------------

  private renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        build(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private letterhead(doc: PDFKit.PDFDocument) {
    doc.fontSize(18).font('Helvetica-Bold').text(COMPANY.name, { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#666').text('TECH REDEFINED', { align: 'center', characterSpacing: 2 });
    doc.moveDown(0.6);
    doc.fontSize(9).fillColor('#333').text(COMPANY.address, { align: 'left' });
    doc.text(`Email: ${COMPANY.email} | Website: ${COMPANY.website}`);
    doc.fillColor('#000');
    doc.moveDown(1);
  }

  private title(doc: PDFKit.PDFDocument, text: string) {
    doc.fontSize(13).font('Helvetica-Bold').text(text, { align: 'center' });
    doc.moveDown(1);
  }

  private dateAndCandidate(doc: PDFKit.PDFDocument, candidateName: string) {
    doc.fontSize(10).font('Helvetica-Bold').text('Date: ', { continued: true }).font('Helvetica').text(fmtDate(new Date()));
    doc.font('Helvetica-Bold').text('Candidate Name: ', { continued: true }).font('Helvetica').text(candidateName);
    doc.moveDown(1);
  }

  private clause(doc: PDFKit.PDFDocument, heading: string, body: string) {
    doc.fontSize(10.5).font('Helvetica-Bold').text(heading);
    doc.fontSize(10).font('Helvetica').text(body, { align: 'justify' });
    doc.moveDown(0.9);
  }

  private acceptanceBlock(doc: PDFKit.PDFDocument, candidateName: string) {
    doc.moveDown(0.5);
    doc.fontSize(10.5).font('Helvetica-Bold').text('Acceptance');
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('I confirm that I have read, understood, and agree to all terms including the Confidentiality and Intellectual Property obligations stated above.');
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').text('Name: ', { continued: true }).font('Helvetica').text(candidateName);
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').text('Signature: ____________________________');
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').text('Date: ____________________________');
    doc.moveDown(0.7);
    doc.fontSize(8).fillColor('#888').font('Helvetica-Oblique').text('This is a computer-generated document.', { align: 'center' });
  }
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
