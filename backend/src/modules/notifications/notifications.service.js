// ============================================================
// Notifications Module (src/modules/notifications/)
// Firebase FCM + in-app notifications
// ============================================================

const admin = require('firebase-admin');
const { db } = require('../../config/database');
const logger = require('../../utils/logger');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
    logger.info('Firebase Admin initialized');
  }
} catch (err) {
  logger.warn('Firebase not initialized — push notifications disabled');
}

const notificationsService = {
  // Send push + save to DB
  async send(userId, { type, title, body, data = {} }) {
    try {
      // Save to DB
      await db.query(`
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, type, title, body, JSON.stringify(data)]);

      // Get FCM token
      const user = await db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]).then(r => r.rows[0]);
      if (user?.fcm_token && firebaseInitialized) {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: { title, body },
          data: { ...data, type },
          android: { priority: 'high', notification: { channelId: 'worknear_default', icon: 'ic_notification', color: '#F4600C' } },
          apns: { payload: { aps: { badge: 1, sound: 'default' } } }
        });
      }
    } catch (err) {
      logger.error('Notification send error:', err);
    }
  },

  // Notify all nearby available workers about a new job
  async notifyNearbyWorkers(job, lat, lng, categoryId) {
    const radius = 15; // km
    const workers = await db.query(`
      SELECT wp.user_id, u.fcm_token
      FROM worker_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.is_available = TRUE
        AND u.status = 'active'
        AND ST_DWithin(wp.current_location::geography, ST_MakePoint($1, $2)::geography, $3 * 1000)
        AND EXISTS (
          SELECT 1 FROM worker_skills ws
          WHERE ws.worker_id = wp.id AND ws.category_id = $4
        )
      LIMIT 50
    `, [lng, lat, radius, categoryId]).then(r => r.rows);

    logger.info(`Notifying ${workers.length} workers about job ${job.id}`);

    const notifications = workers.map(worker =>
      notificationsService.send(worker.user_id, {
        type: 'job_posted',
        title: `New ${job.category_name || 'Job'} near you! ${job.is_urgent ? '🚨 URGENT' : ''}`,
        body: `${job.title} — ₹${job.budget_max || 'Negotiable'}`,
        data: { job_id: job.id }
      })
    );

    await Promise.allSettled(notifications);
  },

  async list(userId, { page = 1, limit = 30 } = {}) {
    const offset = (page - 1) * limit;
    return db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]).then(r => r.rows);
  },

  async markRead(id, userId) {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  },

  async markAllRead(userId) {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
  },

  async getUnreadCount(userId) {
    return db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    ).then(r => parseInt(r.rows[0].count));
  }
};

module.exports = { notificationsService, notifyNearbyWorkers: notificationsService.notifyNearbyWorkers.bind(notificationsService) };

/* ─────────────────────────────────────────────────────────── */
