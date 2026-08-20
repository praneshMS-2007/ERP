/**
 * Quick test: Generate a payslip and offer letters with the fixed colors,
 * then analyze the generated PDF to verify colors match the originals.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE = 'http://localhost:5000';

function api(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function extractColors(pdfBuffer) {
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
  
  const colors = new Set();
  for (const s of streams) {
    let m;
    const rgx = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/g;
    while ((m = rgx.exec(s)) !== null) {
      const r = parseFloat(m[1]), g = parseFloat(m[2]), b = parseFloat(m[3]);
      const hex = '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
      colors.add(hex);
    }
  }
  return [...colors];
}

async function main() {
  // Login
  const login = await api('POST', '/api/auth/login', { email: 'admin@shuroq.com', password: 'password123' });
  if (login.status !== 201 || !login.data.token) {
    console.error('Login failed:', login.status, login.data);
    return;
  }
  const token = login.data.token;
  console.log('✅ Logged in');
  
  // List existing employees to find one we can use for testing
  const empList = await api('GET', '/api/hrm/employees?limit=5', null, token);
  if (empList.status !== 200) {
    console.error('Failed to list employees:', empList.status);
    return;
  }
  
  const employees = empList.data.data || empList.data;
  console.log(`Found ${employees.length} employees`);
  
  // Check for recently generated PDFs to verify colors
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  // Check payslips
  const payslipDir = path.join(uploadsDir, 'payslips');
  if (fs.existsSync(payslipDir)) {
    const payslips = fs.readdirSync(payslipDir).filter(f => f.endsWith('.pdf'));
    if (payslips.length > 0) {
      const latest = payslips.sort().pop();
      console.log(`\nAnalyzing existing payslip: ${latest}`);
      const buf = fs.readFileSync(path.join(payslipDir, latest));
      const colors = extractColors(buf);
      console.log('Colors in generated payslip:', colors.join(', '));
      
      // Check for expected colors
      const expected = {
        '#efefef': 'EMPLOYEE DETAILS / ATTENDENCE RECORD header (gray)',
        '#cfe2f3': 'NET SALARY PAYABLE row (light blue)',
        '#1f1f1f': 'Text color (near-black)',
      };
      const unexpected = {
        '#4a86c8': 'OLD blue header (should be removed)',
        '#d6e4f0': 'OLD light blue (should be removed)',
      };
      
      console.log('\n  Expected colors:');
      for (const [hex, desc] of Object.entries(expected)) {
        const found = colors.includes(hex);
        console.log(`    ${found ? '✅' : '❌'} ${hex} — ${desc}`);
      }
      console.log('\n  Should NOT be present:');
      for (const [hex, desc] of Object.entries(unexpected)) {
        const found = colors.includes(hex);
        console.log(`    ${found ? '❌ STILL PRESENT' : '✅ Removed'} ${hex} — ${desc}`);
      }
    }
  }
  
  // Check offer letters
  const olDir = path.join(uploadsDir, 'offer-letters');
  if (fs.existsSync(olDir)) {
    const letters = fs.readdirSync(olDir).filter(f => f.endsWith('.pdf'));
    if (letters.length > 0) {
      const latest = letters.sort().pop();
      console.log(`\nAnalyzing existing offer letter: ${latest}`);
      const buf = fs.readFileSync(path.join(olDir, latest));
      const colors = extractColors(buf);
      console.log('Colors in generated offer letter:', colors.join(', '));
      
      const expected = {
        '#434343': 'Address line text (dark gray)',
        '#1155cc': 'Website URL (hyperlink blue)',
      };
      const unexpected = {
        '#333333': 'OLD address color (should be #434343)',
        '#666666': 'OLD grey (should be #434343)',
      };
      
      console.log('\n  Expected colors:');
      for (const [hex, desc] of Object.entries(expected)) {
        const found = colors.includes(hex);
        console.log(`    ${found ? '✅' : '❌'} ${hex} — ${desc}`);
      }
      console.log('\n  Should NOT be present:');
      for (const [hex, desc] of Object.entries(unexpected)) {
        const found = colors.includes(hex);
        console.log(`    ${found ? '❌ STILL PRESENT' : '✅ Removed'} ${hex} — ${desc}`);
      }
    }
  }
  
  console.log('\n\nNOTE: The PDFs above are from BEFORE the fix.');
  console.log('To generate NEW PDFs with the fix, restart the backend and create a new employee or payroll.');
  console.log('The color changes will take effect on next PDF generation.');
}

main().catch(console.error);
