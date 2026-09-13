import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';
import { coverNoteHtml, escapeHtml } from '../common/email-template';
import { formatDateDMY } from '../common/date-format';

const COMPANY = {
  name: 'Shuroq',
  legalName: 'Shuroq Technologies',
  address: 'Hyderabad, Telangana, India',
  email: 'hr-team@shuroq.com',
  website: 'www.shuroq.com',
};

// Brand colors matching the letterhead exactly
const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  white: '#ffffff',
  black: '#000000',
  grey: '#434343',        // address/contact line text (not #333 — extracted from original PDF)
  linkBlue: '#1155cc',    // website URL (Google Docs hyperlink blue, extracted from original)
};

// Brand asset paths — process.cwd(), not __dirname. See email-template.ts's
// ASSETS_DIR comment: nest build's dist/ doesn't carry the assets/
// folder, so an __dirname-relative path silently 404s once running from
// dist (the configuration `npm run start:dev` actually spawns), and
// these letters' logo/seal/signature/MSME images were falling back to
// plain text as a result — same root cause found while wiring the email
// logo attachment, fixed here too.
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'brand');
const ASSET_PATHS = {
  logo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
};

interface LetterData {
  candidateName: string;
  roleTitle: string;
  department: string;
  startDate: Date;
  engagementEndDate: Date | null;
  grossMonthly: number | null;
  hasStipend: boolean;
  stipendAmount: number | null;
  mode: string;
}

/**
 * Generates and emails the offer letter for a newly onboarded employee.
 * Clean, standard layout with centered Shuroq logo, address + email line,
 * numbered clauses with bold headings, and candidate acceptance block.
 * Matches company offer letter standards for Intern, Part-Time, and Full-Time.
 */
@Injectable()
export class OfferLetterService {
  private readonly logger = new Logger(OfferLetterService.name);
  private readonly outDir = path.join(process.cwd(), 'private-uploads', 'offer-letters');

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

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

    const hasStipend = employee.hasStipend ?? (salary ? (salary.basic + salary.hra + salary.specialAllowance > 0) : false);
    const stipendAmount = employee.stipendAmount ?? (salary ? salary.basic + salary.hra + salary.specialAllowance : null);

    const data: LetterData = {
      candidateName: [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim(),
      roleTitle: employee.designation?.title ?? 'Employee',
      department: employee.department?.name ?? '',
      startDate: employee.joinDate,
      engagementEndDate: employee.engagementEndDate,
      grossMonthly: stipendAmount,
      hasStipend,
      stipendAmount,
      mode: (employee as any).workMode ?? 'Remote',
    };

    let pdfBuffer: Buffer;
    const kind: 'OFFER_LETTER' = 'OFFER_LETTER';
    try {
      if (employee.empType === 'INTERN') {
        pdfBuffer = await this.renderInternshipOfferLetter(data);
      } else if (employee.empType === 'PART_TIME') {
        pdfBuffer = await this.renderPartTimeOfferLetter(data);
      } else {
        pdfBuffer = await this.renderFullTimeOfferLetter(data);
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

    const document = await this.prisma.document.create({
      data: {
        kind,
        ownerUserId: employee.userId,
        storagePath: `offer-letters/${fileName}`,
        fileName,
        sha256,
      },
    });
    const fileUrl = `/api/hrm/documents/${document.id}/download`;
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { offerLetterDocumentId: document.id },
    });

    const contact = await this.getSupportContactLine();
    const letterWord = 'offer letter';
    const bodyHtml = this.buildOfferLetterEmailHtml(employee.empType, data, employee.firstName, contact);

    const result = await this.mailer.send({
      to: employee.personalEmail,
      subject: `Your ${letterWord} from Shuroq — ${data.roleTitle}`,
      html: bodyHtml,
      attachments: [
        { filename: `${data.candidateName} - ${letterWord}.pdf`, path: fullPath },
      ],
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
   * Covering note only — the offer letter itself is the attached PDF.
   */
  private buildOfferLetterEmailHtml(empType: string, d: LetterData, firstName: string, contact: string): string {
    const kind =
      empType === 'INTERN' ? 'internship offer letter'
      : empType === 'PART_TIME' ? 'part-time offer letter'
      : 'offer letter';
    return coverNoteHtml([
      `Hi ${escapeHtml(firstName)},`,
      `We are pleased to offer you the position of <strong>${escapeHtml(d.roleTitle)}</strong> at ${escapeHtml(COMPANY.name)}. Your ${kind} is attached to this email as a PDF.`,
      'Please review it, and return a signed copy to confirm your acceptance.',
      escapeHtml(contact),
      'Warm regards,<br />HR Team, Shuroq',
    ]);
  }

  private async getSupportContactLine(): Promise<string> {
    const phone = await this.prisma.companyPolicy.findUnique({ where: { key: 'support_contact_phone' } });
    if (phone?.value) {
      return `If you have any questions, you can reach us at ${phone.value} or ${COMPANY.email}.`;
    }
    return `If you have any questions, you can reach us at ${COMPANY.email}.`;
  }

  // =====================================================================
  // TEMPLATE 1: PART-TIME OFFER LETTER (clean — Aarif PDF style)
  // =====================================================================

  private async renderPartTimeOfferLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const M = 72;
      const textW = W - 2 * M;

      this.placeLogoCentered(doc, W, M);

      doc.fontSize(9).font('Helvetica').fillColor(BRAND.grey)
        .text(COMPANY.address, M, doc.y, { width: textW });
      doc.fillColor(BRAND.grey)
        .text(`Email: ${COMPANY.email} | Website: `, M, doc.y, { width: textW, continued: true });
      doc.fillColor(BRAND.linkBlue).text(COMPANY.website, { link: `https://${COMPANY.website}` });
      doc.moveDown(1.5);

      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle.toUpperCase()} (PART TIME) \u2013 OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
      doc.moveDown(1.2);

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('Date: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(fmtDateFull(new Date()));
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(d.candidateName);
      doc.moveDown(0.5);

      doc.fontSize(10.5).font('Helvetica').fillColor(BRAND.black).text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'left', lineGap: 1.5 },
      );
      doc.font('Helvetica-Bold').text(`${d.roleTitle} (Part Time) `, { continued: true });
      doc.font('Helvetica').text(
        `at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'left', lineGap: 1.5 },
      );
      doc.moveDown(1);

      const stipendLine = d.hasStipend && d.stipendAmount
        ? `Stipend: Rs. ${d.stipendAmount.toLocaleString('en-IN')} per month`
        : 'Stipend: Unpaid';

      const detailsBody =
        `Start Date: ${fmtDateFull(d.startDate)}\n` +
        `Mode: ${d.mode || 'Hybrid'}\n` +
        `${stipendLine}`;

      const statutoryClause = d.hasStipend && d.stipendAmount
        ? {
            heading: '4. Statutory Benefits & Deductions',
            body: 'This part-time engagement is on a consolidated stipend/fee basis. Regular statutory benefits including Provident Fund (PF), Employees\u2019 State Insurance (ESI), bonus, gratuity, and paid leave accruals are not applicable. Applicable statutory deductions, including Tax Deducted at Source (TDS) and Professional Tax, will be deducted from the monthly stipend in accordance with prevailing statutory laws.',
          }
        : {
            heading: '4. Statutory Benefits & Deductions',
            body: 'This part-time engagement is strictly voluntary and unpaid. Statutory employee benefits including Provident Fund (PF), Employees\u2019 State Insurance (ESI), leave encashment, bonus, gratuity, and insurance are not applicable. Since no remuneration or stipend is payable, no statutory payroll deductions or tax withholdings shall apply.',
          };

      const page1Clauses = [
        { heading: '1. Employment Details', body: detailsBody },
        { heading: '2. Nature of Engagement', body: 'This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.' },
        { heading: '3. Role Scope', body: 'You will perform assigned system engineering tasks and provide technical support under guidance from the team.' },
        statutoryClause,
        { heading: '5. Notice Period / Termination', body: 'Either party may terminate this engagement by providing 1 month prior written notice.' },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, ['part-time role'], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, ['1 month prior written notice'], fillGap);

      doc.addPage();

      this.clauseClean(doc, M, textW, '6. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information.`, [], 0);
      doc.moveDown(0.6);
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('This offer letter and employment terms are strictly confidential.', M, doc.y, { width: textW, align: 'left', lineGap: 1.5 });
      doc.y += fillGap;

      this.clauseClean(doc, M, textW, '7. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of ${COMPANY.name}.`, [], fillGap);

      this.clauseClean(doc, M, textW, '8. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

      this.acceptanceBlock(doc, M, textW, d.candidateName);
    }, { size: 'LETTER', margin: 72 });
  }

  // =====================================================================
  // TEMPLATE 2: FULL-TIME OFFER LETTER (clean style)
  // =====================================================================

  private async renderFullTimeOfferLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const M = 72;
      const textW = W - 2 * M;

      this.placeLogoCentered(doc, W, M);

      doc.fontSize(9).font('Helvetica').fillColor(BRAND.grey)
        .text(COMPANY.address, M, doc.y, { width: textW });
      doc.fillColor(BRAND.grey)
        .text(`Email: ${COMPANY.email} | Website: `, M, doc.y, { width: textW, continued: true });
      doc.fillColor(BRAND.linkBlue).text(COMPANY.website, { link: `https://${COMPANY.website}` });
      doc.moveDown(1.5);

      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle.toUpperCase()} (FULL TIME) \u2013 OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
      doc.moveDown(1.2);

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('Date: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(fmtDateFull(new Date()));
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(d.candidateName);
      doc.moveDown(0.5);

      doc.fontSize(10.5).font('Helvetica').fillColor(BRAND.black).text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'left', lineGap: 1.5 },
      );
      doc.font('Helvetica-Bold').text(`${d.roleTitle} `, { continued: true });
      doc.font('Helvetica').text(
        `at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'left', lineGap: 1.5 },
      );
      doc.moveDown(1);

      const stipendLine = d.hasStipend && d.stipendAmount
        ? `Stipend: Rs. ${d.stipendAmount.toLocaleString('en-IN')} per month`
        : 'Stipend: Unpaid';

      const detailsBody =
        `Start Date: ${fmtDateFull(d.startDate)}\n` +
        `Mode: ${d.mode || 'On-site'}\n` +
        `${stipendLine}`;

      const natureClauseBody = 'This is a full-time, permanent role. You are expected to devote your full working time and attention to the company during working hours.';
      const roleClauseBody = `You will join the ${d.department} department as ${d.roleTitle}, reporting to your assigned manager.`;

      const statutoryClause = d.hasStipend && d.stipendAmount
        ? {
            heading: '4. Statutory Benefits & Deductions',
            body: 'As a full-time employee, you are entitled to statutory benefits including Provident Fund (PF) and, where eligible, Employees\u2019 State Insurance (ESI) and gratuity in accordance with applicable Indian labor laws. Statutory deductions including Income Tax (TDS), Provident Fund employee contribution, and Professional Tax will be deducted at source from your gross monthly salary as mandated by law.',
          }
        : {
            heading: '4. Statutory Benefits & Deductions',
            body: 'As this engagement is structured on an unpaid/voluntary basis, statutory employee benefits such as Provident Fund (PF), Employees\u2019 State Insurance (ESI), gratuity, and payroll-based monetary allowances are not applicable. Consequently, no salary deductions (TDS, PF contributions, or Professional Tax) will be processed.',
          };

      const leaveClauseBody = 'You will accrue one sick leave and one casual leave for each completed month of service. Unused leave carries forward within the same calendar year and lapses on 31 December.';

      const page1Clauses = [
        { heading: '1. Employment Details', body: detailsBody },
        { heading: '2. Nature of Engagement', body: natureClauseBody },
        { heading: '3. Role & Reporting', body: roleClauseBody },
        statutoryClause,
        { heading: '5. Leave Entitlement', body: leaveClauseBody },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);

      doc.addPage();

      this.clauseClean(doc, M, textW, '6. Notice Period / Termination',
        'Either party may terminate this engagement by providing one month\u2019s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.', [], fillGap);

      this.clauseClean(doc, M, textW, '7. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`, [], fillGap);

      this.clauseClean(doc, M, textW, '8. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`, [], fillGap);

      this.clauseClean(doc, M, textW, '9. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

      this.acceptanceBlock(doc, M, textW, d.candidateName);
    }, { size: 'LETTER', margin: 72 });
  }

  // =====================================================================
  // TEMPLATE 3: INTERNSHIP OFFER LETTER (clean style)
  // =====================================================================

  private async renderInternshipOfferLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const M = 72;
      const textW = W - 2 * M;

      this.placeLogoCentered(doc, W, M);

      doc.fontSize(9).font('Helvetica').fillColor(BRAND.grey)
        .text(COMPANY.address, M, doc.y, { width: textW });
      doc.fillColor(BRAND.grey)
        .text(`Email: ${COMPANY.email} | Website: `, M, doc.y, { width: textW, continued: true });
      doc.fillColor(BRAND.linkBlue).text(COMPANY.website, { link: `https://${COMPANY.website}` });
      doc.moveDown(1.5);

      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle} Intern OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
      doc.moveDown(1.2);

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('Date: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(fmtDateFull(new Date()));
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(d.candidateName);
      doc.moveDown(0.5);

      doc.fontSize(10.5).font('Helvetica').fillColor(BRAND.black).text(
        `We are pleased to offer you the position of ${d.roleTitle} Intern (Internship) at ${COMPANY.name} under the following terms and conditions:`,
        M, doc.y, { width: textW, align: 'left', lineGap: 1.5 },
      );
      doc.moveDown(1);

      const stipendLine = d.hasStipend && d.stipendAmount
        ? `Stipend: Rs. ${d.stipendAmount.toLocaleString('en-IN')} per month`
        : 'Stipend: Unpaid';

      const detailsBody =
        `Start Date: ${fmtDateFull(d.startDate)}\n` +
        `Mode: ${d.mode || 'Remote'}\n` +
        `${stipendLine}`;

      const statutoryClause = d.hasStipend && d.stipendAmount
        ? {
            heading: '4. Statutory Benefits & Deductions',
            body: 'Provident Fund (PF), Employees\u2019 State Insurance (ESI), leave encashment, bonus, gratuity, and regular employee benefits are not applicable for this internship training program. The stipend provided is a consolidated monthly training allowance. Where applicable under Indian Income Tax regulations, statutory deductions including Tax Deducted at Source (TDS) will be deducted at source.',
          }
        : {
            heading: '4. Statutory Benefits & Deductions',
            body: 'This internship is an unpaid academic and training engagement. Statutory employee benefits including Provident Fund (PF), Employees\u2019 State Insurance (ESI), bonus, gratuity, leave encashment, and insurance coverage are not applicable. As no monetary stipend or remuneration is disbursed, no statutory tax deductions (such as TDS or Professional Tax) are applicable.',
          };

      const page1Clauses = [
        { heading: '1. Employment Details', body: detailsBody },
        { heading: '2. Nature of Engagement', body: 'This engagement is purely for training and skill development purposes and does not constitute regular employment or create an employer–employee relationship.' },
        { heading: '3. Training Scope', body: 'You will undergo structured training and may perform supervised technical tasks strictly incidental to training and learning objectives.' },
        statutoryClause,
        { heading: '5. Termination / Early Exit', body: 'While this internship is intended to run for the full duration specified, it may be discontinued by either party at any time via written notice. In the event of an early exit, the Intern agrees to ensure a professional handover of all ongoing tasks and return any company property.' },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);

      doc.addPage();

      this.clauseClean(doc, M, textW, '6. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation shall survive the completion or termination of the internship.`, [], fillGap);

      this.clauseClean(doc, M, textW, '7. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during the internship shall be the sole intellectual property of ${COMPANY.name}. You irrevocably assign all rights, title, and interest in such work to ${COMPANY.name}.`, [], fillGap);

      this.clauseClean(doc, M, textW, '8. Completion & Absorption',
        'Upon successful completion, a Training / Internship Completion Certificate will be issued. Completion does not guarantee employment.', [], fillGap);

      this.clauseClean(doc, M, textW, '9. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

      this.acceptanceBlock(doc, M, textW, d.candidateName);
    }, { size: 'LETTER', margin: 72 });
  }

  // =====================================================================
  // SHARED BUILDING BLOCKS
  // =====================================================================

  // Defaults (A4/50pt) preserved for the branded confirmation letter, which
  // was tuned against its own reference at those dimensions. The clean
  // offer-letter templates override to US Letter/72pt — the real reference
  // PDFs (Aarif's, Kishore's) measured out to exactly 612x792pt with 72pt
  // margins (a plain Google Docs default), not A4/50pt.
  private renderPdf(build: (doc: PDFKit.PDFDocument) => void, options?: { size?: string; margin?: number }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: options?.margin ?? 50, size: options?.size ?? 'A4' });
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

  /** Centered Shuroq logo at the top of the page (clean offer letter style) */
  private placeLogoCentered(doc: PDFKit.PDFDocument, pageW: number, M: number) {
    if (fs.existsSync(ASSET_PATHS.logo)) {
      const logoW = 140;
      const x = (pageW - logoW) / 2;
      doc.image(ASSET_PATHS.logo, x, 30, { width: logoW });
      doc.y = 100;
    } else {
      doc.fontSize(22).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
        .text(COMPANY.name, M, 30, { align: 'center', width: pageW - 2 * M });
      doc.fontSize(7).font('Helvetica').fillColor(BRAND.accentBlue)
        .text('TECH REDEFINED', M, doc.y, { align: 'center', width: pageW - 2 * M, characterSpacing: 2 });
      doc.moveDown(1);
    }
  }

  /** Split a string into bold and normal segments so we can render cleanly without dangling continued states */
  private parseSegments(body: string, boldPhrases: string[]): { text: string; bold: boolean }[] {
    if (!boldPhrases || boldPhrases.length === 0) {
      return [{ text: body, bold: false }];
    }
    type Range = { start: number; end: number };
    const ranges: Range[] = [];
    for (const phrase of boldPhrases) {
      if (!phrase) continue;
      let pos = 0;
      while ((pos = body.indexOf(phrase, pos)) !== -1) {
        ranges.push({ start: pos, end: pos + phrase.length });
        pos += phrase.length;
      }
    }
    if (ranges.length === 0) {
      return [{ text: body, bold: false }];
    }
    ranges.sort((a, b) => a.start - b.start);
    const nonOverlapping: Range[] = [];
    let lastEnd = 0;
    for (const r of ranges) {
      if (r.start >= lastEnd) {
        nonOverlapping.push(r);
        lastEnd = r.end;
      }
    }
    const segments: { text: string; bold: boolean }[] = [];
    let curr = 0;
    for (const r of nonOverlapping) {
      if (r.start > curr) {
        segments.push({ text: body.substring(curr, r.start), bold: false });
      }
      segments.push({ text: body.substring(r.start, r.end), bold: true });
      curr = r.end;
    }
    if (curr < body.length) {
      segments.push({ text: body.substring(curr), bold: false });
    }
    return segments;
  }

  /**
   * A numbered clause for the clean offer letter style.
   * Heading is bold and left-aligned.
   * Body is rendered with proper segmented tokens to eliminate dangling continued states.
   */
  private clauseClean(
    doc: PDFKit.PDFDocument, M: number, textW: number,
    heading: string, body: string, boldPhrases: string[] = [], gapAfterPt?: number,
  ) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(heading, M, doc.y, { width: textW, align: 'left' });
    doc.moveDown(0.3);

    const segments = this.parseSegments(body, boldPhrases);
    doc.fontSize(10.5).fillColor(BRAND.black);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      doc.font(seg.bold ? 'Helvetica-Bold' : 'Helvetica');
      if (i === 0) {
        doc.text(seg.text, M, doc.y, {
          continued: !isLast,
          width: textW,
          align: 'left',
          lineGap: 1.5,
        });
      } else {
        doc.text(seg.text, {
          continued: !isLast,
          width: textW,
          align: 'left',
          lineGap: 1.5,
        });
      }
    }

    if (gapAfterPt !== undefined) {
      doc.y += gapAfterPt;
    } else {
      doc.moveDown(0.9);
    }
  }

  /**
   * Measures how tall a clause block (heading + body) would render at the given width.
   */
  private measureClauseHeight(doc: PDFKit.PDFDocument, textW: number, heading: string, body: string): number {
    doc.font('Helvetica-Bold').fontSize(12);
    const headingH = doc.heightOfString(heading, { width: textW, align: 'left' });
    doc.font('Helvetica').fontSize(10.5);
    const bodyH = doc.heightOfString(body, { width: textW, align: 'left', lineGap: 1.5 });
    return headingH + 4 + bodyH;
  }

  /**
   * The real reference PDFs (Aarif's, Kishore's) have their first six
   * clauses fill the entire page, not stop partway with a block of blank
   * space above the forced page break added elsewhere. Rather than guess a
   * spacing constant that only happens to work for one candidate's name/
   * role length, this measures the natural height of the given clauses at
   * the current position, and returns how much extra trailing space each
   * one needs so all of them together reach the bottom margin exactly.
   * Floors at 12pt so short content never looks glued together.
   */
  private computeFillGap(doc: PDFKit.PDFDocument, textW: number, clauses: { heading: string; body: string }[]): number {
    const startY = doc.y;
    let natural = 0;
    for (const c of clauses) natural += this.measureClauseHeight(doc, textW, c.heading, c.body);
    doc.y = startY; // measurement pass only moves font state, not position — restore for safety
    const available = doc.page.height - doc.page.margins.bottom - startY;
    const extra = (available - natural) / clauses.length;
    return Math.max(12, extra);
  }

  /** Acceptance block at the bottom of clean offer letters */
  private acceptanceBlock(doc: PDFKit.PDFDocument, M: number, textW: number, candidateName: string) {
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('Acceptance', M, doc.y, { width: textW });
    doc.moveDown(0.3);
    doc.fontSize(10.5).font('Helvetica')
      .text(
        'I confirm that I have read, understood, and agree to all terms including the Confidentiality and Intellectual Property obligations stated above.',
        M, doc.y, { width: textW, align: 'justify' },
      );
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').text('Name: ', M, doc.y, { continued: true });
    doc.font('Helvetica').text(candidateName);
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').text('Signature: ________________', M);
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').text('Date: ____________________', M);
  }
}

/** DD/MM/YYYY format for confirmation letters (e.g., "25/05/2026") */
function fmtDateShort(d: Date | null): string {
  return formatDateDMY(d);
}

/** DD/MM/YYYY format for clean offer letters (e.g., "25/05/2026") */
function fmtDateFull(d: Date | null): string {
  return formatDateDMY(d);
}

/** Whole calendar months between two dates \u2014 matches the "Duration: 3 months" line on the real internship offer letter reference. */
function monthsBetween(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}
