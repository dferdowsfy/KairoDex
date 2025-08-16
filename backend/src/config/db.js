const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Enable connection pooling by reusing a single PrismaClient instance
let prisma;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }
  return prisma;
}

module.exports = { getPrisma };
