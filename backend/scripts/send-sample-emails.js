/**
 * Send sample Offer Letter and Payslip emails to pranesh3122007@gmail.com
 * with all updated pixel-perfect brand styles and colors.
 */
const http = require('http');

const BASE = 'http://localhost:5000';

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('====================================================');
  console.log('  SENDING SAMPLE BRANDED OFFER LETTER & PAYSLIP EMAILS');
  console.log('====================================================\n');

  // 1. Login
  console.log('1. Logging in as admin...');
  const loginRes = await api('POST', '/api/auth/login', {
    email: 'admin@shuroq.com',
    password: 'password123',
  });
  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error('❌ Login failed:', loginRes.status, loginRes.body);
    return;
  }
  const token = loginRes.body.token;
  console.log('✅ Logged in successfully.\n');

  // 2. Find or update employee
  console.log('2. Finding employee record for pranesh3122007@gmail.com...');
  const listRes = await api('GET', '/api/hrm/employees', null, token);
  const employees = listRes.body.data || listRes.body;
  let emp = Array.isArray(employees)
    ? employees.find((e) => e.personalEmail === 'pranesh3122007@gmail.com')
    : null;

  if (!emp) {
    console.log('Creating employee record...');
    const createRes = await api(
      'POST',
      '/api/hrm/employees',
      {
        firstName: 'Pranesh',
        lastName: 'M',
        personalEmail: 'pranesh3122007@gmail.com',
        phone: '+91-9876543210',
        empType: 'FULL_TIME',
        department: 'Engineering',
        designation: 'Software Development Engineer',
        username: 'pranesh.sample' + Date.now(),
        password: 'SamplePass@123',
        joinDate: new Date().toISOString(),
      },
      token,
    );
    emp = createRes.body;
    console.log('✅ Employee created:', emp.id, emp.empCode);
  } else {
    console.log('✅ Employee found:', emp.id, emp.firstName, emp.lastName, `(${emp.empCode})`);
  }

  // Make sure PAN and Bank details are set for payslip generation
  console.log('\n3. Ensuring employee has PAN, Bank Details & Salary Structure...');
  await api(
    'PUT',
    `/api/hrm/employees/${emp.id}`,
    {
      pan: 'ABCDE1234F',
      bankAccountNo: '987654321012',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
    },
    token,
  );

  // Set salary structure so offer letter and payslip have realistic figures
  await api(
    'PUT',
    `/api/hrm/employees/${emp.id}/salary`,
    {
      basic: 35000,
      hra: 15000,
      specialAllowance: 10000,
      effectiveFrom: new Date().toISOString(),
      note: 'Updated sample salary',
    },
    token,
  );
  console.log('✅ Employee details and salary structure updated.\n');

  // 4. Send Offer Letter
  console.log('4. Generating and sending updated Offer Letter email...');
  const olRes = await api('POST', `/api/hrm/employees/${emp.id}/offer-letter`, {}, token);
  console.log('Offer Letter API Status:', olRes.status);
  console.log('Offer Letter Response:', JSON.stringify(olRes.body, null, 2));

  // 5. Send Payslip
  console.log('\n5. Creating new payroll and sending updated Payslip email...');
  const payPeriod = 'October 2026';
  const payrollRes = await api(
    'POST',
    '/api/hrm/payrolls',
    {
      employeeId: emp.id,
      payPeriod,
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-10-31T23:59:59.999Z',
      baseSalary: 35000,
      hra: 15000,
      specialAllowance: 10000,
      bonus: 5000,
      tds: 2500,
      providentFund: 1800,
      professionalTax: 200,
      lossOfPay: 0,
      netPay: 60500,
      totalDaysInMonth: 31,
      workingDaysInMonth: 22,
      leavesTaken: 0,
      effectiveWorkDays: 22,
    },
    token,
  );

  let payrollId = payrollRes.body?.id;
  if (!payrollId && payrollRes.body?.message?.includes('already exists')) {
    console.log('Payroll for this period already exists, fetching existing payrolls...');
    const allPr = await api('GET', '/api/hrm/payrolls', null, token);
    const prs = allPr.body.data || allPr.body;
    const match = Array.isArray(prs) ? prs.find((p) => p.employeeId === emp.id && p.payPeriod === payPeriod) : null;
    if (match) payrollId = match.id;
  }

  if (payrollId) {
    console.log('Payroll ID:', payrollId);
    console.log('Marking payroll as PAID to auto-generate & email payslip PDF...');
    const paidRes = await api('PUT', `/api/hrm/payrolls/${payrollId}/status`, { status: 'PAID' }, token);
    console.log('Payslip Status Update Result:', paidRes.status);
    console.log('Payslip Response:', JSON.stringify(paidRes.body, null, 2));
  } else {
    console.error('❌ Could not create or find payroll:', payrollRes.body);
  }

  console.log('\n====================================================');
  console.log('  EMAILS DISPATCHED TO: pranesh3122007@gmail.com');
  console.log('====================================================');
})();
