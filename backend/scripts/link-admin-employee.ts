/**
 * admin@shuroq.com (SUPER_ADMIN) had no linked Employee record — several
 * project actions (document uploads, holiday declarations, announcements)
 * need a real Employee id to attribute the action to, via
 * resolveEmployeeId() in projects.service.ts. Every other action that
 * requires the same lookup was already fine for named individuals (Farhan,
 * Rohan, Pranesh's own Super Admin login, etc.) — Admin was the one gap.
 *
 * Mirrors Pranesh's existing Super Admin Employee record (Operations /
 * Operations Director / FULL_TIME / ACTIVE) since that's the only other
 * SUPER_ADMIN with a real profile in this database.
 *
 * Run with: npx ts-node scripts/link-admin-employee.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function nextEmpCode(joinDate: Date): Promise<string> {
  const yy = String(joinDate.getFullYear()).slice(-2);
  const prefix = `SHR-${yy}-`;
  const existing = await prisma.employee.findMany({
    where: { empCode: { startsWith: prefix } },
    select: { empCode: true },
  });
  const highest = existing.reduce((max, { empCode }) => {
    const n = parseInt(empCode?.slice(prefix.length) ?? '', 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@shuroq.com' } });
  if (!user) throw new Error('admin@shuroq.com not found.');

  const existing = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (existing) {
    console.log(`  admin@shuroq.com is already linked to Employee ${existing.id} — nothing to do.`);
    return;
  }

  const department = await prisma.department.findUnique({ where: { name: 'Operations' } });
  const designation = await prisma.designation.findUnique({ where: { title: 'Operations Director' } });
  if (!department || !designation) throw new Error('Expected "Operations" department / "Operations Director" designation not found.');

  const joinDate = new Date();
  const empCode = await nextEmpCode(joinDate);

  const employee = await prisma.employee.create({
    data: {
      empCode,
      userId: user.id,
      firstName: 'Admin',
      lastName: 'User',
      empType: 'FULL_TIME',
      status: 'ACTIVE',
      joinDate,
      departmentId: department.id,
      designationId: designation.id,
    },
  });

  console.log(`  Created Employee ${employee.id} (${empCode}) and linked it to admin@shuroq.com (${user.id}).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
