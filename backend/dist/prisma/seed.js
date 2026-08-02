"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting comprehensive multi-module database seed...');
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
    const createdRoles = {};
    for (const role of roles) {
        const r = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: role,
        });
        createdRoles[r.name] = r.id;
    }
    console.log('  ✓ 8 Enterprise Roles created');
    const permissionMap = {
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
                    data: { roleId, module: perm.module, action: perm.action },
                });
            }
        }
    }
    console.log('  ✓ Module Permissions assigned to all roles');
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
    const createdUserMap = {};
    for (const u of demoUsers) {
        const usr = await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash, roleId: createdRoles[u.role] },
            create: { email: u.email, passwordHash, roleId: createdRoles[u.role] },
        });
        createdUserMap[u.email] = usr.id;
    }
    console.log('  ✓ Demo User Accounts seeded for all enterprise roles');
    const depts = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing'];
    const deptMap = {};
    for (const name of depts) {
        const d = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
        deptMap[name] = d.id;
    }
    const desigs = ['Software Engineer', 'Senior Developer', 'HR Manager', 'Sales Executive', 'Financial Analyst', 'Operations Director', 'Project Lead'];
    const desigMap = {};
    for (const title of desigs) {
        const des = await prisma.designation.upsert({ where: { title }, update: {}, create: { title } });
        desigMap[title] = des.id;
    }
    const employees = [
        { firstName: 'Sarah', lastName: 'Jenkins', empCode: 'ERP-1024', departmentId: deptMap['Engineering'], designationId: desigMap['Senior Developer'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.ACTIVE, contact: '+1 555-1024' },
        { firstName: 'Marcus', lastName: 'Thorne', empCode: 'ERP-0892', departmentId: deptMap['Engineering'], designationId: desigMap['Senior Developer'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.ON_LEAVE, contact: '+1 555-0892' },
        { firstName: 'Arthur', lastName: 'Vance', empCode: 'ERP-0041', departmentId: deptMap['Finance'], designationId: desigMap['Financial Analyst'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.ACTIVE, contact: '+1 555-0041' },
        { firstName: 'Elena', lastName: 'Choi', empCode: 'ERP-1155', departmentId: deptMap['Sales'], designationId: desigMap['Sales Executive'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.PROBATION, contact: '+1 555-1155' },
        { firstName: 'Pranesh', lastName: 'M S', empCode: 'ERP-0001', userId: createdUserMap['pranesh@shuroq.com'], departmentId: deptMap['Operations'], designationId: desigMap['Operations Director'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.ACTIVE, contact: '+91 98765-43210' },
        { firstName: 'Lucas', lastName: 'Scott', empCode: 'ERP-0101', departmentId: deptMap['Engineering'], designationId: desigMap['Software Engineer'], empType: client_1.EmpType.FULL_TIME, status: client_1.EmpStatus.ACTIVE, contact: '+1 555-0101' },
    ];
    const createdEmpIds = [];
    const activeEmpIds = [];
    for (const emp of employees) {
        const existing = await prisma.employee.findFirst({ where: { firstName: emp.firstName, lastName: emp.lastName } });
        let empId = '';
        if (!existing) {
            const e = await prisma.employee.create({ data: emp });
            empId = e.id;
        }
        else {
            await prisma.employee.update({ where: { id: existing.id }, data: { empCode: emp.empCode, status: emp.status, userId: emp.userId } });
            empId = existing.id;
        }
        createdEmpIds.push(empId);
        if (emp.status !== 'INACTIVE') {
            activeEmpIds.push(empId);
        }
    }
    if (activeEmpIds.length > 0) {
        await prisma.attendance.createMany({
            data: [
                { employeeId: activeEmpIds[0], date: new Date(), status: client_1.AttendanceStatus.PRESENT, checkIn: new Date() },
                { employeeId: activeEmpIds[2], date: new Date(), status: client_1.AttendanceStatus.PRESENT, checkIn: new Date() },
                { employeeId: activeEmpIds[4], date: new Date(), status: client_1.AttendanceStatus.PRESENT, checkIn: new Date() },
            ],
            skipDuplicates: true,
        });
        await prisma.leave.createMany({
            data: [
                { employeeId: activeEmpIds[0], leaveType: client_1.LeaveType.SICK_LEAVE, startDate: new Date('2026-05-24'), endDate: new Date('2026-05-26'), status: client_1.LeaveStatus.PENDING, reason: 'Medical recovery from flu symptoms...' },
                { employeeId: activeEmpIds[1], leaveType: client_1.LeaveType.ANNUAL_LEAVE, startDate: new Date('2026-06-10'), endDate: new Date('2026-06-17'), status: client_1.LeaveStatus.PENDING, reason: 'Family trip to coastal region...' },
                { employeeId: activeEmpIds[2], leaveType: client_1.LeaveType.ANNUAL_LEAVE, startDate: new Date('2026-08-10'), endDate: new Date('2026-08-15'), status: client_1.LeaveStatus.APPROVED, reason: 'Annual vacation' },
            ],
            skipDuplicates: true,
        });
        await prisma.performanceReview.createMany({
            data: [
                { employeeId: activeEmpIds[0], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.8, review: 'Outstanding full-stack work on ERP architecture.', goals: 'Lead backend optimization' },
                { employeeId: activeEmpIds[1], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.2, review: 'Great progress on CRM integration.', goals: 'Enhance API documentation' },
                { employeeId: activeEmpIds[2], reviewerId: activeEmpIds[4], quarter: 'Q1', rating: 4.5, review: 'Solid financial reconciliation.', goals: 'Automate tax reporting' },
            ],
            skipDuplicates: true,
        });
    }
    await prisma.jobPosting.createMany({
        data: [
            { title: 'Senior React Developer', department: 'Engineering', location: 'Remote', description: 'Building enterprise ERP frontend modules', priority: client_1.Priority.HIGH, status: client_1.JobStatus.OPEN },
            { title: 'DevOps Engineer', department: 'Engineering', location: 'Dubai, UAE', description: 'CI/CD pipelines and cloud infrastructure', priority: client_1.Priority.HIGH, status: client_1.JobStatus.OPEN },
        ],
        skipDuplicates: true,
    });
    console.log('  ✓ HRM Employees, Attendance, Leaves, Performance, and Jobs seeded');
    const customers = [
        { name: 'Apex Global Logistics', email: 'contact@apexglobal.com', phone: '+1 555-0199', company: 'Apex Global Inc' },
        { name: 'Skyline Enterprises', email: 'info@skyline.io', phone: '+1 555-0244', company: 'Skyline Corp' },
        { name: 'Oasis Retail Outlets', email: 'purchasing@oasis.com', phone: '+971 4 399 1000', company: 'Oasis Holding' },
    ];
    const custIds = [];
    for (const c of customers) {
        const existing = await prisma.customer.findFirst({ where: { email: c.email } });
        if (!existing) {
            const newC = await prisma.customer.create({ data: c });
            custIds.push(newC.id);
        }
        else {
            custIds.push(existing.id);
        }
    }
    await prisma.lead.createMany({
        data: [
            { name: 'Jonathan Reed', company: 'Reed Telecom', email: 'jreed@reedtelecom.com', status: client_1.LeadStatus.NEW },
            { name: 'Samantha Miller', company: 'Miller Tech', email: 'smiller@millertech.com', status: client_1.LeadStatus.QUALIFIED },
        ],
        skipDuplicates: true,
    });
    if (custIds.length > 0) {
        await prisma.supportTicket.createMany({
            data: [
                { customerId: custIds[0], subject: 'VPN Access Disruption', priority: client_1.TicketPriority.HIGH, status: client_1.TicketStatus.OPEN, description: 'Employees in Dubai branch unable to connect' },
                { customerId: custIds[1], subject: 'Billing Statement Discrepancy', priority: client_1.TicketPriority.MEDIUM, status: client_1.TicketStatus.IN_PROGRESS, description: 'Invoice INV-2026-004 query' },
            ],
            skipDuplicates: true,
        });
    }
    console.log('  ✓ CRM Customers, Leads, and Support Tickets seeded');
    const cat1 = await prisma.category.upsert({ where: { name: 'Networking' }, update: {}, create: { name: 'Networking', description: 'Cables, routers, switches' } });
    const cat2 = await prisma.category.upsert({ where: { name: 'Hardware' }, update: {}, create: { name: 'Hardware', description: 'Enterprise servers & components' } });
    const cat3 = await prisma.category.upsert({ where: { name: 'Accessories' }, update: {}, create: { name: 'Accessories', description: 'Peripherals and adapters' } });
    const supp1 = await prisma.supplier.create({
        data: { name: 'TechSource Global', contactPerson: 'David Miller', email: 'sales@techsource.com', phone: '+1 800-555-0199', city: 'San Jose', country: 'USA' }
    });
    const products = [
        { name: 'Fiber Optic Cable 100m', sku: 'FO-100M', category: 'Networking', categoryId: cat1.id, price: 250, costPrice: 140, stockLevel: 12, minStockLevel: 20, unit: 'pcs', status: client_1.ProductStatus.ACTIVE },
        { name: 'USB-C Hub Enterprise', sku: 'PROD-002', category: 'Accessories', categoryId: cat3.id, price: 85, costPrice: 45, stockLevel: 15, minStockLevel: 25, unit: 'pcs', status: client_1.ProductStatus.ACTIVE },
        { name: 'Enterprise Router X9000', sku: 'RTR-X900', category: 'Hardware', categoryId: cat2.id, price: 1800, costPrice: 1100, stockLevel: 8, minStockLevel: 10, unit: 'pcs', status: client_1.ProductStatus.ACTIVE },
        { name: 'Server Rack Cabinet 42U', sku: 'SRK-42U', category: 'Hardware', categoryId: cat2.id, price: 950, costPrice: 520, stockLevel: 25, minStockLevel: 5, unit: 'pcs', status: client_1.ProductStatus.ACTIVE },
    ];
    const createdProds = [];
    for (const p of products) {
        const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
        if (!existing) {
            const prod = await prisma.product.create({ data: p });
            createdProds.push(prod);
        }
        else {
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
            status: client_1.POStatus.ORDERED,
        }
    });
    await prisma.warehouse.createMany({
        data: [
            { name: 'Dubai Central Logistics Hub', location: 'Jebel Ali Freezone, Dubai', capacity: 10000 },
            { name: 'Riyadh Distribution Center', location: 'Industrial City, Riyadh', capacity: 7500 },
        ],
        skipDuplicates: true,
    });
    console.log('  ✓ Inventory Categories, Suppliers, Products, POs, and Warehouses seeded');
    const project = await prisma.project.create({
        data: {
            name: 'ERP Digital Transformation Phase 2',
            description: 'Upgrading enterprise system to microservices architecture with real-time analytics',
            status: client_1.ProjectStatus.IN_PROGRESS,
            priority: client_1.Priority.HIGH,
            progress: 50,
            startDate: new Date('2026-06-01'),
        },
    });
    if (activeEmpIds.length > 0) {
        await prisma.task.createMany({
            data: [
                { title: 'Implement RBAC Route Guards', projectId: project.id, assignedEmployeeId: activeEmpIds[0], status: 'DONE', priority: client_1.Priority.HIGH },
                { title: 'Database Optimization & Seeding', projectId: project.id, assignedEmployeeId: activeEmpIds[4], status: 'IN_PROGRESS', priority: client_1.Priority.HIGH },
            ],
        });
    }
    console.log('  ✓ Projects and Tasks seeded');
    await prisma.invoice.createMany({
        data: [
            { invoiceNo: 'INV-2026-101', clientName: 'Apex Global Inc', amount: 14500, status: client_1.InvoiceStatus.PAID, dueDate: new Date('2026-08-30') },
            { invoiceNo: 'INV-2026-102', clientName: 'Skyline Corp', amount: 28000, status: client_1.InvoiceStatus.UNPAID, dueDate: new Date('2026-09-15') },
        ],
        skipDuplicates: true,
    });
    await prisma.expense.createMany({
        data: [
            { description: 'Cloud Infrastructure Servers (AWS)', amount: 4200, category: client_1.ExpenseCategory.OPERATIONAL, date: new Date() },
            { description: 'Monthly Payroll Disbursement', amount: 52000, category: client_1.ExpenseCategory.PAYROLL, date: new Date() },
        ],
        skipDuplicates: true,
    });
    await prisma.ledgerEntry.createMany({
        data: [
            { account: '1010-CASH', type: client_1.LedgerType.DEBIT, amount: 14500, description: 'Customer Invoice Payment Received' },
            { account: '4000-REVENUE', type: client_1.LedgerType.CREDIT, amount: 14500, description: 'Revenue Recognition INV-2026-101' },
            { account: '5000-OPERATIONAL-EXPENSE', type: client_1.LedgerType.DEBIT, amount: 4200, description: 'Cloud Infrastructure Payment' },
            { account: '1010-CASH', type: client_1.LedgerType.CREDIT, amount: 4200, description: 'Bank Payout for Infrastructure' },
        ],
        skipDuplicates: true,
    });
    console.log('  ✓ Finance Invoices, Expenses, and Balanced Double-Entry Ledger seeded');
    const adminUserId = createdUserMap['pranesh@shuroq.com'] || createdUserMap['admin@shuroq.com'];
    if (adminUserId) {
        await prisma.notification.createMany({
            data: [
                { userId: adminUserId, title: 'Stock Alert: Fiber Optics', message: 'Inventory fell below minimum threshold (12 units remaining).', type: 'WARNING' },
                { userId: adminUserId, title: 'Leave Request Approved', message: 'Arthur Vance vacation request has been approved.', type: 'SUCCESS' },
                { userId: adminUserId, title: 'Invoice INV-2026-101 Paid', message: 'Apex Global Inc completed payment of $14,500.', type: 'INFO' },
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
//# sourceMappingURL=seed.js.map