const http = require('http');
const BASE = 'http://localhost:5000';

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
  console.log('Logged in as admin.');

  const listRes = await api('GET', '/api/hrm/employees', null, token);
  const employees = listRes.body.data || listRes.body;
  const emp = Array.isArray(employees) ? employees.find(e => e.personalEmail === 'pranesh3122007@gmail.com') : null;

  if (!emp) {
    console.log('Employee not found');
    return;
  }

  console.log('Found employee:', emp.id, emp.firstName, emp.lastName);

  // Send September 2026 payslip
  const prRes = await api('POST', '/api/hrm/payrolls', {
    employeeId: emp.id,
    payPeriod: 'September 2026',
    baseSalary: 4500,
    hra: 1000,
    specialAllowance: 500,
    bonus: 500,
    tds: 0,
    providentFund: 0,
    professionalTax: 0,
    lossOfPay: 0,
    netPay: 6500,
    totalDaysInMonth: 30,
    workingDaysInMonth: 22,
    leavesTaken: 1,
    effectiveWorkDays: 21,
  }, token);

  console.log('Created September payroll:', prRes.status);
  if (prRes.status === 200 || prRes.status === 201) {
    const paidRes = await api('PUT', `/api/hrm/payrolls/${prRes.body.id}/status`, { status: 'PAID' }, token);
    console.log('Marked PAID and sent payslip email:', paidRes.status, paidRes.body?.payslip?.emailed);
  }
})();
