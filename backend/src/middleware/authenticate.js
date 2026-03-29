// ============================================================
// Middleware (src/middleware/)
// ============================================================

// ─── authenticate.js ─────────────────────────────────────────
const jwt = require('jsonwebtoken');
const { redis } = require('../config/redis');
const AppError = require('../utils/AppError');

module.exports = async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError('No token provided', 401);

    const token = header.split(' ')[1];

    // Check blacklist
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) throw new AppError('Token revoked', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401));
    next(err);
  }
};

