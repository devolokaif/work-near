// ============================================================
// Database Config (src/config/database.js)
// Connection pooling optimized for high throughput
// ============================================================
const { Pool } = require('pg');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  ssl: false
});

pool.on('connect', () => {
  logger.info('PostgreSQL pool connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error:', err);
});



async function connectDB() {
  try {
    const client = await pool.connect();

    // Test connection
    const res = await client.query('SELECT NOW()');
    console.log('DB Time:', res.rows[0]);

    // Load schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    // const schema = fs.readFileSync(schemaPath, 'utf8');
    // await client.query(schema);

    console.log('Database schema loaded');
    client.release();

    logger.info(`PostgreSQL connected successfully (pool max: ${pool.options.max})`);
  } catch (err) {
    console.error('DATABASE CONNECTION ERROR FULL:', err);
    logger.error('Database connection failed: ' + err.message);
    process.exit(1);
  }
}


// async function connectDB() {
//   try {
//     const client = await pool.connect();
//     const res = await client.query('SELECT NOW()');
//     console.log('DB Time:', res.rows[0]);
//     client.release();
//     logger.info(`PostgreSQL connected successfully (pool max: ${pool.options.max})`);
//   } catch (err) {
//     console.error('DATABASE CONNECTION ERROR FULL:', err);
//     logger.error('Database connection failed: ' + err.message);
//     process.exit(1);
//   }
// }

module.exports = {
  db: pool,
  connectDB
};
/* ─────────────────────────────────────────────────────────── */


/* ─────────────────────────────────────────────────────────── */

// ─── .env.example ────────────────────────────────────────────
/*
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/worknear

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# SMS (Twilio or MSG91)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Firebase (Push notifications)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Google Maps
GOOGLE_MAPS_API_KEY=

# Storage (AWS S3 or Cloudflare R2)
S3_BUCKET=worknear-assets
S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Frontend
ALLOWED_ORIGINS=http://localhost:5173,https://worknear.in
*/