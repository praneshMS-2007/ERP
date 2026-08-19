/**
 * Generate a sample branded internship confirmation letter for visual verification.
 * Run: node scripts/test-branded-letter.js
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'brand');
const OUT = path.join(__dirname, '..', 'uploads', 'test-branded-letter.pdf');

const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  white: '#ffffff',
  black: '#000000',
};

const ASSET_PATHS = {
  logo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
  seal: path.join(ASSETS_DIR, 'company-seal.png'),
  signature: path.join(ASSETS_DIR, 'authorized-signature.png'),
  msme: path.join(ASSETS_DIR, 'msme-logo.png'),
};

function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function bullet(doc, M, text) {
  const W = doc.page.width;
  const bulletX = M + 15;
  const textX = M + 30;
  const y = doc.y;
  doc.fontSize(10).font('Helvetica').fillColor(BRAND.black);
  doc.text('\u2022', bulletX, y);
  doc.text(text, textX, y, { width: W - textX - M });
}

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;
const H = doc.page.height;
const M = 50;

// Blue stripe top-right
doc.save();
doc.moveTo(W * 0.65, 0).lineTo(W, 0).lineTo(W, H * 0.28).closePath().fill(BRAND.darkBlue);
doc.restore();

// Blue stripe bottom-left
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
  .text('INTERNSHIP CONFIRMATION LETTER', M, doc.y, { align: 'center' });
doc.moveDown(1.2);

// Date & name
doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
  .text('Date: 09-05-26', M);
doc.moveDown(0.3);
doc.text('Dear P kavitha ,', M);
doc.moveDown(0.8);

// Intro
doc.fontSize(10.5).font('Helvetica').fillColor(BRAND.black)
  .text('We are pleased to offer you the position of ', M, doc.y, { continued: true, width: W - 2 * M });
doc.font('Helvetica-Bold').text('Full Stack Developer Intern', { continued: true });
doc.font('Helvetica').text(
  ' at Shuroq. This internship involves working on internal projects and assigned tasks, allowing you to build practical skills through active participation and guided execution',
  { width: W - 2 * M },
);
doc.moveDown(1);

// Internship Details
doc.fontSize(10.5).font('Helvetica-Bold').text('Internship Details:', M);
doc.text('Start Date: 11-05-26', M);
doc.text('End Date  : 10-08-26', M);
doc.text('Mode: Remote', M);
doc.moveDown(0.8);

// Program Overview
doc.fontSize(10.5).font('Helvetica-Bold').text('Program Overview:', M);
doc.font('Helvetica').fontSize(10);
bullet(doc, M, 'Work on real internal projects and task-based assignments');
bullet(doc, M, 'Collaborate with team members and follow structured guidance');
bullet(doc, M, 'Develop practical understanding through execution of assigned work');
doc.moveDown(0.8);

// Important Terms
doc.fontSize(10.5).font('Helvetica-Bold').text('Important Terms:', M);
doc.font('Helvetica').fontSize(10);
bullet(doc, M, 'This internship is not an employment opportunity');
bullet(doc, M, 'No salary, stipend, or job guarantee is associated with this program');
bullet(doc, M, 'Continuation in the program depends on participation, performance, and adherence to guidelines');
doc.moveDown(0.8);

// Completion & Recognition
doc.fontSize(10.5).font('Helvetica-Bold').text('Completion & Recognition:', M);
doc.font('Helvetica').fontSize(10);
bullet(doc, M, 'Successful completion requires fulfilling assigned tasks and evaluation criteria');
bullet(doc, M, 'A Certificate of Completion will be issued After 3 month based on performance');
bullet(doc, M, 'We look forward to your participation and contribution.');
doc.moveDown(1.2);

// Welcome & Best Regards
doc.fontSize(13).font('Helvetica-BoldOblique').fillColor(BRAND.darkBlue)
  .text('Welcome to Shuroq Technologies.', M);
doc.text('Best Regards,', M);
doc.moveDown(0.3);

// Signature
if (fs.existsSync(ASSET_PATHS.signature)) {
  doc.image(ASSET_PATHS.signature, M, doc.y, { width: 130 });
}

// MSME logo
if (fs.existsSync(ASSET_PATHS.msme)) {
  doc.image(ASSET_PATHS.msme, W - M - 130, H - 190, { width: 130 });
}

doc.end();
console.log('✓ Test letter generated at:', OUT);
