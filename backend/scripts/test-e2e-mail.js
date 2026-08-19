/**
 * Full end-to-end test:
 * 1. Login as admin
 * 2. Create a test employee (Pranesh) with email pranesh3122007@gmail.com
 * 3. Auto-trigger: offer letter generation + email
 * 4. Create payroll, mark PAID
 * 5. Auto-trigger: payslip generation + email
 *
 * Run: node scripts/test-e2e-mail.js
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
  console.log('=== E2E: Employee + Offer Letter + Payslip + Email ===\n');

  // 1. Login
  console.log('1. Logging in as admin@shuroq.com...');
  const loginRes = await api('POST', '/api/auth/login', { email: 'admin@shuroq.com', password: 'password123' });
  if (loginRes.status !== 201 && loginRes.status !== 200) {
    console.error('  Login failed:', loginRes.body);
    return;
  }
  const token = loginRes.body.token;
  console.log('  ✓ Logged in.');

  // 2. Create employee with string department/designation (not IDs)
  console.log('\n2. Creating test employee (Pranesh)...');
  const empData = {
    firstName: 'Pranesh',
    lastName: 'TestMail',
    personalEmail: 'pranesh3122007@gmail.com',
    phone: '+91-9876543210',
    empType: 'PART_TIME',
    department: 'Engineering',    // string name, not ID
    designation: 'DevOps Engineer',  // string name, not ID
    username: 'pranesh.test' + Date.now(),
    password: 'TestPass@123',
    joinDate: new Date().toISOString(),
  };
  const empRes = await api('POST', '/api/hrm/employees', empData, token);
  console.log('  Employee creation status:', empRes.status);

  if (empRes.status !== 201 && empRes.status !== 200) {
    console.log('  Response:', JSON.stringify(empRes.body).substring(0, 400));
    console.error('  ✗ Failed to create employee.');

    // Try to find existing employee by email
    console.log('\n  Looking for existing employee with pranesh3122007@gmail.com...');
    const listRes = await api('GET', '/api/hrm/employees', null, token);
    if (listRes.status === 200) {
      const employees = listRes.body.data || listRes.body;
      const existing = Array.isArray(employees) ? employees.find(e => e.personalEmail === 'pranesh3122007@gmail.com') : null;
      if (existing) {
        console.log('  Found existing:', existing.id, existing.firstName, existing.lastName);
        await testPayslip(token, existing.id);
        return;
      }
      console.log('  Not found in employee list.');
    }
    return;
  }

  const employee = empRes.body;
  console.log('  ✓ Employee created:', employee.id, employee.empCode);

  // The offer letter is auto-generated during employee creation
  if (employee.offerLetter) {
    console.log('\n3. Offer Letter Result:');
    console.log('  Document ID:', employee.offerLetter.documentId);
    console.log('  File URL:', employee.offerLetter.fileUrl);
    console.log('  Emailed:', employee.offerLetter.emailed);
    if (employee.offerLetter.error) {
      console.log('  Error:', employee.offerLetter.error);
    }
  } else {
    console.log('\n3. No offerLetter in response (may not be returned)');
  }

  // 4. Create payroll for the employee and mark PAID
  await testPayslip(token, employee.id);
})();

async function testPayslip(token, employeeId) {
  console.log('\n4. Creating payroll for employee', employeeId, '...');
  const payrollData = {
    employeeId,
    payPeriod: 'August 2026',
    baseSalary: 3000,
    hra: 0,
    specialAllowance: 0,
    bonus: 0,
    tds: 0,
    providentFund: 0,
    professionalTax: 0,
    lossOfPay: 0,
    netPay: 3000,
    totalDaysInMonth: 31,
    workingDaysInMonth: 22,
    leavesTaken: 0,
    effectiveWorkDays: 22,
  };
  const prRes = await api('POST', '/api/hrm/payrolls', payrollData, token);
  console.log('  Payroll creation status:', prRes.status);
  console.log('  Response:', JSON.stringify(prRes.body).substring(0, 300));

  if (prRes.status !== 201 && prRes.status !== 200) {
    console.error('  ✗ Failed to create payroll.');
    return;
  }

  const payrollId = prRes.body.id;
  console.log('  ✓ Payroll created:', payrollId);

  // 5. Mark payroll as PAID — this auto-triggers payslip generation + email
  console.log('\n5. Marking payroll as PAID (auto-triggers payslip + email)...');
  const paidRes = await api('PUT', `/api/hrm/payrolls/${payrollId}/status`, { status: 'PAID' }, token);
  console.log('  Status update result:', paidRes.status);
  console.log('  Response:', JSON.stringify(paidRes.body).substring(0, 400));

  if (paidRes.body?.payslip) {
    console.log('\n  === Payslip Result ===');
    console.log('  Document ID:', paidRes.body.payslip.documentId);
    console.log('  File URL:', paidRes.body.payslip.fileUrl);
    console.log('  Emailed:', paidRes.body.payslip.emailed);
    if (paidRes.body.payslip.error) {
      console.log('  Error:', paidRes.body.payslip.error);
    }
  }

  console.log('\n=== Done! Check pranesh3122007@gmail.com for emails ===');
}
