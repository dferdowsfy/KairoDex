const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const base = {
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
};

if (!isProd && !process.env.NO_PRETTY_LOGS) {
  try {
    // Ensure pino-pretty is resolvable in current env before using transport
    require.resolve('pino-pretty');
    base.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    };
  } catch (_e) {
    // Fallback to JSON logs when pino-pretty isn't available (e.g., tests)
  }
}

const logger = pino(base);

module.exports = logger;
