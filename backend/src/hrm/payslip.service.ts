import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';
import { decryptField } from '../common/field-encryption';
import { formatINR } from '../common/currency';
import { emailShell, logoAttachment, escapeHtml, EMAIL_BRAND } from '../common/email-template';

const COMPANY = {
  name: 'Shuroq',
  legalName: 'Shuroq Technologies',
  address: 'Hyderabad, Telangana, India',
  email: 'hr-team@shuroq.com',
  website: 'www.shuroq.com',
};

const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  // Matches the original Shoab payslip exactly — extracted from PDF content stream:
  // .9373 .9373 .9373 rg → RGB(239,239,239) for header bars (EMPLOYEE DETAILS, ATTENDENCE RECORD)
  // .8118 .8863 .9529 rg → RGB(207,226,243) for NET SALARY PAYABLE highlight
  headerBg: '#efefef',       // light gray — EMPLOYEE DETAILS & ATTENDENCE RECORD bars
  netPayBg: '#cfe2f3',       // light blue — NET SALARY PAYABLE (A-B) row
  white: '#ffffff',
  black: '#1f1f1f',          // near-black (original uses RGB 31,31,31, not pure black)
  border: '#000000',
};

// process.cwd(), not __dirname — see email-template.ts's ASSETS_DIR
// comment for why: nest build's dist/ doesn't carry the assets/ folder,
// so an __dirname-relative path silently 404s once running from dist
// (the configuration `npm run start:dev` actually spawns), and this PDF's
// logo was falling back to plain text as a result — same root cause
// found while wiring the email logo attachment, fixed here too.
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'brand');
const LOGO_PATH = path.join(ASSETS_DIR, 'shuroq-logo.png');

interface PayslipData {
  employeeName: string;
  empCode: string;
  designation: string;
  department: string;
  joinDate: string;
  pan: string;
  bankAccountNo: string;
  bankIfsc: string;
  payPeriod: string;
  paymentDate: Date;
  baseSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  tds: number;
  providentFund: number;
  professionalTax: number;
  lossOfPay: number;
  netPay: number;
  totalDaysInMonth: number;
  workingDaysInMonth: number;
  leavesTaken: number;
  effectiveWorkDays: number;
}

/**
 * Generates and emails the branded payslip matching Shuroq's exact
 * company template — bordered tabular layout with:
 *   - Centered Shuroq logo
 *   - "PAYSLIP - [MONTH, YEAR]"
 *   - EMPLOYEE DETAILS header bar (blue)
 *   - Side-by-side EARNINGS | DEDUCTIONS table with borders
 *   - NET SALARY PAYABLE (A - B) highlighted row
 *   - AMOUNT IN WORDS
 *   - ATTENDANCE RECORD
 *   - DECLARATION
 */
@Injectable()
export class PayslipService {
  private readonly logger = new Logger(PayslipService.name);
  private readonly outDir = path.join(process.cwd(), 'uploads', 'payslips');

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  async issueAndSend(payrollId: string): Promise<{
    documentId: string | null;
    fileUrl: string | null;
    emailed: boolean;
    error?: string;
  }> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { employee: { include: { department: true, designation: true } } },
    });
    if (!payroll) return { documentId: null, fileUrl: null, emailed: false, error: 'Payroll record not found' };

    const employee = payroll.employee;
    if (!employee.personalEmail) {
      return { documentId: null, fileUrl: null, emailed: false, error: 'No email address on file for this employee' };
    }
    if (!employee.pan || !employee.bankAccountNo) {
      return {
        documentId: null,
        fileUrl: null,
        emailed: false,
        error: 'PAN and bank account number must be on file before a payslip can be generated',
      };
    }

    const data: PayslipData = {
      employeeName: `${employee.firstName} ${employee.lastName}`.toUpperCase(),
      empCode: employee.empCode ?? '\u2014',
      designation: employee.designation?.title ?? '\u2014',
      department: employee.department?.name ?? '\u2014',
      joinDate: fmtDate(employee.joinDate),
      pan: decryptField(employee.pan),
      bankAccountNo: employee.bankAccountNo,
      bankIfsc: employee.bankIfsc ?? '\u2014',
      payPeriod: payroll.payPeriod,
      paymentDate: payroll.paymentDate ?? new Date(),
      baseSalary: payroll.baseSalary,
      hra: payroll.hra,
      specialAllowance: payroll.specialAllowance,
      bonus: payroll.bonus,
      tds: payroll.tds,
      providentFund: payroll.providentFund,
      professionalTax: payroll.professionalTax,
      lossOfPay: payroll.lossOfPay,
      netPay: payroll.netPay,
      totalDaysInMonth: payroll.totalDaysInMonth,
      workingDaysInMonth: payroll.workingDaysInMonth,
      leavesTaken: payroll.leavesTaken,
      effectiveWorkDays: payroll.effectiveWorkDays,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.renderPayslip(data);
    } catch (err: any) {
      this.logger.error(`Payslip PDF generation failed for payroll ${payrollId}: ${err.message}`);
      return { documentId: null, fileUrl: null, emailed: false, error: `Could not generate the payslip: ${err.message}` };
    }

    const safeName = data.employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safePeriod = data.payPeriod.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${safeName}-${safePeriod}-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const fullPath = path.join(this.outDir, fileName);
    fs.writeFileSync(fullPath, pdfBuffer);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const fileUrl = `/uploads/payslips/${fileName}`;

    const document = await this.prisma.document.create({
      data: {
        kind: 'PAYSLIP',
        ownerUserId: employee.userId,
        storagePath: fileUrl,
        fileName,
        sha256,
      },
    });
    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: { payslipDocumentId: document.id },
    });

    const result = await this.mailer.send({
      to: employee.personalEmail,
      subject: `Your payslip for ${data.payPeriod} \u2014 ${COMPANY.name}`,
      html: emailShell({
        previewText: `Your payslip for ${data.payPeriod} \u2014 Net Pay ${formatINR(data.netPay)}`,
        bodyHtml: this.buildEmailHtml(employee.firstName, data),
      }),
      attachments: [
        { filename: `Payslip - ${data.employeeName} - ${data.payPeriod}.pdf`, path: fullPath },
        logoAttachment(),
      ],
    });

    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        payslipSentAt: result.sent ? new Date() : null,
        payslipSendError: result.sent ? null : result.error,
      },
    });

    if (!result.sent) {
      this.logger.warn(`Payslip generated but not emailed for payroll ${payrollId}: ${result.error}`);
    }

    return {
      documentId: document.id,
      fileUrl,
      emailed: result.sent,
      error: result.sent ? undefined : result.error,
    };
  }

  // =====================================================================
  // EMAIL BODY — same content and sequence as the PDF's build(), just as
  // HTML table markup instead of pdfkit draw calls. Table-based (not
  // div/flex) because that's what actually survives Outlook's HTML
  // stripping.
  // =====================================================================

  private buildEmailHtml(firstName: string, d: PayslipData): string {
    const gross = d.baseSalary + d.hra + d.specialAllowance + d.bonus;
    const totalDed = d.tds + d.providentFund + d.professionalTax + d.lossOfPay;
    const f = (n: number) => `Rs. ${(n || 0).toLocaleString('en-IN')}`;
    const font = "font-family: Arial, Helvetica, sans-serif;";
    const cell = `padding: 7px 8px; border: 1px solid ${EMAIL_BRAND.border}; ${font} font-size: 12.5px; color: ${EMAIL_BRAND.text};`;
    const cellRight = `${cell} text-align: right;`;
    const cellLabel = `${cell} font-weight: bold; background-color: ${EMAIL_BRAND.lightBlue}; width: 40%;`;

    function detailRow(label1: string, val1: string, label2: string, val2: string): string {
      return `
        <tr>
          <td style="${cellLabel}">${escapeHtml(label1)}</td>
          <td style="${cell}">${escapeHtml(val1)}</td>
          <td style="${cellLabel}">${escapeHtml(label2)}</td>
          <td style="${cell}">${escapeHtml(val2)}</td>
        </tr>`;
    }

    function moneyRow(left: string, leftAmt: string, right: string, rightAmt: string, bold = false): string {
      const w = bold ? 'font-weight: bold;' : '';
      return `
        <tr>
          <td style="${cell} ${w}">${escapeHtml(left)}</td>
          <td style="${cellRight} ${w}">${leftAmt}</td>
          <td style="${cell} ${w}">${escapeHtml(right)}</td>
          <td style="${cellRight} ${w}">${rightAmt}</td>
        </tr>`;
    }

    return `
      <p style="${font} font-size: 14px; color: ${EMAIL_BRAND.text}; margin: 0 0 4px 0;">Hi ${escapeHtml(firstName)},</p>
      <p style="${font} font-size: 14px; color: ${EMAIL_BRAND.text}; margin: 0 0 20px 0;">Your payslip for <strong>${escapeHtml(d.payPeriod)}</strong> has been processed and paid. The full breakdown is below, and a copy is attached as a PDF for your records.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 4px;">
        <tr><td style="background-color: ${EMAIL_BRAND.headerBg}; padding: 8px 10px;">
          <span style="${font} font-size: 13px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">PAYSLIP &mdash; ${escapeHtml(d.payPeriod.toUpperCase())}</span>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
        <tr><td style="${cellLabel}" colspan="4">EMPLOYEE DETAILS</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18px; border-collapse: collapse;">
        ${detailRow('EMPLOYEE NAME', d.employeeName, 'DATE OF JOINING', d.joinDate)}
        ${detailRow('ROLE', d.designation, 'EMPLOYEE ID', d.empCode)}
        <tr>
          <td style="${cellLabel}">PAN NUMBER</td>
          <td style="${cell}" colspan="3">${escapeHtml(d.pan)}</td>
        </tr>
        <tr>
          <td style="${cellLabel}">BANK ACCOUNT NO</td>
          <td style="${cell}" colspan="3">${escapeHtml(d.bankAccountNo)}</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 0;">
        <tr>
          <td style="${cellLabel}" colspan="2">EARNINGS</td>
          <td style="${cellLabel}" colspan="2">DEDUCTIONS</td>
        </tr>
        ${moneyRow('Basic Salary', f(d.baseSalary), 'Income Tax (TDS)', f(d.tds))}
        ${moneyRow('HRA', f(d.hra), 'Provident Fund', f(d.providentFund))}
        ${moneyRow('Special Allowance', f(d.specialAllowance), 'Professional Tax', f(d.professionalTax))}
        ${moneyRow('Bonus/Incentives', f(d.bonus), 'Loss of Pay (LOP)', f(d.lossOfPay))}
        ${moneyRow('Gross Total (A)', f(gross), 'Total Deductions (B)', f(totalDed), true)}
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 14px;">
        <tr>
          <td style="${cell} font-weight: bold; background-color: ${EMAIL_BRAND.lightBlue};">NET SALARY PAYABLE (A - B)</td>
          <td style="${cellRight} font-weight: bold; background-color: ${EMAIL_BRAND.lightBlue};">${f(d.netPay)}</td>
        </tr>
        <tr>
          <td style="${cell}" colspan="2"><strong>AMOUNT IN WORDS:</strong> ${escapeHtml(numberToWords(d.netPay))} Rupees only</td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 18px; border-collapse: collapse;">
        <tr><td style="background-color: ${EMAIL_BRAND.lightBlue}; ${cell} font-weight: bold;">ATTENDENCE RECORD</td></tr>
        <tr><td style="${cell}">TOTAL DAYS IN MONTH: ${d.totalDaysInMonth}<br />EFFECTIVE WORK DAYS: ${d.effectiveWorkDays}<br />TOTAL LEAVES TAKEN: ${d.leavesTaken}</td></tr>
      </table>

      <p style="${font} font-size: 11px; font-style: italic; color: ${EMAIL_BRAND.muted}; margin: 18px 0 0 0; background-color: ${EMAIL_BRAND.lightBlue}; padding: 8px 10px;">This is a computer-generated document and does not require a signature.</p>

      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 22px 0 0 0;">If anything here looks off, reach out to ${COMPANY.email}.</p>
      <p style="${font} font-size: 13px; color: ${EMAIL_BRAND.text}; margin: 4px 0 0 0;">Warm regards,<br />HR &amp; Finance, Shuroq</p>
    `;
  }

  // =====================================================================
  // PDF RENDERING — matches the Shoab May 2026 payslip template exactly
  // =====================================================================

  private renderPayslip(d: PayslipData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        this.build(doc, d);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private build(doc: PDFKit.PDFDocument, d: PayslipData) {
    const W = doc.page.width;
    const H = doc.page.height;
    const M = 40;
    const contentW = W - 2 * M;
    const lw = 0.5; // line width for borders

    // === OUTER PAGE BORDER ===
    doc.save();
    doc.lineWidth(1).rect(M - 5, M - 5, contentW + 10, H - 2 * M + 10).stroke(BRAND.border);
    doc.restore();

    // === CENTERED SHUROQ LOGO ===
    let logoBottom = 60;
    if (fs.existsSync(LOGO_PATH)) {
      const logoW = 120;
      doc.image(LOGO_PATH, (W - logoW) / 2, M + 5, { width: logoW });
      logoBottom = M + 65;
    } else {
      doc.fontSize(18).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
        .text(COMPANY.name, M, M + 10, { align: 'center', width: contentW });
      doc.fontSize(7).font('Helvetica').fillColor('#666')
        .text('TECH REDEFINED', M, doc.y, { align: 'center', width: contentW, characterSpacing: 2 });
      logoBottom = doc.y + 10;
    }

    // === PAYSLIP TITLE ===
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(`PAYSLIP - [${d.payPeriod.toUpperCase()}]`, M, logoBottom, { align: 'center', width: contentW });
    doc.moveDown(0.8);

    // === EMPLOYEE DETAILS HEADER BAR ===
    // Original: light gray (#efefef) background with black text — NOT blue with white text
    const edY = doc.y;
    doc.save();
    doc.rect(M, edY, contentW, 20).fill(BRAND.headerBg);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('EMPLOYEE DETAILS', M, edY + 4, { align: 'center', width: contentW });
    doc.restore();
    doc.y = edY + 22;

    // === EMPLOYEE DETAIL ROWS ===
    const halfW = contentW / 2;

    // Row 1: Name | Date of Joining
    this.detailRow2(doc, M, doc.y, halfW,
      'EMPLOYEE NAME:', d.employeeName,
      'DATE OF JOINING:', d.joinDate);

    // Row 2: Role | Employee ID
    this.detailRow2(doc, M, doc.y, halfW,
      'ROLE:', d.designation,
      'EMPLOYEE ID:', d.empCode);

    // Row 3: PAN Number (full width)
    this.detailRow1(doc, M, doc.y, contentW, 'PAN NUMBER:', d.pan);

    // Row 4: Bank Account No (full width)
    this.detailRow1(doc, M, doc.y, contentW, 'BANK ACCOUNT NO:', d.bankAccountNo);
    doc.moveDown(0.6);

    // === EARNINGS & DEDUCTIONS TABLE (side by side) ===
    const tableY = doc.y;
    const colW = contentW / 2;
    const rowH = 18;

    // Table headers
    doc.save();
    // Left header: EARNINGS
    doc.rect(M, tableY, colW - 1, rowH).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('EARNINGS', M + 5, tableY + 4, { width: colW - 60 });
    doc.text('', M + colW - 65, tableY + 4, { width: 60, align: 'right' }); // amount header
    // Right header: DEDUCTIONS
    doc.rect(M + colW + 1, tableY, colW - 1, rowH).stroke(BRAND.border);
    doc.text('DEDUCTIONS', M + colW + 6, tableY + 4, { width: colW - 60 });
    doc.restore();

    let ty = tableY + rowH;

    // Earnings data
    const earnings = [
      ['Basic Salary', d.baseSalary],
      ['HRA', d.hra],
      ['Special Allowance', d.specialAllowance],
      ['Bonus/Incentives', d.bonus],
    ] as [string, number][];

    // Deductions data
    const deductions = [
      ['Income Tax (TDS)', d.tds],
      ['Provident Fund', d.providentFund],
      ['Professional Tax', d.professionalTax],
      ['Loss of Pay (LOP)', d.lossOfPay],
    ] as [string, number][];

    const gross = d.baseSalary + d.hra + d.specialAllowance + d.bonus;
    const totalDed = d.tds + d.providentFund + d.professionalTax + d.lossOfPay;

    // Data rows
    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
      // Left cell (earnings)
      doc.save();
      doc.rect(M, ty, colW - 1, rowH).stroke(BRAND.border);
      if (i < earnings.length) {
        doc.fontSize(9).font('Helvetica').fillColor(BRAND.black)
          .text(earnings[i][0], M + 5, ty + 4, { width: colW - 70 });
        doc.text(fmtMoneyOrDash(earnings[i][1]), M + colW - 70, ty + 4, { width: 60, align: 'right' });
      }
      doc.restore();

      // Right cell (deductions)
      doc.save();
      doc.rect(M + colW + 1, ty, colW - 1, rowH).stroke(BRAND.border);
      if (i < deductions.length) {
        doc.fontSize(9).font('Helvetica').fillColor(BRAND.black)
          .text(deductions[i][0], M + colW + 6, ty + 4, { width: colW - 70 });
        doc.text(fmtMoneyOrDash(deductions[i][1]), M + colW + colW - 70, ty + 4, { width: 60, align: 'right' });
      }
      doc.restore();
      ty += rowH;
    }

    // Totals row
    doc.save();
    doc.rect(M, ty, colW - 1, rowH).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('Gross Total (A)', M + 5, ty + 4, { width: colW - 70 });
    doc.text(String(gross), M + colW - 70, ty + 4, { width: 60, align: 'right' });
    doc.restore();

    doc.save();
    doc.rect(M + colW + 1, ty, colW - 1, rowH).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('Total Deductions (B)', M + colW + 6, ty + 4, { width: colW - 70 });
    doc.text(String(totalDed), M + colW + colW - 70, ty + 4, { width: 60, align: 'right' });
    doc.restore();
    ty += rowH;
    doc.moveDown(0.8);
    doc.y = ty + 8;

    // === NET SALARY PAYABLE (A - B) ===
    // Original: light blue (#cfe2f3) background with black text
    const netY = doc.y;
    doc.save();
    doc.rect(M, netY, contentW - 65, 20).fill(BRAND.netPayBg);
    doc.rect(M, netY, contentW - 65, 20).stroke(BRAND.border);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('NET SALARY PAYABLE (A - B)', M + 5, netY + 4);
    doc.rect(M + contentW - 65, netY, 65, 20).fill(BRAND.netPayBg);
    doc.rect(M + contentW - 65, netY, 65, 20).stroke(BRAND.border);
    doc.text(String(d.netPay), M + contentW - 65, netY + 4, { width: 60, align: 'right' });
    doc.restore();
    doc.y = netY + 22;

    // === AMOUNT IN WORDS ===
    doc.save();
    doc.rect(M, doc.y, contentW, 20).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(`AMOUNT IN WORDS: ${numberToWords(d.netPay)} Rupees only`, M + 5, doc.y + 4, { width: contentW - 10 });
    doc.restore();
    doc.y += 28;

    // === ATTENDANCE RECORD ===
    const attY = doc.y;
    // Header bar — original uses same gray (#efefef) as EMPLOYEE DETAILS, partial width
    doc.save();
    doc.rect(M, attY, contentW * 0.45, 18).fill(BRAND.headerBg);
    doc.rect(M, attY, contentW * 0.45, 18).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('ATTENDENCE RECORD', M + 5, attY + 4);
    doc.restore();
    doc.y = attY + 20;

    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(`TOTAL DAYS IN MONTH: ${d.totalDaysInMonth}`, M + 5);
    doc.text(`EFFECTIVE WORK DAYS: ${d.effectiveWorkDays}`, M + 5);
    doc.text(`TOTAL LEAVES TAKEN: ${d.leavesTaken}`, M + 5);
    doc.moveDown(1);

    // === DECLARATION ===
    // Original: bold heading on white background, italic text below — no colored bar
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.black).text('DECLARATION', M + 5);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(BRAND.black)
      .text('This is a computer-generated document and does not require a signature.', M + 5, doc.y, { width: contentW - 10 });
  }

  // --- Detail row helpers ---

  /** Two-column detail row (label: value | label: value) */
  private detailRow2(
    doc: PDFKit.PDFDocument, x: number, y: number, halfW: number,
    label1: string, val1: string, label2: string, val2: string,
  ) {
    doc.save();
    doc.rect(x, y, halfW, 18).stroke(BRAND.border);
    doc.rect(x + halfW, y, halfW, 18).stroke(BRAND.border);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(`${label1} `, x + 5, y + 4, { continued: true });
    doc.font('Helvetica').text(val1);
    doc.fontSize(8.5).font('Helvetica-Bold')
      .text(`${label2} `, x + halfW + 5, y + 4, { continued: true });
    doc.font('Helvetica').text(val2);
    doc.restore();
    doc.y = y + 18;
  }

  /** Single full-width detail row (label: value) */
  private detailRow1(doc: PDFKit.PDFDocument, x: number, y: number, fullW: number, label: string, val: string) {
    doc.save();
    doc.rect(x, y, fullW, 18).stroke(BRAND.border);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND.black)
      .text(`${label} `, x + 5, y + 4, { continued: true });
    doc.font('Helvetica').text(val);
    doc.restore();
    doc.y = y + 18;
  }
}

// =====================================================================
// Utility functions
// =====================================================================

function fmtMoneyOrDash(amount: number): string {
  if (!amount || amount === 0) return '-';
  return String(amount);
}

function fmtDate(d: Date | null): string {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
}

/**
 * Convert a number to Indian English words for the AMOUNT IN WORDS line.
 * Handles up to crores (sufficient for any individual payslip).
 */
function numberToWords(n: number): string {
  if (n === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function belowHundred(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }

  function belowThousand(num: number): string {
    if (num < 100) return belowHundred(num);
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + belowHundred(num % 100) : '');
  }

  const amt = Math.floor(Math.abs(n));
  if (amt === 0) return 'Zero';

  const crore = Math.floor(amt / 10000000);
  const lakh = Math.floor((amt % 10000000) / 100000);
  const thousand = Math.floor((amt % 100000) / 1000);
  const remainder = amt % 1000;

  const parts: string[] = [];
  if (crore) parts.push(belowThousand(crore) + ' Crore');
  if (lakh) parts.push(belowThousand(lakh) + ' Lakh');
  if (thousand) parts.push(belowThousand(thousand) + ' Thousand');
  if (remainder) parts.push(belowThousand(remainder));

  return parts.join(' ');
}
