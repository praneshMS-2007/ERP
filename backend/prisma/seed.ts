import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encryptField } from '../src/common/field-encryption';

const prisma = new PrismaClient();

/**
 * Production baseline seed — NOT a demo/fixture data set.
 *
 * This creates only what the application structurally cannot function
 * without: the RBAC role/permission schema, and exactly one bootstrap
 * Super Admin account. Everything else — every department, designation,
 * employee, product, project, CRM record, finance record, attendance,
 * payroll, document, notification, and audit log — is real production
 * data that must be created through the actual app by the people who will
 * actually run this company, never seeded fake.
 *
 * Roles and permissions are deliberately not treated as "seed data" to
 * wipe: they are the authorization system's own configuration. Without
 * them, User.roleId (a required foreign key) could not even be satisfied
 * to create the bootstrap admin below.
 */
async function main() {
  console.log('🌱 Seeding production baseline (roles + one bootstrap admin only)...');

  // ========== ROLES & PERMISSIONS ==========
  // PROJECT_MANAGER and TEAM_LEAD are deliberately not system-wide roles:
  // project-management authority is project-scoped (Project.projectManagerId,
  // set only by HR/Admin via updateProjectStaffing — see projects.service.ts's
  // canManageProject/isProjectManagerOf), not something granted at account
  // level. There is no "Team Lead" tier at all.
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access across all enterprise modules' },
    { name: 'HR_MANAGER', description: 'Human Resources, Payroll, and Employee Portal' },
    { name: 'FINANCE_MANAGER', description: 'General Ledger, Invoices, Expenses, and Tax records' },
    { name: 'SALES_MANAGER', description: 'CRM Pipeline, Customer Directory, and Support Tickets' },
    { name: 'INVENTORY_MANAGER', description: 'Product Catalog, Warehouses, Sales & Purchase Orders' },
    { name: 'EMPLOYEE', description: 'Standard employee self-service portal access' },
  ];

  const createdRoles: Record<string, string> = {};
  for (const role of roles) {
    const r = await prisma.role.upsert({ where: { name: role.name }, update: { description: role.description }, create: role });
    createdRoles[r.name] = r.id;
  }
  console.log('  ✓ 6 Enterprise Roles created');

  const permissionMap: Record<string, { module: string; action: string }[]> = {
    SUPER_ADMIN: [
      { module: 'HR', action: 'ALL' }, { module: 'CRM', action: 'ALL' },
      { module: 'INVENTORY', action: 'ALL' }, { module: 'PROJECTS', action: 'ALL' },
      { module: 'FINANCE', action: 'ALL' }, { module: 'ANALYTICS', action: 'ALL' },
      { module: 'ADMIN', action: 'ALL' },
    ],
    HR_MANAGER: [
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
    EMPLOYEE: [
      { module: 'HR', action: 'READ' }, { module: 'PROJECTS', action: 'READ' },
    ],
  };
  for (const perms of Object.values(permissionMap)) perms.push({ module: 'SELF', action: 'ALL' });

  for (const [roleName, perms] of Object.entries(permissionMap)) {
    const roleId = createdRoles[roleName];
    await prisma.permission.deleteMany({ where: { roleId } });
    for (const perm of perms) {
      await prisma.permission.create({ data: { roleId, module: perm.module as any, action: perm.action as any } });
    }
  }
  console.log('  ✓ Module Permissions assigned');

  // ========== BOOTSTRAP SUPER ADMIN ==========
  // The one account that must exist for the application to be usable at
  // all — a pure system account, not tied to any department or Employee
  // record. Every other account, department, and piece of real data from
  // here on is created by the company itself, through the actual app.
  const passwordHash = await bcrypt.hash('12345678', 10);
  await prisma.user.upsert({
    where: { email: 'admin@shuroq.com' },
    update: { passwordHash, passwordPlain: encryptField('12345678'), roleId: createdRoles.SUPER_ADMIN, isActive: true },
    create: {
      email: 'admin@shuroq.com', passwordHash, passwordPlain: encryptField('12345678'),
      roleId: createdRoles.SUPER_ADMIN,
    },
  });
  console.log('  ✓ Bootstrap Super Admin created (admin@shuroq.com)');

  console.log('\n======================================================');
  console.log('🎉 Production baseline ready — no demo data of any kind.');
  console.log('======================================================');
  console.log('Log in as admin@shuroq.com / 12345678 and build everything');
  console.log('else (departments, designations, employees, inventory,');
  console.log('CRM, projects, finance) through the app itself.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
