// ─── authorize.js ────────────────────────────────────────────
const AppError = require('../utils/AppError');

module.exports = function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};