const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { getPrisma } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function start() {
  // Touch Prisma once to init connection pool early
  try {
    await getPrisma().$connect();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'API server listening');
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down...');
    server.close(async () => {
      await getPrisma().$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
