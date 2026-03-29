// ─── jobs.service.js ────────────────────────────────────────
const { db } = require('../../config/database');
const { redis } = require('../../config/redis');
const AppError = require('../../utils/AppError');
const { notifyNearbyWorkers } = require('../notifications/notifications.service');

const jobsService = {
  async listJobs({ status, category, city, page = 1, limit = 20, employerId } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`j.status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`j.category_id = $${idx++}`); params.push(category); }
    if (city) { conditions.push(`j.city ILIKE $${idx++}`); params.push(`%${city}%`); }
    if (employerId) { conditions.push(`j.employer_id = $${idx++}`); params.push(employerId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [jobs, total] = await Promise.all([
      db.query(`
        SELECT j.*, u.full_name as employer_name, u.rating as employer_rating,
               u.profile_photo as employer_photo, c.name as category_name, c.icon_url as category_icon
        FROM jobs j
        JOIN users u ON u.id = j.employer_id
        JOIN categories c ON c.id = j.category_id
        ${where}
        ORDER BY j.is_urgent DESC, j.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, [...params, limit, offset]).then(r => r.rows),

      db.query(`SELECT COUNT(*) FROM jobs j ${where}`, params).then(r => parseInt(r.rows[0].count))
    ]);

    return { jobs, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getNearbyJobs({ lat, lng, radius = 10, category, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [lng, lat, radius * 1000, limit, offset];
    let categoryClause = '';
    if (category) {
      params.push(category);
      categoryClause = `AND j.category_id = $${params.length}`;
    }

    const jobs = await db.query(`
      SELECT j.*,
        ST_Distance(j.location::geography, ST_MakePoint($1, $2)::geography) / 1000 as distance_km,
        u.full_name as employer_name, u.rating as employer_rating,
        c.name as category_name, c.icon_url as category_icon
      FROM jobs j
      JOIN users u ON u.id = j.employer_id
      JOIN categories c ON c.id = j.category_id
      WHERE j.status = 'open'
        AND ST_DWithin(j.location::geography, ST_MakePoint($1, $2)::geography, $3)
        ${categoryClause}
      ORDER BY j.is_urgent DESC, distance_km ASC, j.created_at DESC
      LIMIT $4 OFFSET $5
    `, params).then(r => r.rows);

    return jobs;
  },

  async getJob(id, userId) {
    const job = await db.query(`
      SELECT j.*, u.full_name as employer_name, u.rating as employer_rating,
             u.profile_photo as employer_photo, u.phone as employer_phone,
             c.name as category_name, c.icon_url as category_icon,
             (SELECT COUNT(*) FROM bookings b WHERE b.job_id = j.id) as application_count
      FROM jobs j
      JOIN users u ON u.id = j.employer_id
      JOIN categories c ON c.id = j.category_id
      WHERE j.id = $1
    `, [id]).then(r => r.rows[0]);

    if (!job) throw new AppError('Job not found', 404);

    // Increment view count (non-blocking)
    db.query('UPDATE jobs SET views_count = views_count + 1 WHERE id = $1', [id]).catch(() => {});

    return job;
  },

  async createJob(data, employerId) {
    const {
      title, description, category_id, lat, lng, address_text, city, state, pincode,
      budget_min, budget_max, duration_hours, workers_needed = 1, is_urgent = false,
      scheduled_at, photos = [], requirements = []
    } = data;

    const job = await db.query(`
      INSERT INTO jobs (
        employer_id, category_id, title, description, location, address_text,
        city, state, pincode, budget_min, budget_max, duration_hours,
        workers_needed, is_urgent, scheduled_at, photos, requirements
      ) VALUES (
        $1, $2, $3, $4, ST_MakePoint($5, $6)::geography,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `, [
      employerId, category_id, title, description, lng, lat, address_text,
      city, state, pincode, budget_min, budget_max, duration_hours,
      workers_needed, is_urgent, scheduled_at, photos, requirements
    ]).then(r => r.rows[0]);

    // Notify nearby workers asynchronously
    notifyNearbyWorkers(job, lat, lng, category_id).catch(err =>
      console.error('Notify workers failed:', err)
    );

    // Invalidate cache
    await redis.del('jobs:*');

    return job;
  },

  async updateJob(id, data, userId, userRole) {
    const job = await db.query('SELECT * FROM jobs WHERE id = $1', [id]).then(r => r.rows[0]);
    if (!job) throw new AppError('Job not found', 404);
    if (job.employer_id !== userId && userRole !== 'admin') throw new AppError('Unauthorized', 403);
    if (!['open'].includes(job.status)) throw new AppError('Cannot edit job in current status', 400);

    const allowed = ['title', 'description', 'budget_min', 'budget_max', 'duration_hours', 'is_urgent', 'scheduled_at', 'workers_needed'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        params.push(data[key]);
      }
    }

    if (!updates.length) throw new AppError('No valid fields to update', 400);
    params.push(id);

    return db.query(
      `UPDATE jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    ).then(r => r.rows[0]);
  },

  async deleteJob(id, userId, userRole) {
    const job = await db.query('SELECT * FROM jobs WHERE id = $1', [id]).then(r => r.rows[0]);
    if (!job) throw new AppError('Job not found', 404);
    if (job.employer_id !== userId && userRole !== 'admin') throw new AppError('Unauthorized', 403);
    if (['in_progress', 'assigned'].includes(job.status)) {
      throw new AppError('Cannot delete active job', 400);
    }
    await db.query("UPDATE jobs SET status = 'cancelled' WHERE id = $1", [id]);
    return { message: 'Job cancelled successfully' };
  }
};

module.exports = jobsService;
