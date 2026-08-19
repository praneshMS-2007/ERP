/**
 * Generate all 3 test PDFs for visual verification:
 * 1. Internship confirmation letter (branded, WhatsApp style)
 * 2. Part-time offer letter (clean, Aarif style)
 * 3. Payslip (tabular, Shoab style)
 *
 * Run: node scripts/test-all-templates.js
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'brand');
const UPLOADS = path.join(__dirname, '..', 'uploads');

const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  headerBg: '#4a86c8',
  white: '#ffffff',
  black: '#000000',
  lightBlue: '#d6e4f0',
  border: '#000000',
};

const ASSETS = {
  logo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
  seal: path.join(ASSETS_DIR, 'company-seal.png'),
  signature: path.join(ASSETS_DIR, 'authorized-signature.png'),
  msme: path.join(ASSETS_DIR, 'msme-logo.png'),
};

function img(doc, p, x, y, w) {
  if (fs.existsSync(p)) doc.image(p, x, y, { width: w });
}

function bullet(doc, M, W, text) {
  const y = doc.y;
  doc.fontSize(10).font('Helvetica').fillColor(BRAND.black);
  doc.text('\u2022', M + 12, y);
  doc.text(text, M + 25, y, { width: W - M - 25 - 50 });
}

// =====================================================
// 1. INTERNSHIP CONFIRMATION LETTER (branded)
// =====================================================
function buildConfirmation() {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const out = path.join(UPLOADS, 'test-intern-confirmation.pdf');
  doc.pipe(fs.createWriteStream(out));
  const W = doc.page.width, H = doc.page.height, M = 50;

  // Blue stripes
  doc.save(); doc.moveTo(W*0.65,0).lineTo(W,0).lineTo(W,H*0.28).closePath().fill(BRAND.darkBlue); doc.restore();
  doc.save(); doc.moveTo(0,H*0.92).lineTo(W*0.40,H).lineTo(0,H).closePath().fill(BRAND.darkBlue); doc.restore();

  img(doc, ASSETS.logo, M, 30, 140);
  img(doc, ASSETS.seal, W-M-100, 55, 100);

  doc.y = 160;
  doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND.darkBlue)
    .text('INTERNSHIP CONFIRMATION LETTER', M, doc.y, { align:'center', width: W-2*M });
  doc.moveDown(1.2);

  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black).text('Date: 09-05-26', M);
  doc.moveDown(0.3);
  doc.text('Dear P kavitha ,', M);
  doc.moveDown(0.8);

  doc.fontSize(10.5).font('Helvetica').text('We are pleased to offer you the position of ', M, doc.y, { continued: true, width: W-2*M });
  doc.font('Helvetica-Bold').text('Full Stack Developer Intern', { continued: true });
  doc.font('Helvetica').text(' at Shuroq. This internship involves working on internal projects and assigned tasks, allowing you to build practical skills through active participation and guided execution', { width: W-2*M });
  doc.moveDown(1);

  doc.fontSize(10.5).font('Helvetica-Bold').text('Internship Details:', M);
  doc.text('Start Date: 11-05-26', M);
  doc.text('End Date  : 10-08-26', M);
  doc.text('Mode: Remote', M);
  doc.moveDown(0.8);

  doc.fontSize(10.5).font('Helvetica-Bold').text('Program Overview:', M);
  doc.font('Helvetica').fontSize(10);
  bullet(doc, M, W, 'Work on real internal projects and task-based assignments');
  bullet(doc, M, W, 'Collaborate with team members and follow structured guidance');
  bullet(doc, M, W, 'Develop practical understanding through execution of assigned work');
  doc.moveDown(0.8);

  doc.fontSize(10.5).font('Helvetica-Bold').text('Important Terms:', M);
  doc.font('Helvetica').fontSize(10);
  bullet(doc, M, W, 'This internship is not an employment opportunity');
  bullet(doc, M, W, 'No salary, stipend, or job guarantee is associated with this program');
  bullet(doc, M, W, 'Continuation in the program depends on participation, performance, and adherence to guidelines');
  doc.moveDown(0.8);

  doc.fontSize(10.5).font('Helvetica-Bold').text('Completion & Recognition:', M);
  doc.font('Helvetica').fontSize(10);
  bullet(doc, M, W, 'Successful completion requires fulfilling assigned tasks and evaluation criteria');
  bullet(doc, M, W, 'A Certificate of Completion will be issued After 3 month based on performance');
  bullet(doc, M, W, 'We look forward to your participation and contribution.');
  doc.moveDown(1.2);

  doc.fontSize(13).font('Helvetica-BoldOblique').fillColor(BRAND.darkBlue).text('Welcome to Shuroq Technologies.', M);
  doc.text('Best Regards,', M);
  doc.moveDown(0.3);

  img(doc, ASSETS.signature, M, doc.y, 130);
  img(doc, ASSETS.msme, W-M-130, H-190, 130);

  doc.end();
  console.log('1. Intern confirmation letter:', out);
}

// =====================================================
// 2. PART-TIME OFFER LETTER (clean)
// =====================================================
function buildPartTime() {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const out = path.join(UPLOADS, 'test-parttime-offer.pdf');
  doc.pipe(fs.createWriteStream(out));
  const W = doc.page.width, M = 50, tw = W - 2*M;

  // Centered logo
  if (fs.existsSync(ASSETS.logo)) {
    doc.image(ASSETS.logo, (W-140)/2, 30, { width: 140 });
    doc.y = 100;
  }

  doc.fontSize(9).font('Helvetica').fillColor('#333').text('Hyderabad, Telangana, India', M, doc.y, { width: tw });
  doc.text('Email: hr-team@shuroq.com | Website: www.shuroq.com', M, doc.y, { width: tw });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND.black)
    .text('DEVOPS ENGINEER (PART TIME) \u2014 OFFER LETTER', M, doc.y, { align:'center', width: tw });
  doc.moveDown(1.2);

  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
    .text('Date: ', M, doc.y, { continued: true });
  doc.font('Helvetica').text('01/07/2026');
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text('Candidate Name: ', M, doc.y, { continued: true });
  doc.font('Helvetica').text('Muhammad Aarif');
  doc.moveDown(0.5);

  doc.fontSize(10.5).font('Helvetica').text('We are pleased to offer you the position of ', M, doc.y, { continued: true, width: tw, align:'justify' });
  doc.font('Helvetica-Bold').text('DevOps Engineer (Part Time)', { continued: true });
  doc.font('Helvetica').text(' at Shuroq under the following terms and conditions:', { width: tw, align:'justify' });
  doc.moveDown(1);

  function clause(heading, body) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black).text(heading, M, doc.y, { width: tw });
    doc.moveDown(0.3);
    doc.fontSize(10.5).font('Helvetica').text(body, M, doc.y, { width: tw, align:'justify' });
    doc.moveDown(0.9);
  }

  clause('1. Employment Start Date', 'Start Date: 01/07/2026');
  clause('2. Nature of Engagement', 'This engagement is a part-time role focused on supporting technical tasks, system operations, and project-related activities as assigned by the company.');
  clause('3. Role Scope', 'You will perform assigned system engineering tasks and provide technical support under guidance from the team.');
  clause('4. Compensation', 'You will receive a monthly salary of Rs. 3,000.');
  clause('5. Statutory Benefits', 'Provident Fund (PF), ESI, leave, bonus, gratuity, insurance, or any other employee benefits are not applicable for this part-time engagement.');
  clause('6. Notice Period / Termination', 'Either party may terminate this engagement by providing 1 month prior written notice.');

  doc.fontSize(12).font('Helvetica-Bold').text('7. Confidentiality & Non-Disclosure (NDA)', M, doc.y, { width: tw });
  doc.moveDown(0.3);
  doc.fontSize(10.5).font('Helvetica').text('You may have access to confidential, proprietary, technical, business, or client information of Shuroq. You agree to maintain strict confidentiality and not disclose or misuse such information.', M, doc.y, { width: tw, align:'justify' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text('This offer letter and employment terms are strictly confidential.', M, doc.y, { width: tw, align:'justify' });
  doc.moveDown(0.9);

  clause('8. Intellectual Property Ownership', 'All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of Shuroq.');
  clause('9. Governing Law', 'This offer letter shall be governed by and construed in accordance with the laws of India.');

  // Acceptance
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text('Acceptance', M, doc.y, { width: tw });
  doc.moveDown(0.3);
  doc.fontSize(10.5).font('Helvetica').text('I confirm that I have read, understood, and agree to all terms including the Confidentiality and Intellectual Property obligations stated above.', M, doc.y, { width: tw, align:'justify' });
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').text('Name: ', M, doc.y, { continued: true }); doc.font('Helvetica').text('Muhammad Aarif');
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').text('Signature: ________________', M);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').text('Date: ____________________', M);

  doc.end();
  console.log('2. Part-time offer letter:', out);
}

// =====================================================
// 3. PAYSLIP (tabular, Shoab style)
// =====================================================
function buildPayslip() {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const out = path.join(UPLOADS, 'test-payslip.pdf');
  doc.pipe(fs.createWriteStream(out));
  const W = doc.page.width, H = doc.page.height, M = 40, cw = W - 2*M;

  // Outer border
  doc.lineWidth(1).rect(M-5, M-5, cw+10, H-2*M+10).stroke(BRAND.border);

  // Centered logo
  if (fs.existsSync(ASSETS.logo)) {
    doc.image(ASSETS.logo, (W-120)/2, M+5, { width: 120 });
    doc.y = M + 65;
  }

  // Title
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
    .text('PAYSLIP - [MAY, 2026]', M, doc.y, { align:'center', width: cw });
  doc.moveDown(0.8);

  // EMPLOYEE DETAILS header
  const edY = doc.y;
  doc.save();
  doc.rect(M, edY, cw, 20).fill(BRAND.headerBg);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.white)
    .text('EMPLOYEE DETAILS', M, edY+4, { align:'center', width: cw });
  doc.restore();
  doc.y = edY + 22;

  const hW = cw / 2;
  function dr2(l1, v1, l2, v2) {
    const y = doc.y;
    doc.save();
    doc.rect(M, y, hW, 18).stroke(BRAND.border);
    doc.rect(M+hW, y, hW, 18).stroke(BRAND.border);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND.black).text(l1+' ', M+5, y+4, { continued: true }); doc.font('Helvetica').text(v1);
    doc.fontSize(8.5).font('Helvetica-Bold').text(l2+' ', M+hW+5, y+4, { continued: true }); doc.font('Helvetica').text(v2);
    doc.restore();
    doc.y = y + 18;
  }
  function dr1(l, v) {
    const y = doc.y;
    doc.save();
    doc.rect(M, y, cw, 18).stroke(BRAND.border);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(BRAND.black).text(l+' ', M+5, y+4, { continued: true }); doc.font('Helvetica').text(v);
    doc.restore();
    doc.y = y + 18;
  }

  dr2('EMPLOYEE NAME:', 'SYED SHOAB', 'DATE OF JOINING:', '3/16/2026');
  dr2('ROLE:', 'Associate Engineer', 'EMPLOYEE ID:', 'SHR-26-003');
  dr1('PAN NUMBER:', '62301684828');
  dr1('BANK ACCOUNT NO:', 'QCKPS2002C');
  doc.moveDown(0.6);

  // Earnings/Deductions table
  const colW = cw / 2, rH = 18;
  const tableY = doc.y;

  // Headers
  doc.save();
  doc.rect(M, tableY, colW-1, rH).stroke(BRAND.border);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black).text('EARNINGS', M+5, tableY+4, { width: colW-60 });
  doc.rect(M+colW+1, tableY, colW-1, rH).stroke(BRAND.border);
  doc.text('DEDUCTIONS', M+colW+6, tableY+4, { width: colW-60 });
  doc.restore();

  let ty = tableY + rH;
  const earnings = [['Basic Salary', 3000], ['HRA', 0], ['Special Allowance', 0], ['Bonus/Incentives', 0]];
  const deductions = [['Income Tax (TDS)', 0], ['Provident Fund', 0], ['Professional Tax', 0], ['Loss of Pay (LOP)', 0]];

  for (let i = 0; i < 4; i++) {
    doc.save();
    doc.rect(M, ty, colW-1, rH).stroke(BRAND.border);
    doc.fontSize(9).font('Helvetica').fillColor(BRAND.black).text(earnings[i][0], M+5, ty+4, { width: colW-70 });
    doc.text(earnings[i][1] || '-', M+colW-70, ty+4, { width: 60, align:'right' });
    doc.rect(M+colW+1, ty, colW-1, rH).stroke(BRAND.border);
    doc.text(deductions[i][0], M+colW+6, ty+4, { width: colW-70 });
    doc.text(deductions[i][1] || '-', M+colW+colW-70, ty+4, { width: 60, align:'right' });
    doc.restore();
    ty += rH;
  }

  // Totals
  doc.save();
  doc.rect(M, ty, colW-1, rH).stroke(BRAND.border);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black).text('Gross Total (A)', M+5, ty+4, { width: colW-70 });
  doc.text('3000', M+colW-70, ty+4, { width: 60, align:'right' });
  doc.rect(M+colW+1, ty, colW-1, rH).stroke(BRAND.border);
  doc.text('Total Deductions (B)', M+colW+6, ty+4, { width: colW-70 });
  doc.text('0', M+colW+colW-70, ty+4, { width: 60, align:'right' });
  doc.restore();
  ty += rH;
  doc.y = ty + 8;

  // Net salary
  const netY = doc.y;
  doc.save();
  doc.rect(M, netY, cw-65, 20).stroke(BRAND.border);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.black).text('NET SALARY PAYABLE (A - B)', M+5, netY+4);
  doc.rect(M+cw-65, netY, 65, 20).stroke(BRAND.border);
  doc.text('3000', M+cw-65, netY+4, { width: 60, align:'right' });
  doc.restore();
  doc.y = netY + 22;

  // Amount in words
  doc.save();
  doc.rect(M, doc.y, cw, 20).stroke(BRAND.border);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black).text('AMOUNT IN WORDS: Three Thousand Rupees only', M+5, doc.y+4, { width: cw-10 });
  doc.restore();
  doc.y += 28;

  // Attendance
  const attY = doc.y;
  doc.save();
  doc.rect(M, attY, cw*0.45, 18).fill(BRAND.lightBlue).stroke(BRAND.border);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND.black).text('ATTENDENCE RECORD', M+5, attY+4);
  doc.restore();
  doc.y = attY + 20;
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND.black);
  doc.text('TOTAL DAYS IN MONTH: 31', M+5);
  doc.text('EFFECTIVE WORK DAYS: 28', M+5);
  doc.text('TOTAL LEAVES TAKEN: 3', M+5);
  doc.moveDown(1);

  // Declaration
  doc.fontSize(11).font('Helvetica-Bold').text('DECLARATION', M+5);
  doc.moveDown(0.3);
  const declY = doc.y;
  doc.save();
  doc.rect(M, declY, cw, 18).fill(BRAND.lightBlue);
  doc.fontSize(9).font('Helvetica-Oblique').fillColor(BRAND.black)
    .text('This is a computer-generated document and does not require a signature.', M+5, declY+4, { width: cw-10 });
  doc.restore();

  doc.end();
  console.log('3. Payslip:', out);
}

// Run all three
buildConfirmation();
buildPartTime();
buildPayslip();
console.log('\n--- All 3 test PDFs generated! ---');
