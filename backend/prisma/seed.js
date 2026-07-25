const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Shuroq ERP database...\n');

  // ==========================================
  // ROLES
  // ==========================================
  console.log('Creating roles...');
  const roles = {};
  for (const r of ['SUPER_ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'INVENTORY_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']) {
    roles[r] = await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `${r.replace(/_/g, ' ')} role` },
    });
  }
  console.log(`  ✅ ${Object.keys(roles).length} roles created`);

  // ==========================================
  // PERMISSIONS
  // ==========================================
  console.log('Creating permissions...');
  const permissionData = [
    { module: 'HR', action: 'ALL', roleId: roles.HR_MANAGER.id },
    { module: 'CRM', action: 'ALL', roleId: roles.SALES_MANAGER.id },
    { module: 'INVENTORY', action: 'ALL', roleId: roles.INVENTORY_MANAGER.id },
    { module: 'PROJECTS', action: 'ALL', roleId: roles.PROJECT_MANAGER.id },
    { module: 'HR', action: 'READ', roleId: roles.EMPLOYEE.id },
    { module: 'PROJECTS', action: 'READ', roleId: roles.EMPLOYEE.id },
  ];
  for (const p of permissionData) {
    await prisma.permission.create({ data: p }).catch(() => {});
  }
  console.log(`  ✅ ${permissionData.length} permissions created`);

  // ==========================================
  // DEPARTMENTS & DESIGNATIONS
  // ==========================================
  console.log('Creating departments & designations...');
  const depts = {};
  for (const name of ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 'Operations']) {
    depts[name] = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }

  const desigs = {};
  for (const title of ['Software Engineer', 'HR Executive', 'Sales Manager', 'Marketing Analyst', 'Finance Officer', 'Operations Lead', 'Senior Developer', 'CTO']) {
    desigs[title] = await prisma.designation.upsert({ where: { title }, update: {}, create: { title } });
  }
  console.log(`  ✅ ${Object.keys(depts).length} departments, ${Object.keys(desigs).length} designations`);

  // ==========================================
  // USERS & EMPLOYEES
  // ==========================================
  console.log('Creating users & employees...');
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { email: 'admin@shuroq.com', roleId: roles.SUPER_ADMIN.id, firstName: 'System', lastName: 'Admin', dept: 'Engineering', desig: 'CTO' },
    { email: 'hr@shuroq.com', roleId: roles.HR_MANAGER.id, firstName: 'Priya', lastName: 'Sharma', dept: 'Human Resources', desig: 'HR Executive' },
    { email: 'sales@shuroq.com', roleId: roles.SALES_MANAGER.id, firstName: 'Rahul', lastName: 'Verma', dept: 'Sales', desig: 'Sales Manager' },
    { email: 'dev@shuroq.com', roleId: roles.EMPLOYEE.id, firstName: 'Pranesh', lastName: 'M S', dept: 'Engineering', desig: 'Software Engineer' },
    { email: 'dev2@shuroq.com', roleId: roles.EMPLOYEE.id, firstName: 'Akshay', lastName: 'Kumar', dept: 'Engineering', desig: 'Senior Developer' },
  ];

  const createdEmployees = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        roleId: u.roleId,
        employee: {
          create: {
            firstName: u.firstName,
            lastName: u.lastName,
            departmentId: depts[u.dept].id,
            designationId: desigs[u.desig].id,
            empType: 'FULL_TIME',
            status: 'ACTIVE',
          },
        },
      },
      include: { employee: true },
    });
    if (user.employee) createdEmployees.push(user.employee);
  }
  console.log(`  ✅ ${users.length} users & employees created`);

  // ==========================================
  // LEADS & CUSTOMERS (CRM)
  // ==========================================
  console.log('Creating CRM data...');
  const leads = [];
  const leadData = [
    { name: 'TechCorp Inc.', email: 'info@techcorp.com', phone: '+1-555-0101', company: 'TechCorp', status: 'NEW' },
    { name: 'Global Solutions', email: 'sales@globalsol.com', phone: '+1-555-0102', company: 'Global Solutions', status: 'CONTACTED' },
    { name: 'StartUp Ventures', email: 'hello@startup.io', phone: '+1-555-0103', company: 'StartUp Ventures', status: 'QUALIFIED' },
    { name: 'Enterprise Ltd.', email: 'ceo@enterprise.com', phone: '+1-555-0104', company: 'Enterprise Ltd', status: 'CONVERTED' },
  ];
  for (const l of leadData) {
    const lead = await prisma.lead.create({ data: l });
    leads.push(lead);
  }

  // Create a customer from the converted lead
  const customer = await prisma.customer.create({
    data: { name: 'Enterprise Ltd.', email: 'ceo@enterprise.com', phone: '+1-555-0104', company: 'Enterprise Ltd', convertedFromLeadId: leads[3].id },
  });

  // Create opportunities
  await prisma.opportunity.create({ data: { customerId: customer.id, value: 50000, stage: 'CLOSED_WON' } });
  await prisma.opportunity.create({ data: { customerId: customer.id, value: 25000, stage: 'NEGOTIATION', expectedCloseDate: new Date('2026-08-15') } });
  console.log(`  ✅ ${leadData.length} leads, 1 customer, 2 opportunities created`);

  // ==========================================
  // PRODUCTS & SUPPLIERS (INVENTORY)
  // ==========================================
  console.log('Creating inventory data...');
  const productData = [
    { name: 'Laptop Pro 15', sku: 'LP-001', category: 'Electronics', price: 1299.99, costPrice: 899.99, stockLevel: 50, minStockLevel: 10, unit: 'Piece', status: 'ACTIVE' },
    { name: 'Wireless Mouse', sku: 'WM-002', category: 'Accessories', price: 29.99, costPrice: 12.99, stockLevel: 200, minStockLevel: 50, unit: 'Piece', status: 'ACTIVE' },
    { name: 'USB-C Hub', sku: 'UH-003', category: 'Accessories', price: 49.99, costPrice: 22.99, stockLevel: 5, minStockLevel: 20, unit: 'Piece', status: 'ACTIVE' },
    { name: 'Monitor 27"', sku: 'MN-004', category: 'Electronics', price: 399.99, costPrice: 249.99, stockLevel: 30, minStockLevel: 8, unit: 'Piece', status: 'ACTIVE' },
  ];
  const products = [];
  for (const p of productData) {
    const product = await prisma.product.create({ data: p });
    products.push(product);
  }

  const supplier = await prisma.supplier.create({
    data: { name: 'TechDistributor Co.', contactPerson: 'John Smith', email: 'orders@techdist.com', phone: '+1-555-0200', address: '123 Tech Blvd', city: 'San Francisco', country: 'USA' },
  });

  await prisma.purchaseOrder.create({
    data: { supplierId: supplier.id, productId: products[2].id, quantity: 50, orderDate: new Date(), status: 'ORDERED' },
  });
  console.log(`  ✅ ${productData.length} products, 1 supplier, 1 purchase order created`);

  // ==========================================
  // PROJECTS & TASKS
  // ==========================================
  console.log('Creating project data...');
  const project = await prisma.project.create({
    data: { name: 'Shuroq ERP Development', description: 'Building the Shuroq ERP system', status: 'IN_PROGRESS', priority: 'HIGH', startDate: new Date('2026-07-01'), endDate: new Date('2026-08-30') },
  });

  const taskData = [
    { title: 'Database Schema Design', status: 'DONE', priority: 'HIGH' },
    { title: 'Authentication System', status: 'DONE', priority: 'HIGH' },
    { title: 'HRM Module Backend', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: 'CRM Module Backend', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'Inventory Module Backend', status: 'NOT_STARTED', priority: 'MEDIUM' },
    { title: 'Frontend Migration to Next.js', status: 'IN_PROGRESS', priority: 'HIGH' },
  ];
  for (const t of taskData) {
    await prisma.task.create({ data: { projectId: project.id, ...t } });
  }

  await prisma.milestone.create({
    data: { projectId: project.id, title: 'Backend API Complete', dueDate: new Date('2026-07-30'), status: 'PENDING' },
  });

  // Assignments
  if (createdEmployees.length >= 2) {
    await prisma.assignment.create({ data: { projectId: project.id, employeeId: createdEmployees[3]?.id || createdEmployees[0].id, role: 'Lead Developer' } });
    await prisma.assignment.create({ data: { projectId: project.id, employeeId: createdEmployees[4]?.id || createdEmployees[1].id, role: 'Backend Developer' } });
  }
  console.log(`  ✅ 1 project, ${taskData.length} tasks, 1 milestone, 2 assignments created`);

  console.log('\n🎉 Seeding complete! All modules populated.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
