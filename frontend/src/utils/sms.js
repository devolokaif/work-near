// ============================================================
// SMS Utility (src/utils/sms.js)
// Twilio / MSG91 integration
// ============================================================

const logger = require('./logger');

async function sendSMS(phone, message) {
  if (process.env.SMS_PROVIDER === 'twilio') {
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    logger.info(`SMS sent via Twilio to ${phone}`);
  } else if (process.env.SMS_PROVIDER === 'msg91') {
    const axios = require('axios');
    await axios.post('https://api.msg91.com/api/v5/otp', {
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: phone.replace('+', ''),
      authkey: process.env.MSG91_AUTH_KEY,
      otp: message.match(/\d{6}/)?.[0]
    });
    logger.info(`SMS sent via MSG91 to ${phone}`);
  } else {
    logger.warn(`[SMS MOCK] To: ${phone} | Message: ${message}`);
  }
}

module.exports = { sendSMS };

/* ─────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────── */

// ─── .env.production (TEMPLATE — fill in real values) ───────
/*
NODE_ENV=production
PORT=5000

# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://worknear:STRONG_PASSWORD@postgres:5432/worknear

# ── Redis ─────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD

# ── JWT (generate with: openssl rand -base64 64) ──────────
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_64_CHAR_RANDOM_STRING

# ── Razorpay (from dashboard.razorpay.com) ────────────────
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX

# ── SMS Provider (choose one) ─────────────────────────────
SMS_PROVIDER=msg91

# MSG91 (recommended for India)
MSG91_AUTH_KEY=XXXXXXXXXXXXXXXXXXXXXX
MSG91_TEMPLATE_ID=XXXXXXXXXXXXXX

# Twilio (alternative)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# ── Firebase (Push Notifications) ─────────────────────────
FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json

# ── Google Maps (for reverse geocoding) ───────────────────
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# ── AWS S3 (for file uploads) ─────────────────────────────
S3_BUCKET=worknear-assets
S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=https://worknear.in,https://www.worknear.in

# ── Logging ───────────────────────────────────────────────
LOG_LEVEL=info
*/