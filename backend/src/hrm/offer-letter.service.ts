import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';
import { emailShell, logoAttachment, escapeHtml, EMAIL_BRAND } from '../common/email-template';

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
  seal: path.join(ASSETS_DIR, 'company-seal.png'),
  signature: path.join(ASSETS_DIR, 'authorized-signature.png'),
  msme: path.join(ASSETS_DIR, 'msme-logo.png'),
};

interface LetterData {
  candidateName: string;
  roleTitle: string;
  department: string;
  startDate: Date;
  engagementEndDate: Date | null;
  grossMonthly: number | null;
  mode: string;
}

/**
 * Generates and emails the offer/confirmation letter for a newly onboarded
 * employee. Two distinct visual styles:
 *
 * 1. OFFER LETTER (Part-time / Full-time / Intern offer):
 *    Clean layout — centered Shuroq logo at top, address + email line,
 *    numbered clauses with bold headings, acceptance block. No decorative
 *    elements. Matches the Aarif (part-time) and Kishore (intern) PDFs.
 *
 * 2. CONFIRMATION LETTER (Intern confirmation):
 *    Branded layout — blue diagonal stripes, Shuroq logo top-left,
 *    circular company seal top-right, section-based content
 *    (Internship Details, Program Overview, Important Terms, Completion),
 *    authorized signature bottom-left, MSME logo bottom-right.
 *    Matches the P kavitha WhatsApp template.
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
      mode: (employee as any).workMode ?? 'Remote',
    };

    let pdfBuffer: Buffer;
    const kind: 'OFFER_LETTER' = 'OFFER_LETTER';
    try {
      if (employee.empType === 'INTERN') {
        // Was renderInternConfirmationLetter (the branded blue-stripe/seal
        // style) — the real reference document for an intern's OFFER
        // letter (Pala lova kishore's PDF) is the same clean numbered-
        // clause style as full-time/part-time, not that branded document.
        // The branded confirmation letter is a different, separate
        // document (matches a different reference — "WhatsApp Image...
        // P kavitha", a different person) that this app has never had a
        // real trigger point for; renderInternConfirmationLetter is left
        // in place below, just no longer called from here, in case a
        // genuine "mark internship confirmed" feature gets built later.
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
    const letterWord = 'offer letter';
    const bodyHtml = this.buildOfferLetterEmailHtml(employee.empType, data, employee.firstName, contact);

    const result = await this.mailer.send({
      to: employee.personalEmail,
      subject: `Your ${letterWord} from Shuroq — ${data.roleTitle}`,
      html: emailShell({
        previewText: `Your ${letterWord} from Shuroq — ${data.roleTitle}`,
        bodyHtml,
      }),
      attachments: [
        { filename: `${data.candidateName} - ${letterWord}.pdf`, path: fullPath },
        logoAttachment(),
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

  // =====================================================================
  // EMAIL BODY — clean offer letter style, rendered as HTML table markup
  // instead of pdfkit draw calls. Clause wording is copied verbatim from
  // the matching render*OfferLetter PDF method above (not re-derived) so
  // the email and the attached PDF never say different things. Internship
  // uses its own clause set below — see the note at the call site about
  // why it isn't wired to interns yet (they currently get the branded
  // confirmation letter, a different document).
  // =====================================================================

  private buildOfferLetterEmailHtml(empType: string, d: LetterData, firstName: string, contact: string): string {
    const font = 'font-family: Arial, Helvetica, sans-serif;';
    const heading = (text: string) =>
      `<p style="${font} font-size: 13.5px; font-weight: bold; color: ${EMAIL_BRAND.darkBlue}; margin: 18px 0 4px 0;">${escapeHtml(text)}</p>`;
    const body = (text: string) =>
      `<p style="${font} font-size: 13px; line-height: 1.55; color: ${EMAIL_BRAND.text}; margin: 0; text-align: justify;">${text}</p>`;
    const clause = (h: string, b: string) => heading(h) + body(b);

    let title: string;
    let intro: string;
    let clauses: string;

    if (empType === 'PART_TIME') {
      title = `${d.roleTitle.toUpperCase()} (PART TIME) – OFFER LETTER`;
      intro = `We are pleased to offer you the position of <strong>${escapeHtml(d.roleTitle)} (Part Time)</strong> at ${COMPANY.name} under the following terms and conditions:`;
      clauses =
        clause('1. Employment Start Date', `Start Date: ${escapeHtml(fmtDateFull(d.startDate))}`) +
        clause('2. Nature of Engagement', 'This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.') +
        clause('3. Role Scope', 'You will perform assigned system engineering tasks and provide technical support under guidance from the team.') +
        clause('4. Compensation', d.grossMonthly
          ? `You will receive a monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}.`
          : 'Your compensation will be communicated separately.') +
        clause('5. Statutory Benefits', 'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable for this part-time engagement.') +
        clause('6. Notice Period / Termination', 'Either party may terminate this engagement by providing 1 month prior written notice.') +
        clause('7. Confidentiality & Non-Disclosure (NDA)', `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information.`) +
        body(`<strong>This offer letter and employment terms are strictly confidential.</strong>`) +
        clause('8. Intellectual Property Ownership', `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of ${COMPANY.name}.`) +
        clause('9. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');
    } else if (empType === 'INTERN') {
      // Matches the real reference PDF (Pala lova kishore's): role stays
      // Title Case (not upper-cased) with no dash, and the intro doesn't
      // bold the role — both differ from full-time/part-time on purpose.
      title = `${d.roleTitle} Intern OFFER LETTER`;
      intro = `We are pleased to offer you the position of ${escapeHtml(d.roleTitle)} Intern (Internship) at ${COMPANY.name} under the following terms and conditions:`;
      const months = d.engagementEndDate ? monthsBetween(d.startDate, d.engagementEndDate) : null;
      const duration =
        `Start Date: ${escapeHtml(fmtDateFull(d.startDate))}` +
        (d.engagementEndDate ? `<br />End Date: ${escapeHtml(fmtDateFull(d.engagementEndDate))}` : '') +
        (months !== null ? `<br />Duration: ${months} month${months === 1 ? '' : 's'}` : '');
      clauses =
        clause('1. Internship Duration', duration) +
        clause('2. Nature of Engagement', 'This engagement is purely for training and skill development purposes and does not constitute regular employment or create an employer–employee relationship.') +
        clause('3. Training Scope', 'You will undergo structured training and may perform supervised technical tasks strictly incidental to training and learning objectives.') +
        clause('4. Training Allowance (Stipend)', d.grossMonthly
          ? `You will receive a training allowance of Rs. ${d.grossMonthly.toLocaleString('en-IN')} per month.`
          : 'This internship is unpaid. No stipend, salary, or wages shall be provided during the training period.') +
        clause('5. Statutory Benefits', 'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable during the training period.') +
        clause('6. Termination / Early Exit', 'While this internship is intended to run for the full duration specified, it may be discontinued by either party at any time via written notice. In the event of an early exit, the Intern agrees to ensure a professional handover of all ongoing tasks and return any company property.') +
        clause('7. Confidentiality & Non-Disclosure (NDA)', `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation shall survive the completion or termination of the internship.`) +
        clause('8. Intellectual Property Ownership', `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during the internship shall be the sole intellectual property of ${COMPANY.name}. You irrevocably assign all rights, title, and interest in such work to ${COMPANY.name}.`) +
        clause('9. Completion & Absorption', 'Upon successful completion, a Training / Internship Completion Certificate will be issued. Completion does not guarantee employment.') +
        clause('10. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');
    } else {
      title = `${d.roleTitle.toUpperCase()} (FULL TIME) – OFFER LETTER`;
      intro = `We are pleased to offer you the position of <strong>${escapeHtml(d.roleTitle)}</strong> at ${COMPANY.name} under the following terms and conditions:`;
      clauses =
        clause('1. Employment Start Date', `Start Date: ${escapeHtml(fmtDateFull(d.startDate))}<br />Mode: ${escapeHtml(d.mode)}`) +
        clause('2. Nature of Engagement', 'This is a full-time, permanent role. You are expected to devote your full working time and attention to the company during working hours.') +
        clause('3. Role & Reporting', `You will join the ${escapeHtml(d.department)} department as ${escapeHtml(d.roleTitle)}, reporting to your assigned manager.`) +
        clause('4. Compensation', d.grossMonthly
          ? `Your gross monthly salary will be Rs. ${d.grossMonthly.toLocaleString('en-IN')}, payable monthly and subject to statutory deductions set out below. Compensation is reviewed annually at the company's discretion and is strictly confidential.`
          : 'Your compensation will be communicated separately and is strictly confidential.') +
        clause('5. Statutory Benefits & Deductions', 'As a full-time employee you are covered by Provident Fund (PF) and, where eligible, Employees’ State Insurance (ESI) and gratuity, in accordance with applicable Indian law. Income Tax (TDS) and Professional Tax will be deducted at source as required.') +
        clause('6. Leave Entitlement', 'You will accrue one sick leave and one casual leave for each completed month of service. Unused leave carries forward within the same calendar year and lapses on 31 December.') +
        clause('7. Notice Period / Termination', 'Either party may terminate this engagement by providing one month’s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.') +
        clause('8. Confidentiality & Non-Disclosure (NDA)', `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`) +
        clause('9. Intellectual Property Ownership', `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`) +
        clause('10. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');
    }

    return `
      <p style="${font} font-size: 14px; color: ${EMAIL_BRAND.text}; margin: 0 0 4px 0;">Hi ${escapeHtml(firstName)},</p>
      <p style="${font} font-size: 14px; color: ${EMAIL_BRAND.text}; margin: 0 0 18px 0;">Congratulations, and welcome to Shuroq! Here are the terms of your offer — a signed copy is also attached as a PDF.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
        <tr><td style="background-color: ${EMAIL_BRAND.headerBg}; padding: 8px 10px;">
          <span style="${font} font-size: 12.5px; font-weight: bold; color: #ffffff; letter-spacing: 0.4px;">${escapeHtml(title)}</span>
        </td></tr>
      </table>

      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 0 0 2px 0;"><strong>Date:</strong> ${escapeHtml(fmtDateFull(new Date()))}</p>
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 0 0 14px 0;"><strong>Candidate Name:</strong> ${escapeHtml(d.candidateName)}</p>

      ${body(intro)}

      ${clauses}

      <p style="${font} font-size: 13.5px; font-weight: bold; color: ${EMAIL_BRAND.darkBlue}; margin: 20px 0 4px 0;">Acceptance</p>
      ${body('I confirm that I have read, understood, and agree to all terms including the Confidentiality and Intellectual Property obligations stated above.')}
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 14px 0 4px 0;"><strong>Name:</strong> ${escapeHtml(d.candidateName)}</p>
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 0 0 4px 0;"><strong>Signature:</strong> ________________________</p>
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 0 0 20px 0;"><strong>Date:</strong> ____________________________</p>

      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 0;">${contact}</p>
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 4px 0 0 0;">Warm regards,<br />HR Team, Shuroq</p>
    `;
  }

  private async getSupportContactLine(): Promise<string> {
    const phone = await this.prisma.companyPolicy.findUnique({ where: { key: 'support_contact_phone' } });
    if (phone?.value) {
      return `If you have any questions, you can reach us at ${phone.value} or ${COMPANY.email}.`;
    }
    return `If you have any questions, you can reach us at ${COMPANY.email}.`;
  }

  // =====================================================================
  // TEMPLATE 1: INTERNSHIP CONFIRMATION LETTER (branded — WhatsApp style)
  //
  // Blue diagonal stripes, logo top-left, seal top-right,
  // Internship Details / Program Overview / Important Terms / Completion,
  // signature bottom-left, MSME bottom-right.
  // Matches the P kavitha template exactly.
  // =====================================================================

  private async renderInternConfirmationLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const H = doc.page.height;
      const M = 50;

      // --- Blue diagonal stripes ---
      this.drawBlueStripes(doc, W, H);

      // --- Shuroq logo top-left ---
      this.placeAsset(doc, ASSET_PATHS.logo, M, 30, 140);

      // --- Company seal top-right ---
      this.placeAsset(doc, ASSET_PATHS.seal, W - M - 100, 55, 100);

      // --- Title ---
      doc.y = 160;
      doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
        .text('INTERNSHIP CONFIRMATION LETTER', M, doc.y, { align: 'center', width: W - 2 * M });
      doc.moveDown(1.2);

      // --- Date ---
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`Date: ${fmtDateShort(d.startDate)}`, M);
      doc.moveDown(0.3);

      // --- Greeting ---
      doc.text(`Dear ${d.candidateName} ,`, M);
      doc.moveDown(0.8);

      // --- Intro paragraph ---
      doc.fontSize(10.5).font('Helvetica').fillColor(BRAND.black);
      doc.text('We are pleased to offer you the position of ', M, doc.y, {
        continued: true, width: W - 2 * M,
      });
      doc.font('Helvetica-Bold').text(`${d.roleTitle} Intern`, { continued: true });
      doc.font('Helvetica').text(
        ' at Shuroq. This internship involves working on internal projects and assigned tasks, allowing you to build practical skills through active participation and guided execution',
        { width: W - 2 * M },
      );
      doc.moveDown(1);

      // --- Internship Details ---
      doc.fontSize(10.5).font('Helvetica-Bold').text('Internship Details:', M);
      doc.text(`Start Date: ${fmtDateShort(d.startDate)}`, M);
      if (d.engagementEndDate) {
        doc.text(`End Date  : ${fmtDateShort(d.engagementEndDate)}`, M);
      }
      doc.text(`Mode: ${d.mode}`, M);
      doc.moveDown(0.8);

      // --- Program Overview ---
      doc.fontSize(10.5).font('Helvetica-Bold').text('Program Overview:', M);
      doc.font('Helvetica').fontSize(10);
      this.bullet(doc, M, W, 'Work on real internal projects and task-based assignments');
      this.bullet(doc, M, W, 'Collaborate with team members and follow structured guidance');
      this.bullet(doc, M, W, 'Develop practical understanding through execution of assigned work');
      doc.moveDown(0.8);

      // --- Important Terms ---
      doc.fontSize(10.5).font('Helvetica-Bold').text('Important Terms:', M);
      doc.font('Helvetica').fontSize(10);
      this.bullet(doc, M, W, 'This internship is not an employment opportunity');
      this.bullet(doc, M, W, 'No salary, stipend, or job guarantee is associated with this program');
      this.bullet(doc, M, W, 'Continuation in the program depends on participation, performance, and adherence to guidelines');
      doc.moveDown(0.8);

      // --- Completion & Recognition ---
      doc.fontSize(10.5).font('Helvetica-Bold').text('Completion & Recognition:', M);
      doc.font('Helvetica').fontSize(10);
      this.bullet(doc, M, W, 'Successful completion requires fulfilling assigned tasks and evaluation criteria');
      this.bullet(doc, M, W, 'A Certificate of Completion will be issued After 3 month based on performance');
      this.bullet(doc, M, W, 'We look forward to your participation and contribution.');
      doc.moveDown(1.2);

      // --- Welcome & Best Regards ---
      doc.fontSize(13).font('Helvetica-BoldOblique').fillColor(BRAND.darkBlue)
        .text('Welcome to Shuroq Technologies.', M);
      doc.text('Best Regards,', M);
      doc.moveDown(0.3);

      // --- Authorized Signature (bottom-left) ---
      this.placeAsset(doc, ASSET_PATHS.signature, M, doc.y, 130);

      // --- MSME Logo (bottom-right) ---
      this.placeAsset(doc, ASSET_PATHS.msme, W - M - 130, H - 190, 130);
    });
  }

  // =====================================================================
  // TEMPLATE 2: PART-TIME OFFER LETTER (clean — Aarif PDF style)
  //
  // Centered Shuroq logo, address + email line, centered title,
  // Date/Candidate Name, numbered clauses with justified body text,
  // acceptance block. No decorative elements.
  // =====================================================================

  private async renderPartTimeOfferLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const M = 72;
      const textW = W - 2 * M;

      // --- Centered logo ---
      this.placeLogoCentered(doc, W, M);

      // --- Address & contact ---
      doc.fontSize(9).font('Helvetica').fillColor(BRAND.grey)
        .text(COMPANY.address, M, doc.y, { width: textW });
      // Email in gray, website in blue (matches original hyperlink color)
      doc.fillColor(BRAND.grey)
        .text(`Email: ${COMPANY.email} | Website: `, M, doc.y, { width: textW, continued: true });
      doc.fillColor(BRAND.linkBlue).text(COMPANY.website, { link: `https://${COMPANY.website}` });
      doc.moveDown(1.5);

      // --- Title ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle.toUpperCase()} (PART TIME) \u2013 OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
      doc.moveDown(1.2);

      // --- Date ---
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('Date: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(fmtDateFull(new Date()));
      doc.moveDown(0.3);

      // --- Candidate Name ---
      doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(d.candidateName);
      doc.moveDown(0.5);

      // --- Intro ---
      // The trailing space stays on the BOLD segment (not as a leading
      // character of the plain segment that follows) \u2014 pdfkit's continued
      // text + align:'justify' silently drops a leading space on the
      // final segment of a continued run, gluing words together
      // ("Engineerat Shuroq"). Verified against the real reference PDFs.
      doc.fontSize(10.5).font('Helvetica').text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'justify' },
      );
      doc.font('Helvetica-Bold').text(`${d.roleTitle} (Part Time) `, { continued: true });
      doc.font('Helvetica').text(
        `at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'justify' },
      );
      doc.moveDown(1);

      // --- Clauses (1-6 stretched to fill the rest of page 1, matching
      // the real reference — see computeFillGap) ---
      const compLine = d.grossMonthly
        ? `You will receive a monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}.`
        : 'Your compensation will be communicated separately.';
      const page1Clauses = [
        { heading: '1. Employment Start Date', body: `Start Date: ${fmtDateFull(d.startDate)}` },
        { heading: '2. Nature of Engagement', body: 'This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.' },
        { heading: '3. Role Scope', body: 'You will perform assigned system engineering tasks and provide technical support under guidance from the team.' },
        { heading: '4. Compensation', body: compLine },
        { heading: '5. Statutory Benefits', body: 'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable for this part-time engagement.' },
        { heading: '6. Notice Period / Termination', body: 'Either party may terminate this engagement by providing 1 month prior written notice.' },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [fmtDateFull(d.startDate)], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, ['part-time role'], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body,
        d.grossMonthly ? [`monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}`] : [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[5].heading, page1Clauses[5].body, ['1 month prior written notice'], fillGap);

      // The real reference (Aarif's PDF) breaks to page 2 right here — an
      // explicit page break rather than trying to tune spacing to land
      // naturally in the same place, since natural flow shifts with every
      // candidate's actual name/role/department length.
      doc.addPage();

      this.clauseClean(doc, M, textW, '7. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information.`);
      // Extra bold line per Aarif template
      doc.fontSize(10.5).font('Helvetica-Bold')
        .text('This offer letter and employment terms are strictly confidential.', M, doc.y, { width: textW, align: 'justify' });
      doc.moveDown(0.9);

      this.clauseClean(doc, M, textW, '8. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of ${COMPANY.name}.`);

      this.clauseClean(doc, M, textW, '9. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.');

      // --- Acceptance ---
      this.acceptanceBlock(doc, M, textW, d.candidateName);
    }, { size: 'LETTER', margin: 72 });
  }

  // =====================================================================
  // TEMPLATE 3: FULL-TIME OFFER LETTER (clean style, same as part-time)
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

      // See the matching comment in renderPartTimeOfferLetter \u2014 the space
      // must stay on the bold segment, not lead the plain segment after it.
      doc.fontSize(10.5).font('Helvetica').text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'justify' },
      );
      doc.font('Helvetica-Bold').text(`${d.roleTitle} `, { continued: true });
      doc.font('Helvetica').text(
        `at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'justify' },
      );
      doc.moveDown(1);

      // --- Clauses (1-6 stretched to fill the rest of page 1, matching
      // the real reference family — see computeFillGap) ---
      const startDateClauseBody = `Start Date: ${fmtDateFull(d.startDate)}\nMode: ${d.mode}`;
      const natureClauseBody = 'This is a full-time, permanent role. You are expected to devote your full working time and attention to the company during working hours.';
      const roleClauseBody = `You will join the ${d.department} department as ${d.roleTitle}, reporting to your assigned manager.`;

      const compLine = d.grossMonthly
        ? `Your gross monthly salary will be Rs. ${d.grossMonthly.toLocaleString('en-IN')}, payable monthly and subject to statutory deductions set out below. Compensation is reviewed annually at the company\u2019s discretion and is strictly confidential.`
        : 'Your compensation will be communicated separately and is strictly confidential.';

      const statutoryClauseBody = 'As a full-time employee you are covered by Provident Fund (PF) and, where eligible, Employees\u2019 State Insurance (ESI) and gratuity, in accordance with applicable Indian law. Income Tax (TDS) and Professional Tax will be deducted at source as required.';

      const leaveClauseBody = 'You will accrue one sick leave and one casual leave for each completed month of service. Unused leave carries forward within the same calendar year and lapses on 31 December.';

      const page1Clauses = [
        { heading: '1. Employment Start Date', body: startDateClauseBody },
        { heading: '2. Nature of Engagement', body: natureClauseBody },
        { heading: '3. Role & Reporting', body: roleClauseBody },
        { heading: '4. Compensation', body: compLine },
        { heading: '5. Statutory Benefits & Deductions', body: statutoryClauseBody },
        { heading: '6. Leave Entitlement', body: leaveClauseBody },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [fmtDateFull(d.startDate)], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[5].heading, page1Clauses[5].body, [], fillGap);

      // Same "break after clause 6" convention as part-time/internship —
      // see the comment on renderPartTimeOfferLetter's page break. No
      // full-time reference PDF exists to verify this exact spot, but it's
      // the same clause-body length family as the two verified templates.
      doc.addPage();

      this.clauseClean(doc, M, textW, '7. Notice Period / Termination',
        'Either party may terminate this engagement by providing one month\u2019s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.');

      this.clauseClean(doc, M, textW, '8. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`);

      this.clauseClean(doc, M, textW, '9. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`);

      this.clauseClean(doc, M, textW, '10. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.');

      this.acceptanceBlock(doc, M, textW, d.candidateName);
    }, { size: 'LETTER', margin: 72 });
  }

  // =====================================================================
  // TEMPLATE 4: INTERNSHIP OFFER LETTER (clean style — matches the real
  // Pala lova kishore reference PDF exactly: role in the title is Title
  // Case, not upper-cased, with no dash before "OFFER LETTER"; the intro
  // paragraph doesn't bold the role; clause 1 has three plain (non-bold)
  // lines including a computed "Duration: N months"; clause 6 has an
  // extra leading sentence the other two templates don't.)
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

      // Reference title: "Full Stack Developer Intern OFFER LETTER" — role
      // stays as typed (Title Case), only "OFFER LETTER" is upper-cased,
      // and there's no dash — unlike the full-time/part-time titles.
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

      // Reference doesn't bold the role/type here, unlike full-time/part-time.
      doc.fontSize(10.5).font('Helvetica').text(
        `We are pleased to offer you the position of ${d.roleTitle} Intern (Internship) at ${COMPANY.name} under the following terms and conditions:`,
        M, doc.y, { width: textW, align: 'justify' },
      );
      doc.moveDown(1);

      const months = d.engagementEndDate ? monthsBetween(d.startDate, d.engagementEndDate) : null;
      const duration =
        `Start Date: ${fmtDateFull(d.startDate)}` +
        (d.engagementEndDate ? `\nEnd Date: ${fmtDateFull(d.engagementEndDate)}` : '') +
        (months !== null ? `\nDuration: ${months} month${months === 1 ? '' : 's'}` : '');
      const stipendClauseBody = d.grossMonthly
        ? `You will receive a training allowance of Rs. ${d.grossMonthly.toLocaleString('en-IN')} per month.`
        : 'This internship is unpaid. No stipend, salary, or wages shall be provided during the training period.';

      const page1Clauses = [
        { heading: '1. Internship Duration', body: duration },
        { heading: '2. Nature of Engagement', body: 'This engagement is purely for training and skill development purposes and does not constitute regular employment or create an employer–employee relationship.' },
        { heading: '3. Training Scope', body: 'You will undergo structured training and may perform supervised technical tasks strictly incidental to training and learning objectives.' },
        { heading: '4. Training Allowance (Stipend)', body: stipendClauseBody },
        { heading: '5. Statutory Benefits', body: 'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable during the training period.' },
        { heading: '6. Termination / Early Exit', body: 'While this internship is intended to run for the full duration specified, it may be discontinued by either party at any time via written notice. In the event of an early exit, the Intern agrees to ensure a professional handover of all ongoing tasks and return any company property.' },
      ];
      const fillGap = this.computeFillGap(doc, textW, page1Clauses);

      this.clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);
      this.clauseClean(doc, M, textW, page1Clauses[5].heading, page1Clauses[5].body, [], fillGap);

      // The real reference (Kishore's PDF) breaks to page 2 right here —
      // see the comment on renderPartTimeOfferLetter's page break.
      doc.addPage();

      this.clauseClean(doc, M, textW, '7. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation shall survive the completion or termination of the internship.`);

      this.clauseClean(doc, M, textW, '8. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during the internship shall be the sole intellectual property of ${COMPANY.name}. You irrevocably assign all rights, title, and interest in such work to ${COMPANY.name}.`);

      this.clauseClean(doc, M, textW, '9. Completion & Absorption',
        'Upon successful completion, a Training / Internship Completion Certificate will be issued. Completion does not guarantee employment.');

      this.clauseClean(doc, M, textW, '10. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.');

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

  /** Blue diagonal stripes — top-right and bottom-left (branded template only) */
  private drawBlueStripes(doc: PDFKit.PDFDocument, W: number, H: number) {
    doc.save();
    doc.moveTo(W * 0.65, 0).lineTo(W, 0).lineTo(W, H * 0.28).closePath().fill(BRAND.darkBlue);
    doc.restore();
    doc.save();
    doc.moveTo(0, H * 0.92).lineTo(W * 0.40, H).lineTo(0, H).closePath().fill(BRAND.darkBlue);
    doc.restore();
  }

  /** Place a brand asset image at a specific position, with fallback */
  private placeAsset(doc: PDFKit.PDFDocument, assetPath: string, x: number, y: number, width: number) {
    if (fs.existsSync(assetPath)) {
      doc.image(assetPath, x, y, { width });
    }
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

  /** Bullet point for the branded confirmation letter */
  private bullet(doc: PDFKit.PDFDocument, M: number, pageW: number, text: string) {
    const textX = M + 25;
    const y = doc.y;
    doc.fontSize(10).font('Helvetica').fillColor(BRAND.black);
    doc.text('\u2022', M + 12, y);
    doc.text(text, textX, y, { width: pageW - textX - M });
  }

  /**
   * A numbered clause for the clean offer letter style.
   * Heading is bold and slightly larger. Body is justified.
   * Optional boldPhrases array to bold specific terms within the body.
   * gapAfterPt, when given, replaces the default trailing space with an
   * exact point value — see computeFillGap, used to stretch a page's
   * worth of clauses to fill the page the way the real reference PDFs do,
   * instead of leaving a block of dead space above the forced page break.
   */
  private clauseClean(
    doc: PDFKit.PDFDocument, M: number, textW: number,
    heading: string, body: string, boldPhrases: string[] = [], gapAfterPt?: number,
  ) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(heading, M, doc.y, { width: textW });
    doc.moveDown(0.3);

    if (boldPhrases.length === 0) {
      doc.fontSize(10.5).font('Helvetica').text(body, M, doc.y, { width: textW, align: 'justify' });
    } else {
      // Simple bold-phrase injection: split on the first bold phrase found.
      // The space right after a bold phrase is deliberately appended to the
      // BOLD segment rather than left as the leading character of the next
      // plain segment — pdfkit's continued-text + align:'justify' drops a
      // leading space on the final segment of a continued run, gluing
      // words together (e.g. "part-time rolefocused"). Verified against
      // the real reference PDFs.
      doc.fontSize(10.5).font('Helvetica');
      let remaining = body;
      for (const phrase of boldPhrases) {
        const idx = remaining.indexOf(phrase);
        if (idx === -1) continue;
        const before = remaining.substring(0, idx);
        if (before) doc.text(before, M, doc.y, { continued: true, width: textW, align: 'justify' });
        let afterPhrase = remaining.substring(idx + phrase.length);
        let boldText = phrase;
        if (afterPhrase.startsWith(' ')) {
          boldText += ' ';
          afterPhrase = afterPhrase.substring(1);
        }
        doc.font('Helvetica-Bold').text(boldText, { continued: true });
        doc.font('Helvetica');
        remaining = afterPhrase;
      }
      if (remaining) doc.text(remaining, { width: textW, align: 'justify' });
    }
    if (gapAfterPt !== undefined) {
      doc.y += gapAfterPt;
    } else {
      doc.moveDown(0.9);
    }
  }

  /**
   * Measures how tall a clause block (heading + body, at clauseClean's own
   * font sizes) would render at the given width — a pure measurement pass,
   * no drawing. boldPhrases isn't accounted for since splitting text across
   * a bold sub-run doesn't materially change its wrapped height.
   */
  private measureClauseHeight(doc: PDFKit.PDFDocument, textW: number, heading: string, body: string): number {
    doc.font('Helvetica-Bold').fontSize(12);
    const headingH = doc.heightOfString(heading, { width: textW });
    doc.font('Helvetica').fontSize(10.5);
    const bodyH = doc.heightOfString(body, { width: textW, align: 'justify' });
    return headingH + 4 + bodyH; // +4 ~= clauseClean's heading-to-body moveDown(0.3)
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

/** DD-MM-YY format matching the confirmation letter (e.g., "09-05-26") */
function fmtDateShort(d: Date | null): string {
  if (!d) return '\u2014';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

/** MM/DD/YYYY format matching the clean offer letters (e.g., "01/07/2026") */
function fmtDateFull(d: Date | null): string {
  if (!d) return '\u2014';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Whole calendar months between two dates \u2014 matches the "Duration: 3 months" line on the real internship offer letter reference. */
function monthsBetween(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}
