/**
 * Check what #1155cc is used for in the intern offer letter
 * (it's Google Docs' default link/heading blue color)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REF_DIR = 'D:\\shuroq\\ERP Overall\\offer letters and payslip';

function decompressStreams(pdfBuffer) {
  const content = pdfBuffer.toString('binary');
  const streams = [];
  let pos = 0;
  while (true) {
    const s1 = content.indexOf('stream\r\n', pos);
    const s2 = content.indexOf('stream\n', pos);
    let actualStart = -1, offset = 0;
    if (s1 === -1 && s2 === -1) break;
    if (s1 === -1) { actualStart = s2; offset = 7; }
    else if (s2 === -1) { actualStart = s1; offset = 8; }
    else { actualStart = Math.min(s1, s2); offset = (actualStart === s1) ? 8 : 7; }
    const dataStart = actualStart + offset;
    const endStream = content.indexOf('endstream', dataStart);
    if (endStream === -1) break;
    const raw = Buffer.from(content.substring(dataStart, endStream), 'binary');
    try { streams.push(zlib.inflateSync(raw).toString('latin1')); } catch { streams.push(raw.toString('latin1')); }
    pos = endStream + 9;
  }
  return streams;
}

// Intern offer letter - find where #1155cc is used
const internBuf = fs.readFileSync(path.join(REF_DIR, 'Pala lova kishore intenship offer letter - Google Docs.pdf'));
const internStreams = decompressStreams(internBuf);

console.log('=== INTERN OFFER LETTER - #1155cc (0.06667 0.33333 0.8) CONTEXT ===\n');

for (let si = 0; si < internStreams.length; si++) {
  const s = internStreams[si];
  const lines = s.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    // Look for the blue color
    if (l.includes('0.06667') || l.includes('0.33333') || l.includes('1155cc')) {
      // Show context: 5 lines before and 10 after
      console.log(`\nStream ${si}, line ${i}:`);
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 10); j++) {
        const marker = j === i ? '>>>' : '   ';
        console.log(`  ${marker} [${j}] ${lines[j].trim().substring(0, 120)}`);
      }
    }
  }
}

// Part-time offer letter - same check
console.log('\n\n=== PART-TIME OFFER LETTER - #1155cc and #434343 CONTEXT ===\n');
const ptBuf = fs.readFileSync(path.join(REF_DIR, 'Aarif part time OFFER LETTER - Google Docs.pdf'));
const ptStreams = decompressStreams(ptBuf);

for (let si = 0; si < ptStreams.length; si++) {
  const s = ptStreams[si];
  const lines = s.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.includes('0.06667') || l.includes('0.33333') || l.includes('0.26275') || l.includes('434343')) {
      console.log(`\nStream ${si}, line ${i}:`);
      for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 10); j++) {
        const marker = j === i ? '>>>' : '   ';
        console.log(`  ${marker} [${j}] ${lines[j].trim().substring(0, 120)}`);
      }
    }
  }
}

// Also check exact coordinates on the payslip for rectangle colors
console.log('\n\n=== PAYSLIP - DETAILED CONTEXT AROUND RECTANGLES ===\n');
const payslipBuf = fs.readFileSync(path.join(REF_DIR, 'Shoab  May payslip - Google Sheets.pdf'));
const payslipStreams = decompressStreams(payslipBuf);

for (let si = 0; si < payslipStreams.length; si++) {
  const s = payslipStreams[si];
  if (!s.includes('re')) continue;
  
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.endsWith(' re')) {
      // Show 5 lines before to see what color was set
      console.log(`\nStream ${si}, rect at line ${i}:`);
      for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 3); j++) {
        const marker = j === i ? '>>>' : '   ';
        console.log(`  ${marker} [${j}] ${lines[j].trim().substring(0, 120)}`);
      }
    }
  }
}
