const rateLimit = require('express-rate-limit');

function createLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  });
}

function globalLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
  return createLimiter({ windowMs, max });
}

function authLimiter() {
  // Stricter auth limiter
  return createLimiter({ windowMs: 60_000, max: 20 });
}

module.exports = { globalLimiter, authLimiter };
