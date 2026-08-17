/**
 * HR_MANAGER's PROJECTS grant moves from READ to ALL, as part of the
 * project-staffing feature — HR is meant to be able to create/delete
 * projects and manage staffing. Removes the old READ row and adds ALL,
 * idempotently, without touching any other seed data.
 *
 * Run with: npx ts-node scripts/upgrade-hr-manager-projects.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({ where: { name: 'HR_MANAGER' } });
  if (!role) throw new Error('HR_MANAGER role not found — was the base seed run?');

  const existingAll = await prisma.permission.findFirst({
    where: { roleId: role.id, module: 'PROJECTS', action: 'ALL' },
  });
  if (existingAll) {
    console.log('  HR_MANAGER: already has PROJECTS:ALL');
    return;
  }

  await prisma.permission.deleteMany({ where: { roleId: role.id, module: 'PROJECTS' } });
  await prisma.permission.create({ data: { roleId: role.id, module: 'PROJECTS', action: 'ALL' } });
  console.log('  HR_MANAGER: upgraded PROJECTS to ALL');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
