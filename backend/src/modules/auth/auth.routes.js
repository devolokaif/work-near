// ============================================================
// Auth Module (src/modules/auth/)
// OTP-based phone auth + JWT
// ============================================================

// ─── auth.routes.js ──────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('./auth.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');

router.post('/send-otp',
  [body('phone').isMobilePhone('en-IN')],
  validate,
  authController.sendOTP
);

router.post('/verify-otp',
  [
    body('phone').isMobilePhone('en-IN'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric()
  ],
  validate,
  authController.verifyOTP
);

router.post('/register',
  [
    body('phone').isMobilePhone('en-IN'),
    body('full_name').trim().isLength({ min: 2, max: 100 }),
    body('role').isIn(['worker', 'employer']),
    body('token').notEmpty()
  ],
  validate,
  authController.register
);

router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

module.exports = router;



