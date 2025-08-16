const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.expose ? err.message : status === 500 ? 'Internal Server Error' : err.message;
  const details = err.details || undefined;

  if (status >= 500) {
    logger.error({ err, path: req.path }, 'Unhandled error');
  } else {
    logger.warn({ err, path: req.path }, 'Handled error');
  }

  res.status(status).json({ error: { code, message, details } });
}

module.exports = errorHandler;
