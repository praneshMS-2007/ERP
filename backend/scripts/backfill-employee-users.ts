/**
 * Every employee in the Employee Directory is supposed to have an ERP login
 * in User Management — that's how createEmployee() already works for new
 * hires (see hrm.service.ts). Five pre-seeded employees (Arthur Vance, Elena
 * Choi, Lucas Scott, Marcus Thorne, Sarah Jenkins) predate that flow and were
 * never given one. This is a one-time catch-up: generates the same kind of
 * username + temporary password createEmployee() would have, for every
 * current (non-INACTIVE) employee still missing a linked User.
 *
 * Run with: npx ts-node scripts/backfill-employee-users.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateUsername, generateTemporaryPassword } from '../src/common/credentials';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaClient();

async function main() {
  const employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
  if (!employeeRole) throw new Error('EMPLOYEE role not found — was the base seed run?');

  const orphans = await prisma.employee.findMany({
    where: { userId: null, status: { not: 'INACTIVE' } },
  });

  if (orphans.length === 0) {
    console.log('  Every current employee already has a linked User account.');
    return;
  }

  for (const employee of orphans) {
    const username = await generateUsername(prisma as unknown as PrismaService, employee.firstName, employee.lastName);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: { username, passwordHash, roleId: employeeRole.id, isActive: true },
    });
    await prisma.employee.update({ where: { id: employee.id }, data: { userId: user.id } });

    console.log(`  ${employee.firstName} ${employee.lastName} (${employee.empCode ?? employee.id}) -> username: ${username}  password: ${temporaryPassword}`);
  }

  console.log(`\n  Created ${orphans.length} account(s). Hand these credentials to each person directly — they are not stored in plain text and will not be shown again.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
