/**
 * TEAM_LEAD existed as an assignable role with zero real permissions (only
 * SELF:ALL, from the earlier add-self-permission.ts run) — found during the
 * Phase 1 RBAC sweep. Grants it PROJECTS:READ/WRITE + HR:READ + ANALYTICS:READ
 * (PROJECT_MANAGER's set minus DELETE) and creates the missing demo login,
 * without touching any other seed data.
 *
 * Run with: npx ts-node scripts/fix-team-lead-role.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const GRANTS: { module: string; action: string }[] = [
  { module: 'PROJECTS', action: 'READ' },
  { module: 'PROJECTS', action: 'WRITE' },
  { module: 'HR', action: 'READ' },
  { module: 'ANALYTICS', action: 'READ' },
];

async function main() {
  const role = await prisma.role.findUnique({ where: { name: 'TEAM_LEAD' } });
  if (!role) throw new Error('TEAM_LEAD role not found — was the base seed run?');

  for (const grant of GRANTS) {
    const existing = await prisma.permission.findFirst({
      where: { roleId: role.id, module: grant.module as any, action: grant.action as any },
    });
    if (existing) {
      console.log(`  TEAM_LEAD: already has ${grant.module}:${grant.action}`);
      continue;
    }
    await prisma.permission.create({
      data: { roleId: role.id, module: grant.module as any, action: grant.action as any },
    });
    console.log(`  TEAM_LEAD: granted ${grant.module}:${grant.action}`);
  }

  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'teamlead@shuroq.com' },
    update: { roleId: role.id },
    create: { email: 'teamlead@shuroq.com', passwordHash, roleId: role.id },
  });
  console.log(`  Demo account ready: teamlead@shuroq.com (${user.id})`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
