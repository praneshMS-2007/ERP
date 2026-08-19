const http = require('http');
const BASE = 'http://localhost:5000';

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('--- Sending Branded Documents to pranesh3122007@gmail.com ---');

  // 1. Authenticate
  const loginRes = await api('POST', '/api/auth/login', { email: 'admin@shuroq.com', password: 'password123' });
  const token = loginRes.body.token;
  console.log('✓ Logged in as Admin');

  // 2. Fetch or create employee with pranesh3122007@gmail.com
  const listRes = await api('GET', '/api/hrm/employees', null, token);
  const employees = listRes.body.data || listRes.body;
  let emp = Array.isArray(employees) ? employees.find(e => e.personalEmail === 'pranesh3122007@gmail.com') : null;

  if (!emp) {
    console.log('Creating employee for Pranesh...');
    const createRes = await api('POST', '/api/hrm/employees', {
      firstName: 'Pranesh',
      lastName: 'Kumar',
      personalEmail: 'pranesh3122007@gmail.com',
      phone: '+91-9876543210',
      empType: 'FULL_TIME',
      department: 'Engineering',
      designation: 'Lead Full Stack Architect',
      username: 'pranesh.architect',
      password: 'SecurePass@2026',
      joinDate: new Date().toISOString(),
      pan: 'ABCPD1234E',
      bankAccountNo: '987654321012',
      bankIfsc: 'HDFC0001234',
    }, token);
    emp = createRes.body;
    console.log('✓ Created Employee:', emp.id, emp.firstName);
  } else {
    console.log('✓ Found Employee:', emp.id, emp.firstName, emp.lastName);
    // Ensure PAN & Bank Account are set
    await api('PUT', `/api/hrm/employees/${emp.id}`, {
      pan: 'ABCPD1234E',
      bankAccountNo: '987654321012',
      bankIfsc: 'HDFC0001234',
    }, token);
  }

  // 3. Issue and send branded Offer Letter directly using OfferLetterService via HRM module
  console.log('\n1. Generating & Emailing Branded Offer Letter...');
  const offerRes = await api('POST', `/api/hrm/employees/${emp.id}/offer-letter`, {}, token);
  console.log('Offer Letter status:', offerRes.status, JSON.stringify(offerRes.body));

  // 4. Create and send October 2026 Branded Payslip
  const period = `October 2026 - ${Date.now().toString().slice(-4)}`;
  console.log(`\n2. Generating & Emailing Branded Payslip for "${period}"...`);
  const prRes = await api('POST', '/api/hrm/payrolls', {
    employeeId: emp.id,
    payPeriod: period,
    baseSalary: 120000,
    hra: 40000,
    specialAllowance: 25000,
    bonus: 15000,
    tds: 12000,
    providentFund: 3600,
    professionalTax: 200,
    lossOfPay: 0,
    netPay: 184200,
    totalDaysInMonth: 31,
    workingDaysInMonth: 22,
    leavesTaken: 0,
    effectiveWorkDays: 22,
  }, token);

  if (prRes.status === 200 || prRes.status === 201) {
    const payrollId = prRes.body.id;
    const paidRes = await api('PUT', `/api/hrm/payrolls/${payrollId}/status`, { status: 'PAID' }, token);
    console.log('Payslip email status:', paidRes.status, 'Emailed:', paidRes.body?.payslip?.emailed);
  } else {
    console.log('Payroll create error:', prRes.status, JSON.stringify(prRes.body));
  }

  console.log('\n--- Complete! Please check your inbox at pranesh3122007@gmail.com ---');
})();
