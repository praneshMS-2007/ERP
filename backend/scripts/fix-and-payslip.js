const http = require('http');
const BASE = 'http://localhost:5000';
const EMP_ID = '14b76c2a-bf38-4e1e-9de6-810c91ae55d7';

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const loginRes = await api('POST', '/api/auth/login', { email: 'admin@shuroq.com', password: 'password123' });
  const token = loginRes.body.token;

  // Create payroll for July 2026 (different period)
  console.log('Creating payroll for July 2026...');
  const prRes = await api('POST', '/api/hrm/payrolls', {
    employeeId: EMP_ID,
    payPeriod: 'July 2026',
    baseSalary: 3000,
    hra: 800,
    specialAllowance: 500,
    bonus: 0,
    tds: 0,
    providentFund: 0,
    professionalTax: 0,
    lossOfPay: 0,
    netPay: 4300,
    totalDaysInMonth: 31,
    workingDaysInMonth: 23,
    leavesTaken: 2,
    effectiveWorkDays: 21,
  }, token);
  console.log('  Payroll:', prRes.status, JSON.stringify(prRes.body).substring(0, 200));

  if (prRes.status !== 201 && prRes.status !== 200) { console.log('Failed.'); return; }

  // Mark PAID
  console.log('\nMarking as PAID (auto-sends payslip email)...');
  const paidRes = await api('PUT', `/api/hrm/payrolls/${prRes.body.id}/status`, { status: 'PAID' }, token);
  console.log('  Status:', paidRes.status);

  if (paidRes.body?.payslip) {
    console.log('\n=== Payslip Result ===');
    console.log('  Document ID:', paidRes.body.payslip.documentId);
    console.log('  File URL:', paidRes.body.payslip.fileUrl);
    console.log('  Emailed:', paidRes.body.payslip.emailed);
    if (paidRes.body.payslip.error) console.log('  Error:', paidRes.body.payslip.error);
  } else {
    console.log('  Full response:', JSON.stringify(paidRes.body).substring(0, 400));
  }

  console.log('\n=== Check pranesh3122007@gmail.com for the payslip ===');
})();
