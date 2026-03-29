// ============================================================
// Admin Module (src/modules/admin/)
// ============================================================

// ─── admin.routes.js ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { db } = require('../../config/database');
const { asyncHandler } = require('../../utils/asyncHandler');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// ── Dashboard Stats ─────────────────────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const [users, jobs, bookings, revenue] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'worker' THEN 1 END) as workers,
        COUNT(CASE WHEN role = 'employer' THEN 1 END) as employers,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
      FROM users WHERE role != 'admin'
    `).then(r => r.rows[0]),

    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_today
      FROM jobs
    `).then(r => r.rows[0]),

    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM bookings
    `).then(r => r.rows[0]),

    db.query(`
      SELECT
        COALESCE(SUM(platform_fee + gst), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN platform_fee + gst END), 0) as revenue_30d,
        COALESCE(SUM(worker_payout), 0) as total_worker_payouts
      FROM payments WHERE status = 'completed'
    `).then(r => r.rows[0])
  ]);

  res.json({ users, jobs, bookings, revenue });
}));

// ── User Management ─────────────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ["role != 'admin'"];
  let idx = 1;

  if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
  if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
  if (search) {
    conditions.push(`(full_name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const [users, total] = await Promise.all([
    db.query(`
      SELECT id, full_name, phone, email, role, status, rating, total_reviews,
        total_earnings, total_spent, is_verified, created_at
      FROM users ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]).then(r => r.rows),
    db.query(`SELECT COUNT(*) FROM users ${where}`, params).then(r => parseInt(r.rows[0].count))
  ]);

  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');

  const user = await db.query(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, status`,
    [status, req.params.id]
  ).then(r => r.rows[0]);

  res.json(user);
}));

router.patch('/users/:id/verify', asyncHandler(async (req, res) => {
  const user = await db.query(
    `UPDATE users SET is_verified = TRUE, status = 'active' WHERE id = $1 RETURNING id, full_name, is_verified`,
    [req.params.id]
  ).then(r => r.rows[0]);
  res.json(user);
}));

// ── Job Management ──────────────────────────────────────────
router.get('/jobs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE j.status = $1'; params.push(status); }

  const jobs = await db.query(`
    SELECT j.id, j.title, j.status, j.city, j.is_urgent, j.created_at,
      j.budget_max, j.applications_count, j.views_count,
      u.full_name as employer_name, c.name as category_name
    FROM jobs j
    JOIN users u ON u.id = j.employer_id
    JOIN categories c ON c.id = j.category_id
    ${where}
    ORDER BY j.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]).then(r => r.rows);

  res.json(jobs);
}));

// ── Payment Overview ────────────────────────────────────────
router.get('/payments', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  let where = '';
  if (status) { where = 'WHERE p.status = $1'; params.push(status); }

  const payments = await db.query(`
    SELECT p.*, payer.full_name as payer_name, payee.full_name as payee_name
    FROM payments p
    JOIN users payer ON payer.id = p.payer_id
    JOIN users payee ON payee.id = p.payee_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset]).then(r => r.rows);

  res.json(payments);
}));

// ── Dispute Management ──────────────────────────────────────
router.get('/disputes', asyncHandler(async (req, res) => {
  const disputes = await db.query(`
    SELECT b.*, j.title as job_title,
      w.full_name as worker_name, e.full_name as employer_name
    FROM bookings b
    JOIN jobs j ON j.id = b.job_id
    JOIN users w ON w.id = b.worker_id
    JOIN users e ON e.id = b.employer_id
    WHERE b.status = 'disputed'
    ORDER BY b.updated_at DESC
  `).then(r => r.rows);

  res.json(disputes);
}));

module.exports = router;