const { getPrisma } = require('../config/db');

function prisma() {
  return getPrisma();
}

async function createUser({ email, passwordHash, role }) {
  return prisma().user.create({ data: { email, passwordHash, role } });
}

async function getUserByEmail(email) {
  return prisma().user.findUnique({ where: { email } });
}

async function listUsers({ skip, take }) {
  const [items, total] = await Promise.all([
    prisma().user.findMany({ skip, take, orderBy: { id: 'asc' }, select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } }),
    prisma().user.count(),
  ]);
  return { items, total };
}

module.exports = { createUser, getUserByEmail, listUsers };
