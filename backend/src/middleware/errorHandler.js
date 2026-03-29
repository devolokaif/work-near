// ─── errorHandler.js ─────────────────────────────────────────
const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    logger.error(`[${req.id}] ${req.method} ${req.url} - ${message}`, {
      stack: err.stack,
      body: req.body
    });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    request_id: req.id
  });
};