/**
 * Generate a sample branded payslip for visual verification.
 * Run: node scripts/test-branded-payslip.js
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'brand');
const OUT = path.join(__dirname, '..', 'uploads', 'test-branded-payslip.pdf');

const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  white: '#ffffff',
  black: '#000000',
  lightGrey: '#f5f5f5',
};

const ASSET_PATHS = {
  logo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
  seal: path.join(ASSETS_DIR, 'company-seal.png'),
};

function fmtMoney(amount) {
  return `Rs. ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function detailRow(doc, x, y, label, value) {
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND.black).text(`${label}: `, x, y, { continued: true });
  doc.font('Helvetica').text(value);
}

function tableHeader(doc, x, width, title) {
  const y = doc.y;
  doc.save();
  doc.rect(x, y, width, 22).fill(BRAND.accentBlue);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.white)
    .text(title, x + 10, y + 5, { width: width - 20 });
  doc.restore();
  doc.y = y + 24;
}

function tableRow(doc, x, width, label, value) {
  const y = doc.y;
  doc.save();
  doc.rect(x, y, width, 18).fill(BRAND.lightGrey);
  doc.fontSize(9.5).font('Helvetica').fillColor(BRAND.black)
    .text(label, x + 10, y + 3, { width: width / 2 - 10 });
  doc.text(value, x + width / 2, y + 3, { width: width / 2 - 10, align: 'right' });
  doc.restore();
  doc.y = y + 19;
}

function tableRowBold(doc, x, width, label, value) {
  const y = doc.y;
  doc.save();
  doc.rect(x, y, width, 20).fill('#e0e7ef');
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
    .text(label, x + 10, y + 4, { width: width / 2 - 10 });
  doc.text(value, x + width / 2, y + 4, { width: width / 2 - 10, align: 'right' });
  doc.restore();
  doc.y = y + 22;
}

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;
const H = doc.page.height;
const M = 50;
const contentW = W - 2 * M;

// Blue stripes
doc.save();
doc.moveTo(W * 0.65, 0).lineTo(W, 0).lineTo(W, H * 0.28).closePath().fill(BRAND.darkBlue);
doc.restore();
doc.save();
doc.moveTo(0, H * 0.92).lineTo(W * 0.40, H).lineTo(0, H).closePath().fill(BRAND.darkBlue);
doc.restore();

// Logo
if (fs.existsSync(ASSET_PATHS.logo)) {
  doc.image(ASSET_PATHS.logo, M, 30, { width: 140 });
}
// Seal
if (fs.existsSync(ASSET_PATHS.seal)) {
  doc.image(ASSET_PATHS.seal, W - M - 100, 55, { width: 100 });
}

// Title
doc.y = 160;
doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
  .text('PAYSLIP \u2014 May 2026', M, doc.y, { align: 'center' });
doc.moveDown(1.2);

// Employee details
const detailY = doc.y;
detailRow(doc, M, detailY, 'Employee Name', 'Shoab Ahmed');
detailRow(doc, W / 2 + 10, detailY, 'Employee ID', 'SHQ-001');
detailRow(doc, M, detailY + 18, 'Designation', 'Full Stack Developer');
detailRow(doc, W / 2 + 10, detailY + 18, 'Department', 'Engineering');
detailRow(doc, M, detailY + 36, 'PAN Number', 'ABCPD1234E');
detailRow(doc, W / 2 + 10, detailY + 36, 'Bank Account No.', '1234567890');
detailRow(doc, M, detailY + 54, 'Bank IFSC', 'SBIN0001234');
detailRow(doc, W / 2 + 10, detailY + 54, 'Payment Date', '31-05-26');
doc.y = detailY + 80;

// Earnings
doc.moveDown(0.5);
tableHeader(doc, M, contentW, 'EARNINGS');
tableRow(doc, M, contentW, 'Basic Salary', fmtMoney(5000));
tableRow(doc, M, contentW, 'HRA', fmtMoney(800));
tableRow(doc, M, contentW, 'Special Allowance', fmtMoney(500));
tableRow(doc, M, contentW, 'Bonus', fmtMoney(0));
tableRowBold(doc, M, contentW, 'Gross Total', fmtMoney(6300));
doc.moveDown(0.8);

// Deductions
tableHeader(doc, M, contentW, 'DEDUCTIONS');
tableRow(doc, M, contentW, 'TDS (Income Tax)', fmtMoney(0));
tableRow(doc, M, contentW, 'Provident Fund (PF)', fmtMoney(0));
tableRow(doc, M, contentW, 'Professional Tax', fmtMoney(0));
tableRow(doc, M, contentW, 'Loss of Pay', fmtMoney(0));
tableRowBold(doc, M, contentW, 'Total Deductions', fmtMoney(0));
doc.moveDown(1);

// Net Pay bar
const netY = doc.y;
doc.save();
doc.rect(M, netY, contentW, 28).fill(BRAND.darkBlue);
doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND.white)
  .text('NET PAY: Rs. 6,300', M + 10, netY + 7, { width: contentW - 20, align: 'right' });
doc.restore();
doc.y = netY + 40;

// Attendance
doc.moveDown(0.5);
tableHeader(doc, M, contentW, 'ATTENDANCE');
tableRow(doc, M, contentW, 'Total Days in Month', '31');
tableRow(doc, M, contentW, 'Working Days', '22');
tableRow(doc, M, contentW, 'Leaves Taken', '0');
tableRowBold(doc, M, contentW, 'Effective Work Days', '22');

// Footer
doc.moveDown(2);
doc.fontSize(8).fillColor('#888').font('Helvetica-Oblique')
  .text('This is a computer-generated payslip and does not require a signature.', M, doc.y, { align: 'center', width: contentW });

doc.end();
console.log('✓ Test payslip generated at:', OUT);
