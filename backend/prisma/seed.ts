import { PrismaClient, EmpType, EmpStatus, AttendanceStatus, LeaveType, LeaveStatus, LeadStatus, TicketStatus, TicketPriority, ProductStatus, ProjectStatus, Priority, InvoiceStatus, ExpenseCategory, LedgerType, JobStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive multi-module database seed...');

  // ========== 1. ROLES & PERMISSIONS ==========
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access across all enterprise modules' },
    { name: 'HR_MANAGER', description: 'Human Resources, Payroll, Recruitment, and Employee Portal' },
    { name: 'FINANCE_MANAGER', description: 'General Ledger, Invoices, Expenses, and Tax records' },
    { name: 'SALES_MANAGER', description: 'CRM Pipeline, Customer Directory, and Support Tickets' },
    { name: 'INVENTORY_MANAGER', description: 'Product Catalog, Warehouses, Sales & Purchase Orders' },
    { name: 'PROJECT_MANAGER', description: 'Projects, Tasks, Timesheets, and Team Capacity' },
    { name: 'TEAM_LEAD', description: 'Project task management and team leadership' },
    { name: 'EMPLOYEE', description: 'Standard employee self-service portal access' },
  ];

  const createdRoles: Record<string, string> = {};

  for (const role of roles) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    createdRoles[r.name] = r.id;
  }
  console.log('  ✓ 8 Enterprise Roles created');

  const permissionMap: Record<string, { module: string; action: string }[]> = {
    SUPER_ADMIN: [
      { module: 'HR', action: 'ALL' }, { module: 'CRM', action: 'ALL' },
      { module: 'INVENTORY', action: 'ALL' }, { module: 'PROJECTS', action: 'ALL' },
      { module: 'FINANCE', action: 'ALL' }, { module: 'ANALYTICS', action: 'ALL' },
      { module: 'ADMIN', action: 'ALL' },
    ],
    HR_MANAGER: [
      { module: 'HR', action: 'ALL' }, { module: 'PROJECTS', action: 'READ' }, { module: 'ANALYTICS', action: 'READ' },
    ],
    FINANCE_MANAGER: [
      { module: 'FINANCE', action: 'ALL' }, { module: 'ANALYTICS', action: 'ALL' }, { module: 'HR', action: 'READ' },
    ],
    SALES_MANAGER: [
      { module: 'CRM', action: 'ALL' }, { module: 'INVENTORY', action: 'READ' }, { module: 'ANALYTICS', action: 'READ' },
    ],
    INVENTORY_MANAGER: [
      { module: 'INVENTORY', action: 'ALL' }, { module: 'CRM', action: 'READ' }, { module: 'ANALYTICS', action: 'READ' },
    ],
    PROJECT_MANAGER: [
      { module: 'PROJECTS', action: 'ALL' }, { module: 'HR', action: 'READ' }, { module: 'ANALYTICS', action: 'READ' },
    ],
    EMPLOYEE: [
      { module: 'HR', action: 'READ' }, { module: 'PROJECTS', action: 'READ' },
    ],
  };

  for (const [roleName, perms] of Object.entries(permissionMap)) {
    const roleId = createdRoles[roleName];
    if (roleId) {
      await prisma.permission.deleteMany({ where: { roleId } });
      for (const perm of perms) {
        await prisma.permission.create({
          data: { roleId, module: perm.module as any, action: perm.action as any },
        });
      }
    }
  }
  console.log('  ✓ Module Permissions assigned to all roles');

  // ========== 2. DEMO ACCOUNTS FOR EVERY ROLE ==========
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { email: 'admin@shuroq.com', role: 'SUPER_ADMIN' },
    { email: 'pranesh@shuroq.com', role: 'SUPER_ADMIN' },
    { email: 'hr@shuroq.com', role: 'HR_MANAGER' },
    { email: 'finance@shuroq.com', role: 'FINANCE_MANAGER' },
    { email: 'crm@shuroq.com', role: 'SALES_MANAGER' },
    { email: 'inventory@shuroq.com', role: 'INVENTORY_MANAGER' },
    { email: 'project@shuroq.com', role: 'PROJECT_MANAGER' },
    { email: 'employee@shuroq.com', role: 'EMPLOYEE' },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, roleId: createdRoles[u.role] },
      create: { email: u.email, passwordHash, roleId: createdRoles[u.role] },
    });
  }
  console.log('  ✓ Demo User Accounts seeded for all enterprise roles');

  // ========== 3. HRM MODULE DATA ==========
  const depts = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing'];
  const deptMap: Record<string, string> = {};
  for (const name of depts) {
    const d = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    deptMap[name] = d.id;
  }

  const desigs = ['Software Engineer', 'Senior Developer', 'HR Manager', 'Sales Executive', 'Financial Analyst', 'Operations Director', 'Project Lead'];
  const desigMap: Record<string, string> = {};
  for (const title of desigs) {
    const des = await prisma.designation.upsert({ where: { title }, update: {}, create: { title } });
    desigMap[title] = des.id;
  }

  const employees = [
    { firstName: 'Sarah', lastName: 'Jenkins', empCode: 'ERP-1024', departmentId: deptMap['Engineering'], designationId: desigMap['Senior Developer'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-1024' },
    { firstName: 'Marcus', lastName: 'Thorne', empCode: 'ERP-0892', departmentId: deptMap['Engineering'], designationId: desigMap['Senior Developer'], empType: EmpType.FULL_TIME, status: EmpStatus.ON_LEAVE, contact: '+1 555-0892' },
    { firstName: 'Arthur', lastName: 'Vance', empCode: 'ERP-0041', departmentId: deptMap['Finance'], designationId: desigMap['Financial Analyst'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0041' },
    { firstName: 'Elena', lastName: 'Choi', empCode: 'ERP-1155', departmentId: deptMap['Sales'], designationId: desigMap['Sales Executive'], empType: EmpType.FULL_TIME, status: EmpStatus.PROBATION, contact: '+1 555-1155' },
    { firstName: 'Pranesh', lastName: 'M S', empCode: 'ERP-0001', departmentId: deptMap['Operations'], designationId: desigMap['Operations Director'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+91 98765-43210' },
    { firstName: 'Lucas', lastName: 'Scott', empCode: 'ERP-0101', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0101' },
    { firstName: 'Mia', lastName: 'Wong', empCode: 'ERP-0102', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0102' },
    { firstName: 'Oliver', lastName: 'Davis', empCode: 'ERP-0103', departmentId: deptMap['Sales'], designationId: desigMap['Sales Executive'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0103' },
    { firstName: 'Sophia', lastName: 'Martinez', empCode: 'ERP-0104', departmentId: deptMap['HR'], designationId: desigMap['HR Manager'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0104' },
    { firstName: 'Liam', lastName: 'Garcia', empCode: 'ERP-0105', departmentId: deptMap['Finance'], designationId: desigMap['Financial Analyst'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0105' },
    { firstName: 'Emma', lastName: 'Rodriguez', empCode: 'ERP-0106', departmentId: deptMap['Operations'], designationId: desigMap['Operations Director'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0106' },
    { firstName: 'Noah', lastName: 'Smith', empCode: 'ERP-0107', departmentId: deptMap['Engineering'], designationId: desigMap['Senior Developer'], empType: EmpType.FULL_TIME, status: EmpStatus.INACTIVE, contact: '+1 555-0107' },
    { firstName: 'Isabella', lastName: 'Johnson', empCode: 'ERP-0108', departmentId: deptMap['Sales'], designationId: desigMap['Sales Executive'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0108' },
    { firstName: 'James', lastName: 'Williams', empCode: 'ERP-0109', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: EmpType.CONTRACT, status: EmpStatus.ACTIVE, contact: '+1 555-0109' },
    { firstName: 'Olivia', lastName: 'Brown', empCode: 'ERP-0110', departmentId: deptMap['Finance'], designationId: desigMap['Financial Analyst'], empType: EmpType.FULL_TIME, status: EmpStatus.INACTIVE, contact: '+1 555-0110' },
    { firstName: 'William', lastName: 'Jones', empCode: 'ERP-0111', departmentId: deptMap['Operations'], designationId: desigMap['Project Lead'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0111' },
    { firstName: 'Ava', lastName: 'Miller', empCode: 'ERP-0112', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0112' },
    { firstName: 'Benjamin', lastName: 'Taylor', empCode: 'ERP-0113', departmentId: deptMap['HR'], designationId: desigMap['HR Manager'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0113' },
    { firstName: 'Amelia', lastName: 'Anderson', empCode: 'ERP-0114', departmentId: deptMap['Sales'], designationId: desigMap['Sales Executive'], empType: EmpType.PART_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0114' },
    { firstName: 'Elijah', lastName: 'Thomas', empCode: 'ERP-0115', departmentId: deptMap['Engineering'], designationId: desigMap['Project Lead'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0115' },
  ];

  const createdEmpIds: string[] = [];
  const activeEmpIds: string[] = [];
  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({ where: { firstName: emp.firstName, lastName: emp.lastName } });
    let empId = '';
    if (!existing) {
      const e = await prisma.employee.create({ data: emp });
      empId = e.id;
    } else {
      // Update existing employee with empCode and status if missing
      await prisma.employee.update({ where: { id: existing.id }, data: { empCode: emp.empCode, status: emp.status } });
      empId = existing.id;
    }
    createdEmpIds.push(empId);
    if (emp.status !== EmpStatus.INACTIVE) {
      activeEmpIds.push(empId);
    }
  }

  // Attendance & Leaves
  if (activeEmpIds.length > 0) {
    await prisma.attendance.createMany({
      data: [
        { employeeId: activeEmpIds[0], date: new Date(), status: AttendanceStatus.PRESENT, checkIn: new Date() },
        { employeeId: activeEmpIds[2], date: new Date(), status: AttendanceStatus.PRESENT, checkIn: new Date() },
        { employeeId: activeEmpIds[4], date: new Date(), status: AttendanceStatus.PRESENT, checkIn: new Date() },
      ],
      skipDuplicates: true,
    });

    await prisma.leave.createMany({
      data: [
        { employeeId: activeEmpIds[0], leaveType: LeaveType.SICK_LEAVE, startDate: new Date('2026-05-24'), endDate: new Date('2026-05-26'), status: LeaveStatus.PENDING, reason: 'Medical recovery from flu symptoms...' },
        { employeeId: activeEmpIds[1], leaveType: LeaveType.ANNUAL_LEAVE, startDate: new Date('2026-06-10'), endDate: new Date('2026-06-17'), status: LeaveStatus.PENDING, reason: 'Family trip to coastal region...' },
        { employeeId: activeEmpIds[2], leaveType: LeaveType.ANNUAL_LEAVE, startDate: new Date('2026-08-10'), endDate: new Date('2026-08-15'), status: LeaveStatus.APPROVED, reason: 'Annual vacation' },
        { employeeId: activeEmpIds[3], leaveType: LeaveType.SICK_LEAVE, startDate: new Date('2026-08-01'), endDate: new Date('2026-08-03'), status: LeaveStatus.PENDING, reason: 'Fever and headache' },
      ],
      skipDuplicates: true,
    });

    // Seed Performance Reviews
    await prisma.performanceReview.createMany({
      data: [
        { employeeId: activeEmpIds[0], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 5, review: 'Excellent leadership and operations management.' },
        { employeeId: activeEmpIds[1], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 5, review: 'Great HR processes implemented this quarter.' },
        { employeeId: activeEmpIds[2], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4, review: 'Solid development work, needs to improve communication.' },
        { employeeId: activeEmpIds[3], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 5, review: 'Financial reports were spot on and timely.' },
        { employeeId: activeEmpIds[4], reviewerId: activeEmpIds[0], quarter: 'Q1', rating: 5, review: 'Exceeded sales targets by 20%.' },
      ],
      skipDuplicates: true,
    });
  }

  // Seed Job Postings with priorities
  await prisma.jobPosting.createMany({
    data: [
      { title: 'Senior React Developer', department: 'Engineering', location: 'Remote', description: 'Building enterprise ERP frontend modules', priority: Priority.HIGH, status: JobStatus.OPEN },
      { title: 'DevOps Engineer', department: 'Engineering', location: 'Dubai, UAE', description: 'CI/CD pipelines and cloud infrastructure', priority: Priority.HIGH, status: JobStatus.OPEN },
      { title: 'Junior Designer', department: 'Design', location: 'Bangalore, India', description: 'UI/UX design for mobile applications', priority: Priority.MEDIUM, status: JobStatus.OPEN },
      { title: 'HR Coordinator', department: 'HR', location: 'Dubai, UAE', description: 'Employee relations and onboarding', priority: Priority.LOW, status: JobStatus.OPEN },
      { title: 'Financial Analyst', department: 'Finance', location: 'Remote', description: 'Budget forecasting and financial modeling', priority: Priority.HIGH, status: JobStatus.OPEN },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ HRM Employees, Attendance, Leaves, Performance, and Jobs seeded');

  // ========== 4. CRM MODULE DATA ==========
  const customers = [
    { name: 'Apex Global Logistics', email: 'contact@apexglobal.com', phone: '+1 555-0199', company: 'Apex Global Inc' },
    { name: 'Skyline Enterprises', email: 'info@skyline.io', phone: '+1 555-0244', company: 'Skyline Corp' },
    { name: 'Oasis Retail Outlets', email: 'purchasing@oasis.com', phone: '+971 4 399 1000', company: 'Oasis Holding' },
  ];

  const custIds: string[] = [];
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { email: c.email } });
    if (!existing) {
      const newC = await prisma.customer.create({ data: c });
      custIds.push(newC.id);
    } else {
      custIds.push(existing.id);
    }
  }

  await prisma.lead.createMany({
    data: [
      { name: 'Jonathan Reed', company: 'Reed Telecom', email: 'jreed@reedtelecom.com', status: LeadStatus.NEW },
      { name: 'Samantha Miller', company: 'Miller Tech', email: 'smiller@millertech.com', status: LeadStatus.QUALIFIED },
    ],
    skipDuplicates: true,
  });

  if (custIds.length > 0) {
    await prisma.supportTicket.createMany({
      data: [
        { customerId: custIds[0], subject: 'VPN Access Disruption', priority: TicketPriority.HIGH, status: TicketStatus.OPEN, description: 'Employees in Dubai branch unable to connect' },
        { customerId: custIds[1], subject: 'Billing Statement Discrepancy', priority: TicketPriority.MEDIUM, status: TicketStatus.IN_PROGRESS, description: 'Invoice INV-2026-004 query' },
      ],
      skipDuplicates: true,
    });
  }
  console.log('  ✓ CRM Customers, Leads, and Support Tickets seeded');

  // ========== 5. INVENTORY MODULE DATA ==========
  const products = [
    { name: 'Fiber Optic Cable 100m', sku: 'FO-100M', category: 'Networking', price: 250, costPrice: 140, stockLevel: 14, minStockLevel: 20, unit: 'Piece', status: ProductStatus.ACTIVE },
    { name: 'Enterprise Router X9000', sku: 'RTR-X900', category: 'Hardware', price: 1800, costPrice: 1100, stockLevel: 8, minStockLevel: 10, unit: 'Piece', status: ProductStatus.ACTIVE },
    { name: 'Server Rack Cabinet 42U', sku: 'SRK-42U', category: 'Infrastructure', price: 950, costPrice: 520, stockLevel: 25, minStockLevel: 5, unit: 'Piece', status: ProductStatus.ACTIVE },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }

  await prisma.warehouse.createMany({
    data: [
      { name: 'Dubai Central Logistics Hub', location: 'Jebel Ali Freezone, Dubai', capacity: 10000 },
      { name: 'Riyadh Distribution Center', location: 'Industrial City, Riyadh', capacity: 7500 },
    ],
    skipDuplicates: true,
  });
  console.log('  ✓ Inventory Products and Warehouses seeded');

  // ========== 6. PROJECTS MODULE DATA ==========
  const project = await prisma.project.create({
    data: {
      name: 'ERP Digital Transformation Phase 2',
      description: 'Upgrading enterprise system to microservices architecture with real-time analytics',
      status: ProjectStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      startDate: new Date('2026-06-01'),
    },
  });

  await prisma.task.createMany({
    data: [
      { title: 'Implement RBAC Route Guards', projectId: project.id, status: 'DONE', priority: Priority.HIGH },
      { title: 'Database Optimization & Seeding', projectId: project.id, status: 'IN_PROGRESS', priority: Priority.HIGH },
    ],
  });
  console.log('  ✓ Projects and Tasks seeded');

  // ========== 7. FINANCE MODULE DATA ==========
  await prisma.invoice.createMany({
    data: [
      { invoiceNo: 'INV-2026-101', clientName: 'Apex Global Inc', amount: 14500, status: InvoiceStatus.PAID, dueDate: new Date('2026-08-30') },
      { invoiceNo: 'INV-2026-102', clientName: 'Skyline Corp', amount: 28000, status: InvoiceStatus.UNPAID, dueDate: new Date('2026-09-15') },
    ],
    skipDuplicates: true,
  });

  await prisma.expense.createMany({
    data: [
      { description: 'Cloud Infrastructure Servers (AWS)', amount: 4200, category: ExpenseCategory.OPERATIONAL, date: new Date() },
      { description: 'Monthly Payroll Disbursement', amount: 52000, category: ExpenseCategory.PAYROLL, date: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.ledgerEntry.createMany({
    data: [
      { account: '1010-CASH', type: LedgerType.CREDIT, amount: 14500, description: 'Customer Invoice Payment Received' },
      { account: '5000-EXP', type: LedgerType.DEBIT, amount: 4200, description: 'Server Hardware Procurement' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✓ Finance Invoices, Expenses, and Ledger Entries seeded');

  console.log('\n======================================================');
  console.log('🎉 Enterprise Database Seed Completed Successfully!');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
