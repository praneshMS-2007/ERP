import { PrismaClient, EmpType, EmpStatus, AttendanceStatus, LeaveType, LeaveStatus, ProductStatus, ProjectStatus, Priority, POStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive multi-module database seed...');

  // ========== 1. ROLES & PERMISSIONS ==========
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access across all enterprise modules' },
    { name: 'HR_MANAGER', description: 'Human Resources, Payroll, and Employee Portal' },
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
      // PROJECTS: ALL — HR is the only role (besides Super Admin) allowed to
      // create/delete a project or change its staffing, per the project
      // staffing feature; a narrower READ grant here wouldn't let them do
      // that even though projects.service.ts's own role checks are the real
      // gate for those specific actions.
      { module: 'HR', action: 'ALL' }, { module: 'PROJECTS', action: 'ALL' }, { module: 'ANALYTICS', action: 'READ' },
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
    // Same as PROJECT_MANAGER but without DELETE: explicit READ + WRITE
    // instead of ALL, since ALL would also satisfy a DELETE check.
    TEAM_LEAD: [
      { module: 'PROJECTS', action: 'READ' }, { module: 'PROJECTS', action: 'WRITE' },
      { module: 'HR', action: 'READ' }, { module: 'ANALYTICS', action: 'READ' },
    ],
    EMPLOYEE: [
      { module: 'HR', action: 'READ' }, { module: 'PROJECTS', action: 'READ' },
    ],
  };

  // Every role gets SELF:ALL — managing your own leave/attendance/profile
  // isn't a departmental permission, it's a baseline everyone has. Added
  // here rather than duplicated in each array above so it can't be
  // forgotten on the next role that gets added.
  for (const perms of Object.values(permissionMap)) {
    perms.push({ module: 'SELF', action: 'ALL' });
  }

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
    { email: 'teamlead@shuroq.com', role: 'TEAM_LEAD' },
    { email: 'employee@shuroq.com', role: 'EMPLOYEE' },
  ];

  const createdUserMap: Record<string, string> = {};
  for (const u of demoUsers) {
    const usr = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, roleId: createdRoles[u.role] },
      create: { email: u.email, passwordHash, roleId: createdRoles[u.role] },
    });
    createdUserMap[u.email] = usr.id;
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
    { firstName: 'Pranesh', lastName: 'M S', empCode: 'ERP-0001', userId: createdUserMap['pranesh@shuroq.com'], departmentId: deptMap['Operations'], designationId: desigMap['Operations Director'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+91 98765-43210' },
    { firstName: 'Lucas', lastName: 'Scott', empCode: 'ERP-0101', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: EmpType.FULL_TIME, status: EmpStatus.ACTIVE, contact: '+1 555-0101' },
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
      await prisma.employee.update({ where: { id: existing.id }, data: { empCode: emp.empCode, status: emp.status, userId: emp.userId } });
      empId = existing.id;
    }
    createdEmpIds.push(empId);
    if ((emp.status as string) !== 'INACTIVE') {
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
      ],
      skipDuplicates: true,
    });

    // Seed Performance Reviews
    await prisma.performanceReview.createMany({
      data: [
        { employeeId: activeEmpIds[0], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.8, review: 'Outstanding full-stack work on ERP architecture.', goals: 'Lead backend optimization' },
        { employeeId: activeEmpIds[1], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.2, review: 'Great progress on CRM integration.', goals: 'Enhance API documentation' },
        { employeeId: activeEmpIds[2], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.5, review: 'Solid financial reconciliation.', goals: 'Automate tax reporting' },
      ],
      skipDuplicates: true,
    });
  }

  console.log('  ✓ HRM Employees, Attendance, Leaves, and Performance seeded');

  // ========== 4. CRM MODULE DATA ==========
  // Deliberately empty. CRM data (leads, customers, opportunities, support
  // tickets) is production data, not fixtures — it must only ever be created
  // through the real app funnel (Add Lead -> Convert), never seeded fake.
  console.log('  ✓ CRM module left empty (no fixtures — real data only)');

  // ========== 5. INVENTORY MODULE DATA ==========
  const cat1 = await prisma.category.upsert({ where: { name: 'Networking' }, update: {}, create: { name: 'Networking', description: 'Cables, routers, switches' } });
  const cat2 = await prisma.category.upsert({ where: { name: 'Hardware' }, update: {}, create: { name: 'Hardware', description: 'Enterprise servers & components' } });
  const cat3 = await prisma.category.upsert({ where: { name: 'Accessories' }, update: {}, create: { name: 'Accessories', description: 'Peripherals and adapters' } });

  const supp1 = await prisma.supplier.create({
    data: { name: 'TechSource India', contactPerson: 'Deepak Mehta', email: 'sales@techsourceindia.com', phone: '+91 80 4567 8900', city: 'Bengaluru', country: 'India' }
  });

  const products = [
    { name: 'Fiber Optic Cable 100m', sku: 'FO-100M', category: 'Networking', categoryId: cat1.id, price: 250, costPrice: 140, stockLevel: 12, minStockLevel: 20, unit: 'pcs', status: ProductStatus.ACTIVE },
    { name: 'USB-C Hub Enterprise', sku: 'PROD-002', category: 'Accessories', categoryId: cat3.id, price: 85, costPrice: 45, stockLevel: 15, minStockLevel: 25, unit: 'pcs', status: ProductStatus.ACTIVE },
    { name: 'Enterprise Router X9000', sku: 'RTR-X900', category: 'Hardware', categoryId: cat2.id, price: 1800, costPrice: 1100, stockLevel: 8, minStockLevel: 10, unit: 'pcs', status: ProductStatus.ACTIVE },
    { name: 'Server Rack Cabinet 42U', sku: 'SRK-42U', category: 'Hardware', categoryId: cat2.id, price: 950, costPrice: 520, stockLevel: 25, minStockLevel: 5, unit: 'pcs', status: ProductStatus.ACTIVE },
  ];

  const createdProds: any[] = [];
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const prod = await prisma.product.create({ data: p });
      createdProds.push(prod);
    } else {
      createdProds.push(existing);
    }
  }

  await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-001',
      supplierId: supp1.id,
      productId: createdProds[0].id,
      quantity: 50,
      totalAmount: 7000,
      orderDate: new Date(),
      status: POStatus.ORDERED,
    }
  });

  await prisma.warehouse.createMany({
    data: [
      { name: 'Mumbai Central Logistics Hub', location: 'Bhiwandi, Maharashtra', capacity: 10000 },
      { name: 'Bengaluru Distribution Center', location: 'Whitefield, Bengaluru, Karnataka', capacity: 7500 },
    ],
    skipDuplicates: true,
  });
  console.log('  ✓ Inventory Categories, Suppliers, Products, POs, and Warehouses seeded');

  // ========== 6. PROJECTS MODULE DATA ==========
  const project = await prisma.project.create({
    data: {
      name: 'ERP Digital Transformation Phase 2',
      description: 'Upgrading enterprise system to microservices architecture with real-time analytics',
      status: ProjectStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      progress: 50,
      startDate: new Date('2026-06-01'),
    },
  });

  if (activeEmpIds.length > 0) {
    await prisma.task.createMany({
      data: [
        { title: 'Implement RBAC Route Guards', projectId: project.id, assignedEmployeeId: activeEmpIds[0], status: 'DONE', priority: Priority.HIGH },
        { title: 'Database Optimization & Seeding', projectId: project.id, assignedEmployeeId: activeEmpIds[4], status: 'IN_PROGRESS', priority: Priority.HIGH },
      ],
    });
  }
  console.log('  ✓ Projects and Tasks seeded');

  // ========== 7. FINANCE MODULE DATA ==========
  // Deliberately empty. Invoices, Expenses, Income, Budgets, and Ledger
  // entries are production data, not fixtures — they must only ever be
  // created through the real app (Add Invoice, Log Expense, Record Payment,
  // payroll auto-created expenses, etc.), never seeded fake.
  console.log('  ✓ Finance module left empty (no fixtures — real data only)');

  // ========== 8. NOTIFICATIONS & AUDIT LOGS ==========
  const adminUserId = createdUserMap['pranesh@shuroq.com'] || createdUserMap['admin@shuroq.com'];
  if (adminUserId) {
    await prisma.notification.createMany({
      data: [
        { userId: adminUserId, title: 'Stock Alert: Fiber Optics', message: 'Inventory fell below minimum threshold (12 units remaining).', type: 'WARNING' },
        { userId: adminUserId, title: 'Leave Request Approved', message: 'Arthur Vance vacation request has been approved.', type: 'SUCCESS' },
      ]
    });

    await prisma.auditLog.createMany({
      data: [
        { userId: adminUserId, action: 'USER_LOGIN', module: 'ADMIN', details: 'Successful authentication from 127.0.0.1' },
        { userId: adminUserId, action: 'SCHEMA_UPDATE', module: 'ADMIN', details: 'Database schema upgraded to v21 standards' },
      ]
    });
    console.log('  ✓ Notifications and Audit Logs seeded');
  }

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
