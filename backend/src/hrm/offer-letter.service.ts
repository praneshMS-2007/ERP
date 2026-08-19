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

// Brand colors matching the letterhead exactly
const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  white: '#ffffff',
  black: '#000000',
  grey: '#666666',
};

// Brand asset paths
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets', 'brand');
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
    let kind: 'OFFER_LETTER' | 'CONFIRMATION_LETTER' = 'OFFER_LETTER';
    try {
      if (employee.empType === 'INTERN') {
        pdfBuffer = await this.renderInternConfirmationLetter(data);
        kind = 'CONFIRMATION_LETTER';
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
      const M = 50;
      const textW = W - 2 * M;

      // --- Centered logo ---
      this.placeLogoCentered(doc, W, M);

      // --- Address & contact ---
      doc.fontSize(9).font('Helvetica').fillColor('#333')
        .text(COMPANY.address, M, doc.y, { width: textW });
      doc.text(`Email: ${COMPANY.email} | Website: ${COMPANY.website}`, M, doc.y, { width: textW });
      doc.moveDown(1.5);

      // --- Title ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle.toUpperCase()} (PART TIME) \u2014 OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
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
      doc.fontSize(10.5).font('Helvetica').text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'justify' },
      );
      doc.font('Helvetica-Bold').text(`${d.roleTitle} (Part Time)`, { continued: true });
      doc.font('Helvetica').text(
        ` at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'justify' },
      );
      doc.moveDown(1);

      // --- Clauses ---
      this.clauseClean(doc, M, textW, '1. Employment Start Date',
        `Start Date: ${fmtDateFull(d.startDate)}`, [fmtDateFull(d.startDate)]);

      this.clauseClean(doc, M, textW, '2. Nature of Engagement',
        `This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.`,
        ['part-time role']);

      this.clauseClean(doc, M, textW, '3. Role Scope',
        `You will perform assigned system engineering tasks and provide technical support under guidance from the team.`);

      const compLine = d.grossMonthly
        ? `You will receive a monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}.`
        : 'Your compensation will be communicated separately.';
      this.clauseClean(doc, M, textW, '4. Compensation', compLine,
        d.grossMonthly ? [`monthly salary of Rs. ${d.grossMonthly.toLocaleString('en-IN')}`] : []);

      this.clauseClean(doc, M, textW, '5. Statutory Benefits',
        'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable for this part-time engagement.');

      this.clauseClean(doc, M, textW, '6. Notice Period / Termination',
        'Either party may terminate this engagement by providing 1 month prior written notice.',
        ['1 month prior written notice']);

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
    });
  }

  // =====================================================================
  // TEMPLATE 3: FULL-TIME OFFER LETTER (clean style, same as part-time)
  // =====================================================================

  private async renderFullTimeOfferLetter(d: LetterData): Promise<Buffer> {
    return this.renderPdf((doc) => {
      const W = doc.page.width;
      const M = 50;
      const textW = W - 2 * M;

      this.placeLogoCentered(doc, W, M);

      doc.fontSize(9).font('Helvetica').fillColor('#333')
        .text(COMPANY.address, M, doc.y, { width: textW });
      doc.text(`Email: ${COMPANY.email} | Website: ${COMPANY.website}`, M, doc.y, { width: textW });
      doc.moveDown(1.5);

      doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
        .text(`${d.roleTitle.toUpperCase()} (FULL TIME) \u2014 OFFER LETTER`, M, doc.y, { align: 'center', width: textW });
      doc.moveDown(1.2);

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
        .text('Date: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(fmtDateFull(new Date()));
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
      doc.font('Helvetica').text(d.candidateName);
      doc.moveDown(0.5);

      doc.fontSize(10.5).font('Helvetica').text(
        'We are pleased to offer you the position of ',
        M, doc.y, { continued: true, width: textW, align: 'justify' },
      );
      doc.font('Helvetica-Bold').text(d.roleTitle, { continued: true });
      doc.font('Helvetica').text(
        ` at ${COMPANY.name} under the following terms and conditions:`,
        { width: textW, align: 'justify' },
      );
      doc.moveDown(1);

      this.clauseClean(doc, M, textW, '1. Employment Start Date',
        `Start Date: ${fmtDateFull(d.startDate)}\nMode: ${d.mode}`,
        [fmtDateFull(d.startDate)]);

      this.clauseClean(doc, M, textW, '2. Nature of Engagement',
        'This is a full-time, permanent role. You are expected to devote your full working time and attention to the company during working hours.');

      this.clauseClean(doc, M, textW, '3. Role & Reporting',
        `You will join the ${d.department} department as ${d.roleTitle}, reporting to your assigned manager.`);

      const compLine = d.grossMonthly
        ? `Your gross monthly salary will be Rs. ${d.grossMonthly.toLocaleString('en-IN')}, payable monthly and subject to statutory deductions set out below. Compensation is reviewed annually at the company\u2019s discretion and is strictly confidential.`
        : 'Your compensation will be communicated separately and is strictly confidential.';
      this.clauseClean(doc, M, textW, '4. Compensation', compLine);

      this.clauseClean(doc, M, textW, '5. Statutory Benefits & Deductions',
        'As a full-time employee you are covered by Provident Fund (PF) and, where eligible, Employees\u2019 State Insurance (ESI) and gratuity, in accordance with applicable Indian law. Income Tax (TDS) and Professional Tax will be deducted at source as required.');

      this.clauseClean(doc, M, textW, '6. Leave Entitlement',
        'You will accrue one sick leave and one casual leave for each completed month of service. Unused leave carries forward within the same calendar year and lapses on 31 December.');

      this.clauseClean(doc, M, textW, '7. Notice Period / Termination',
        'Either party may terminate this engagement by providing one month\u2019s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.');

      this.clauseClean(doc, M, textW, '8. Confidentiality & Non-Disclosure (NDA)',
        `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`);

      this.clauseClean(doc, M, textW, '9. Intellectual Property Ownership',
        `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`);

      this.clauseClean(doc, M, textW, '10. Governing Law',
        'This offer letter shall be governed by and construed in accordance with the laws of India.');

      this.acceptanceBlock(doc, M, textW, d.candidateName);
    });
  }

  // =====================================================================
  // SHARED BUILDING BLOCKS
  // =====================================================================

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
   */
  private clauseClean(
    doc: PDFKit.PDFDocument, M: number, textW: number,
    heading: string, body: string, boldPhrases: string[] = [],
  ) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(heading, M, doc.y, { width: textW });
    doc.moveDown(0.3);

    if (boldPhrases.length === 0) {
      doc.fontSize(10.5).font('Helvetica').text(body, M, doc.y, { width: textW, align: 'justify' });
    } else {
      // Simple bold-phrase injection: split on the first bold phrase found
      doc.fontSize(10.5).font('Helvetica');
      let remaining = body;
      for (const phrase of boldPhrases) {
        const idx = remaining.indexOf(phrase);
        if (idx === -1) continue;
        const before = remaining.substring(0, idx);
        if (before) doc.text(before, M, doc.y, { continued: true, width: textW, align: 'justify' });
        doc.font('Helvetica-Bold').text(phrase, { continued: true });
        doc.font('Helvetica');
        remaining = remaining.substring(idx + phrase.length);
      }
      if (remaining) doc.text(remaining, { width: textW, align: 'justify' });
    }
    doc.moveDown(0.9);
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
