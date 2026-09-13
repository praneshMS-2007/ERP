const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DOWNLOADS_DIR = 'C:\\Users\\Pranesh\\Downloads';

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
  white: '#ffffff',
  black: '#000000',
  grey: '#434343',
  linkBlue: '#1155cc',
};

const ASSET_PATHS = {
  logo: path.join(__dirname, '..', 'assets', 'brand', 'shuroq-logo.png'),
};

function formatDateDMY(d) {
  if (!d) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function monthsBetween(start, end) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, months);
}

function parseSegments(body, boldPhrases = []) {
  if (!boldPhrases || boldPhrases.length === 0) {
    return [{ text: body, bold: false }];
  }
  const ranges = [];
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
  const nonOverlapping = [];
  let lastEnd = 0;
  for (const r of ranges) {
    if (r.start >= lastEnd) {
      nonOverlapping.push(r);
      lastEnd = r.end;
    }
  }
  const segments = [];
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

function placeLogoCentered(doc, pageW, M) {
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

function clauseClean(doc, M, textW, heading, body, boldPhrases = [], gapAfterPt) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.black)
    .text(heading, M, doc.y, { width: textW, align: 'left' });
  doc.moveDown(0.3);

  const segments = parseSegments(body, boldPhrases);
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

function measureClauseHeight(doc, textW, heading, body) {
  doc.font('Helvetica-Bold').fontSize(12);
  const headingH = doc.heightOfString(heading, { width: textW, align: 'left' });
  doc.font('Helvetica').fontSize(10.5);
  const bodyH = doc.heightOfString(body, { width: textW, align: 'left', lineGap: 1.5 });
  return headingH + 4 + bodyH;
}

function computeFillGap(doc, textW, clauses) {
  const startY = doc.y;
  let natural = 0;
  for (const c of clauses) natural += measureClauseHeight(doc, textW, c.heading, c.body);
  doc.y = startY;
  const available = doc.page.height - doc.page.margins.bottom - startY;
  const extra = (available - natural) / clauses.length;
  return Math.max(14, extra);
}

function acceptanceBlock(doc, M, textW, candidateName) {
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

// ==========================================
// 1. INTERNSHIP OFFER LETTER (Clean Style)
// ==========================================
function renderInternshipOfferLetter(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 72;
    const textW = W - 2 * M;

    placeLogoCentered(doc, W, M);

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
    doc.font('Helvetica').text(formatDateDMY(new Date()));
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

    const endDate = d.engagementEndDate || d.endDate;
    const months = endDate ? monthsBetween(d.startDate, endDate) : null;
    const durationLine = months !== null ? `Duration: ${months} month${months === 1 ? '' : 's'}\n` : '';
    const endDateLine = endDate ? `End Date: ${formatDateDMY(endDate)}\n` : '';

    const detailsBody =
      `Start Date: ${formatDateDMY(d.startDate)}\n` +
      endDateLine +
      durationLine +
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
    const fillGap = computeFillGap(doc, textW, page1Clauses);

    clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);

    doc.addPage();

    clauseClean(doc, M, textW, '6. Confidentiality & Non-Disclosure (NDA)',
      `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation shall survive the completion or termination of the internship.`, [], fillGap);

    clauseClean(doc, M, textW, '7. Intellectual Property Ownership',
      `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during the internship shall be the sole intellectual property of ${COMPANY.name}. You irrevocably assign all rights, title, and interest in such work to ${COMPANY.name}.`, [], fillGap);

    clauseClean(doc, M, textW, '8. Completion & Absorption',
      'Upon successful completion, a Training / Internship Completion Certificate will be issued. Completion does not guarantee employment.', [], fillGap);

    clauseClean(doc, M, textW, '9. Governing Law',
      'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

    acceptanceBlock(doc, M, textW, d.candidateName);
    doc.end();
  });
}

// ==========================================
// 2. PART-TIME OFFER LETTER (Clean Style)
// ==========================================
function renderPartTimeOfferLetter(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 72;
    const textW = W - 2 * M;

    placeLogoCentered(doc, W, M);

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
    doc.font('Helvetica').text(formatDateDMY(new Date()));
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
      `Start Date: ${formatDateDMY(d.startDate)}\n` +
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
    const fillGap = computeFillGap(doc, textW, page1Clauses);

    clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, ['part-time role'], fillGap);
    clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, ['1 month prior written notice'], fillGap);

    doc.addPage();

    clauseClean(doc, M, textW, '6. Confidentiality & Non-Disclosure (NDA)',
      `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information.`, [], 0);
    doc.moveDown(0.6);
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(BRAND.black)
      .text('This offer letter and employment terms are strictly confidential.', M, doc.y, { width: textW, align: 'left', lineGap: 1.5 });
    doc.y += fillGap;

    clauseClean(doc, M, textW, '7. Intellectual Property Ownership',
      `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your engagement shall be the sole intellectual property of ${COMPANY.name}.`, [], fillGap);

    clauseClean(doc, M, textW, '8. Governing Law',
      'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

    acceptanceBlock(doc, M, textW, d.candidateName);
    doc.end();
  });
}

// ==========================================
// 3. FULL-TIME OFFER LETTER (Clean Style)
// ==========================================
function renderFullTimeOfferLetter(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 72;
    const textW = W - 2 * M;

    placeLogoCentered(doc, W, M);

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
    doc.font('Helvetica').text(formatDateDMY(new Date()));
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
      `Start Date: ${formatDateDMY(d.startDate)}\n` +
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
    const fillGap = computeFillGap(doc, textW, page1Clauses);

    clauseClean(doc, M, textW, page1Clauses[0].heading, page1Clauses[0].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[1].heading, page1Clauses[1].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[2].heading, page1Clauses[2].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[3].heading, page1Clauses[3].body, [], fillGap);
    clauseClean(doc, M, textW, page1Clauses[4].heading, page1Clauses[4].body, [], fillGap);

    doc.addPage();

    clauseClean(doc, M, textW, '6. Notice Period / Termination',
      'Either party may terminate this engagement by providing one month\u2019s prior written notice. The company may terminate without notice in cases of misconduct or breach of company policy.', [], fillGap);

    clauseClean(doc, M, textW, '7. Confidentiality & Non-Disclosure (NDA)',
      `You may have access to confidential, proprietary, technical, business, or client information of ${COMPANY.name}. You agree to maintain strict confidentiality and not disclose or misuse such information. This obligation survives the termination of your employment.`, [], fillGap);

    clauseClean(doc, M, textW, '8. Intellectual Property Ownership',
      `All work products, source code, designs, documents, inventions, discoveries, improvements, processes, or materials created or contributed to by you during your employment shall be the sole intellectual property of ${COMPANY.name}.`, [], fillGap);

    clauseClean(doc, M, textW, '9. Governing Law',
      'This offer letter shall be governed by and construed in accordance with the laws of India.', [], fillGap);

    acceptanceBlock(doc, M, textW, d.candidateName);
    doc.end();
  });
}

function saveWithRetry(basePath, buf) {
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);

  let target = basePath;
  let counter = 1;

  while (true) {
    try {
      fs.writeFileSync(target, buf);
      console.log(`✓ Saved: ${target} (${buf.length} bytes)`);
      return target;
    } catch (err) {
      if (err.code === 'EBUSY') {
        counter++;
        target = path.join(dir, `${name}_v${counter}${ext}`);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log('Generating clean Offer Letter templates (Intern, Part-Time, Full-Time) with Employment Details (Start Date, Mode, Stipend)...');

  const TEMPLATE_DIR = 'D:\\sample template';
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }

  const samples = [
    // 1. Internship Offer Letters (with Start Date, End Date, Duration, Mode, Stipend)
    {
      fileName: 'Shuroq_Sample_Offer_Letter_Internship_Yogita.pdf',
      renderer: renderInternshipOfferLetter,
      data: {
        candidateName: 'Yogita',
        roleTitle: 'Data Analyst',
        department: 'software',
        startDate: new Date('2026-06-15'),
        engagementEndDate: new Date('2026-10-14'),
        hasStipend: false,
        stipendAmount: null,
        mode: 'Remote',
      },
    },
    {
      fileName: 'Shuroq_Sample_Offer_Letter_Internship_Yogita_WITH_STIPEND.pdf',
      renderer: renderInternshipOfferLetter,
      data: {
        candidateName: 'Yogita',
        roleTitle: 'Data Analyst',
        department: 'software',
        startDate: new Date('2026-06-15'),
        engagementEndDate: new Date('2026-10-14'),
        hasStipend: true,
        stipendAmount: 15000,
        mode: 'Remote',
      },
    },
    {
      fileName: 'Shuroq_Sample_Offer_Letter_Intern_WITH_STIPEND.pdf',
      renderer: renderInternshipOfferLetter,
      data: {
        candidateName: 'Rahul Sharma',
        roleTitle: 'Software Engineering',
        department: 'Engineering',
        startDate: new Date('2026-10-01'),
        engagementEndDate: new Date('2027-01-31'),
        hasStipend: true,
        stipendAmount: 15000,
        mode: 'Remote',
      },
    },
    {
      fileName: 'Shuroq_Sample_Offer_Letter_Intern_NO_STIPEND.pdf',
      renderer: renderInternshipOfferLetter,
      data: {
        candidateName: 'Ananya Verma',
        roleTitle: 'Full Stack Developer',
        department: 'Engineering',
        startDate: new Date('2026-10-01'),
        engagementEndDate: new Date('2026-12-31'),
        hasStipend: false,
        stipendAmount: 0,
        mode: 'Remote',
      },
    },

    // 2. Part-Time Offer Letter
    {
      fileName: 'Shuroq_Sample_Offer_Letter_PartTime_WITH_STIPEND.pdf',
      renderer: renderPartTimeOfferLetter,
      data: {
        candidateName: 'Karthik Raja',
        roleTitle: 'Frontend Engineer',
        department: 'Engineering',
        startDate: new Date('2026-10-01'),
        hasStipend: true,
        stipendAmount: 20000,
        mode: 'Hybrid',
      },
    },
    {
      fileName: 'Shuroq_Sample_Offer_Letter_PartTime_NO_STIPEND.pdf',
      renderer: renderPartTimeOfferLetter,
      data: {
        candidateName: 'Sneha Patel',
        roleTitle: 'Technical Support Associate',
        department: 'Operations',
        startDate: new Date('2026-10-01'),
        hasStipend: false,
        stipendAmount: 0,
        mode: 'Hybrid',
      },
    },

    // 3. Full-Time Offer Letter
    {
      fileName: 'Shuroq_Sample_Offer_Letter_FullTime_WITH_STIPEND.pdf',
      renderer: renderFullTimeOfferLetter,
      data: {
        candidateName: 'Vikram Aditya',
        roleTitle: 'Senior Software Engineer',
        department: 'Engineering',
        startDate: new Date('2026-10-01'),
        hasStipend: true,
        stipendAmount: 45000,
        mode: 'On-site',
      },
    },
    {
      fileName: 'Shuroq_Sample_Offer_Letter_FullTime_NO_STIPEND.pdf',
      renderer: renderFullTimeOfferLetter,
      data: {
        candidateName: 'Pooja Iyer',
        roleTitle: 'Associate Software Engineer',
        department: 'Engineering',
        startDate: new Date('2026-10-01'),
        hasStipend: false,
        stipendAmount: 0,
        mode: 'On-site',
      },
    },
  ];

  for (const item of samples) {
    const buf = await item.renderer(item.data);
    const destDownloads = path.join(DOWNLOADS_DIR, item.fileName);
    saveWithRetry(destDownloads, buf);
    const destTemplate = path.join(TEMPLATE_DIR, item.fileName);
    saveWithRetry(destTemplate, buf);
  }

  console.log(`\nAll ${samples.length} Offer Letter templates successfully saved to both Downloads and D:\\sample template!`);
}

main().catch(err => {
  console.error('Error generating sample templates:', err);
  process.exit(1);
});
