/**
 * One-off bulk reset: every account in this local dev database gets the
 * password "12345678", by explicit user request. Writes both the bcrypt
 * hash (what login actually checks) and the encrypted passwordPlain copy
 * (what User Management displays to HR/Admin), the same two fields
 * resetUserPassword() writes for a single account.
 *
 * Run with: npx ts-node scripts/set-all-passwords.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encryptField } from '../src/common/field-encryption';

const prisma = new PrismaClient();
const PASSWORD = '12345678';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, email: true } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const passwordPlain = encryptField(PASSWORD);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordPlain },
    });
    console.log(`  ${user.username ?? user.email} -> password set to "${PASSWORD}"`);
  }

  console.log(`\n  Updated ${users.length} account(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
