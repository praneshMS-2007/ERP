const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const h = await bcrypt.hash('password123', 10);
  await p.user.update({ where: { email: 'admin@shuroq.com' }, data: { passwordHash: h } });
  console.log('Updated hash for admin@shuroq.com');
  
  const u = await p.user.findUnique({ where: { email: 'admin@shuroq.com' } });
  const ok = await bcrypt.compare('password123', u.passwordHash);
  console.log('Verify password123:', ok);
  
  await p.$disconnect();
})();
