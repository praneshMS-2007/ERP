/**
 * Adds SELF:ALL to every existing role, without touching any other seed
 * data — re-running the full seed script would also re-touch CRM/Inventory/
 * Finance demo data, which is riskier than this narrow, idempotent addition.
 *
 * Run with: npx ts-node scripts/add-self-permission.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany();
  for (const role of roles) {
    const existing = await prisma.permission.findFirst({
      where: { roleId: role.id, module: 'SELF', action: 'ALL' },
    });
    if (existing) {
      console.log(`  ${role.name}: already has SELF:ALL`);
      continue;
    }
    await prisma.permission.create({ data: { roleId: role.id, module: 'SELF', action: 'ALL' } });
    console.log(`  ${role.name}: granted SELF:ALL`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
