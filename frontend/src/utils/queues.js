// ============================================================
// Background Job Queues (src/utils/queues.js)
// Bull + Redis for scalable background processing
// ============================================================

const Bull = require('bull');
const logger = require('./logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
};

// ── Queue Definitions ────────────────────────────────────────
const notificationQueue = new Bull('notifications', { redis: redisConfig });
const emailQueue = new Bull('emails', { redis: redisConfig });
const smsQueue = new Bull('sms', { redis: redisConfig });
const payoutQueue = new Bull('payouts', { redis: redisConfig });
const locationArchiveQueue = new Bull('location-archive', { redis: redisConfig });

// ── Notification Processor ───────────────────────────────────
notificationQueue.process(async (job) => {
  const { userId, type, title, body, data } = job.data;
  const { notificationsService } = require('../modules/notifications/notifications.service');
  await notificationsService.send(userId, { type, title, body, data });
  logger.info(`Notification sent: ${type} → user ${userId}`);
});

// ── SMS Processor ────────────────────────────────────────────
smsQueue.process(async (job) => {
  const { phone, message } = job.data;
  const { sendSMS } = require('./sms');
  await sendSMS(phone, message);
  logger.info(`SMS sent to ${phone}`);
});

// ── Location Archive Processor ───────────────────────────────
// Archives old location data from Redis to DB in batches
locationArchiveQueue.process(async (job) => {
  const { bookingId } = job.data;
  logger.info(`Archiving location data for booking ${bookingId}`);
  // Already handled by periodic writes in socketManager
  // This cleans up Redis keys older than 24h
  const { redis } = require('../config/redis');
  await redis.del(`location:${bookingId}`);
});

// ── Payout Processor ─────────────────────────────────────────
payoutQueue.process(async (job) => {
  const { userId, amount, upiId, bankAccountNumber, bankIfsc } = job.data;
  logger.info(`Processing payout for user ${userId}: ₹${amount}`);
  // In production: call Razorpay Payout API
  // razorpay.payouts.create({...})
  const { db } = require('../config/database');
  // Release locked funds
  await db.query(
    'UPDATE wallets SET locked = locked - $1 WHERE user_id = $2 AND locked >= $1',
    [amount, userId]
  );
});

// ── Error Handling ───────────────────────────────────────────
[notificationQueue, emailQueue, smsQueue, payoutQueue, locationArchiveQueue].forEach(queue => {
  queue.on('failed', (job, err) => {
    logger.error(`Queue ${queue.name} job ${job.id} failed:`, err.message);
  });
  queue.on('completed', (job) => {
    logger.debug(`Queue ${queue.name} job ${job.id} completed`);
  });
});

// ── Helper Functions ─────────────────────────────────────────
async function queueNotification(userId, type, title, body, data = {}) {
  await notificationQueue.add({ userId, type, title, body, data }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  });
}

async function queueSMS(phone, message) {
  await smsQueue.add({ phone, message }, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: true
  });
}

async function queuePayout(userId, amount, paymentDetails) {
  await payoutQueue.add({ userId, amount, ...paymentDetails }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnFail: false
  });
}

module.exports = {
  notificationQueue,
  emailQueue,
  smsQueue,
  payoutQueue,
  locationArchiveQueue,
  queueNotification,
  queueSMS,
  queuePayout
};