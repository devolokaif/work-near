// ─── auth.service.js ────────────────────────────────────────
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../../config/database');
const { redis } = require('../../config/redis');
const { sendSMS } = require('../../utils/sms');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const OTP_EXPIRY = 300; // 5 minutes

const authService = {
  async sendOTP(phone) {
    // Rate limit: max 3 OTPs per phone per 10 minutes
    const key = `otp:limit:${phone}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 5) throw new AppError('Too many OTP requests. Try again in 1 minutes.', 429);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(otp, 8);

    await redis.setex(`otp:${phone}`, OTP_EXPIRY, hash);

    // In production: use Twilio/MSG91
    if (process.env.NODE_ENV === 'production') {
      await sendSMS(phone, `Your WorkNear OTP is ${otp}. Valid for 5 minutes. Do not share.`);
    } else {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    }
  },

  async verifyOTP(phone, otp) {
    const storedHash = await redis.get(`otp:${phone}`);
    if (!storedHash) throw new AppError('OTP expired or not found', 400);

    const valid = await bcrypt.compare(otp, storedHash);
    if (!valid) throw new AppError('Invalid OTP', 400);

    await redis.del(`otp:${phone}`);

    const client = await db.connect();
    await client.query('BEGIN');
    // Check if user exists
    const user = await client.query(
      'SELECT id, full_name FROM users WHERE phone = $1',
      [phone]
    ).then(r => r.rows[0]);
    console.log("USER FOUND:", user);

    if (!user) {
      // New user - return temp token for registration
      const tempToken = jwt.sign({ phone, purpose: 'register' }, JWT_SECRET, { expiresIn: '15m' });
      return { exists: false, token: tempToken };
    }

    if (user.status === 'suspended') throw new AppError('Account suspended', 403);

    const tokens = authService.generateTokens(user);
    await authService.saveRefreshToken(user.id, tokens.refresh_token);
    return { exists: true, user, ...tokens };
  },

  async register({ phone, full_name, role, token }) {
    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
    if (decoded.phone !== phone || decoded.purpose !== 'register') {
      throw new AppError('Invalid token', 401);
    }

    // Check phone not already registered
    const existing = await db.query('SELECT id FROM users WHERE phone = $1', [phone]).then(r => r.rows[0]);
    if (existing) throw new AppError('Phone already registered', 409);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query(
        `INSERT INTO users (phone, full_name, role, status) 
         VALUES ($1, $2, $3, 'active') RETURNING id, phone, full_name, role`,
        [phone, full_name, role]
      ).then(r => r.rows[0]);

      // Create role-specific profile
      if (role === 'worker') {
        await client.query('INSERT INTO worker_profiles (user_id) VALUES ($1)', [user.id]);
        await client.query('INSERT INTO wallets (user_id) VALUES ($1)', [user.id]);
      }

      await client.query('COMMIT');
      const tokens = authService.generateTokens(user);
      await authService.saveRefreshToken(user.id, tokens.refresh_token);
      return { user, ...tokens };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  generateTokens(user) {
    const payload = { id: user.id, role: user.role };
    const access_token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refresh_token = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
    return { access_token, refresh_token, expires_in: 3600 };
  },

  async saveRefreshToken(userId, token) {
    await redis.setex(`refresh:${userId}:${token.slice(-20)}`, 30 * 86400, token);
  },

  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      const user = await db.query(
        'SELECT id, role, status FROM users WHERE id = $1',
        [decoded.id]
      ).then(r => r.rows[0]);
      if (!user || user.status === 'suspended') throw new AppError('User not found', 404);
      return authService.generateTokens(user);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  },

  async logout(userId, token) {
    if (token) {
      // Blacklist the access token
      await redis.setex(`blacklist:${token}`, 3600, '1');
    }
  }
};

module.exports = authService;