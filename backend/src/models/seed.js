// Optional seed script: create an admin and a sample user
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getPrisma } = require('../config/db');

async function main() {
  const prisma = getPrisma();
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const userEmail = process.env.SEED_USER_EMAIL || 'seed@example.com';
  const password = process.env.SEED_PASSWORD || 'Password123!';

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash, role: 'ADMIN' },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    create: { email: userEmail, passwordHash, role: 'USER' },
    update: {},
  });

  console.log('Seed complete:', { adminEmail, userEmail, password });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
