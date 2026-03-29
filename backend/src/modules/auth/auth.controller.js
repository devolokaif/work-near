// ─── auth.controller.js ─────────────────────────────────────
const authService = require('./auth.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const authController = {
  sendOTP: asyncHandler(async (req, res) => {
    const { phone } = req.body;
    await authService.sendOTP(phone);
    res.json({ message: 'OTP sent successfully', expires_in: 300 });
  }),

  verifyOTP: asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await authService.verifyOTP(phone, otp);
    res.json(result);
  }),

  register: asyncHandler(async (req, res) => {
    const { phone, full_name, role, token } = req.body;
    const result = await authService.register({ phone, full_name, role, token });
    res.status(201).json(result);
  }),

  refreshToken: asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    const tokens = await authService.refreshToken(refresh_token);
    res.json(tokens);
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.user.id, req.headers.authorization?.split(' ')[1]);
    res.json({ message: 'Logged out successfully' });
  })
};

module.exports = authController;