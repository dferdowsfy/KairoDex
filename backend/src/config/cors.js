const cors = require('cors');

function parseOrigins(originsStr) {
  if (!originsStr) return [];
  return originsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function buildCors() {
  const origins = parseOrigins(process.env.CORS_ORIGINS);
  return cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow non-browser clients
      if (origins.length === 0 || origins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
}

module.exports = { buildCors };
