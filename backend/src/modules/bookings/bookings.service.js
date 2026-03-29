// ============================================================
// Bookings Module (src/modules/bookings/)
// ============================================================

// ─── bookings.service.js ────────────────────────────────────
const { db } = require('../../config/database');
const { redis } = require('../../config/redis');
const AppError = require('../../utils/AppError');
const { getIO } = require('../../socket/socketManager');

const bookingsService = {
  async applyForJob(jobId, workerId, data) {
    const { proposed_rate, message } = data;

    const job = await db.query(
      `SELECT * FROM jobs WHERE id = $1 AND status = 'open'`,
      [jobId]
    ).then(r => r.rows[0]);

    if (!job) throw new AppError('Job not found or not open', 404);
    if (job.employer_id === workerId) throw new AppError('Cannot apply to your own job', 400);

    const existing = await db.query(
      `SELECT id FROM bookings WHERE job_id = $1 AND worker_id = $2 AND status NOT IN ('rejected','cancelled')`,
      [jobId, workerId]
    ).then(r => r.rows[0]);
    if (existing) throw new AppError('Already applied to this job', 409);

    const booking = await db.query(`
      INSERT INTO bookings (job_id, job_created_at, worker_id, employer_id, proposed_rate, message)
      SELECT $1, j.created_at, $2, j.employer_id, $3, $4
      FROM jobs j WHERE j.id = $1
      RETURNING *
    `, [jobId, workerId, proposed_rate, message]).then(r => r.rows[0]);

    // Update application count
    await db.query('UPDATE jobs SET applications_count = applications_count + 1 WHERE id = $1', [jobId]);

    // Notify employer via socket
    try {
      const io = getIO();
      io.to(`user:${job.employer_id}`).emit('new:application', {
        booking_id: booking.id, job_id: jobId, job_title: job.title
      });
    } catch {}

    return booking;
  },

  async listBookings(userId, role, { status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const field = role === 'worker' ? 'b.worker_id' : 'b.employer_id';
    const params = [userId];
    let statusClause = '';
    if (status) { statusClause = `AND b.status = $${params.push(status)}`; }

    const bookings = await db.query(`
      SELECT b.*,
        j.title as job_title, j.city as job_city, j.budget_max,
        j.category_id, c.name as category_name,
        w.full_name as worker_name, w.rating as worker_rating, w.profile_photo as worker_photo,
        e.full_name as employer_name, e.rating as employer_rating, e.profile_photo as employer_photo
      FROM bookings b
      JOIN jobs j ON j.id = b.job_id
      JOIN categories c ON c.id = j.category_id
      JOIN users w ON w.id = b.worker_id
      JOIN users e ON e.id = b.employer_id
      WHERE ${field} = $1 ${statusClause}
      ORDER BY b.created_at DESC
      LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}
    `, params).then(r => r.rows);

    return bookings;
  },

  async getBooking(id, userId) {
    const booking = await db.query(`
      SELECT b.*,
        j.title as job_title, j.description as job_description,
        j.city as job_city, j.address_text as job_address,
        ST_X(j.location::geometry) as job_lng, ST_Y(j.location::geometry) as job_lat,
        j.budget_min, j.budget_max, j.duration_hours,
        c.name as category_name,
        w.full_name as worker_name, w.phone as worker_phone, w.rating as worker_rating,
        w.profile_photo as worker_photo,
        e.full_name as employer_name, e.phone as employer_phone, e.rating as employer_rating
      FROM bookings b
      JOIN jobs j ON j.id = b.job_id
      JOIN categories c ON c.id = j.category_id
      JOIN users w ON w.id = b.worker_id
      JOIN users e ON e.id = b.employer_id
      WHERE b.id = $1 AND (b.worker_id = $2 OR b.employer_id = $2)
    `, [id, userId]).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  },

  async acceptBooking(bookingId, employerId) {
    const booking = await db.query(`
      UPDATE bookings SET status = 'accepted', updated_at = NOW()
      WHERE id = $1 AND employer_id = $2 AND status = 'pending'
      RETURNING *
    `, [bookingId, employerId]).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found or cannot be accepted', 404);

    // Generate 6-digit OTP for job start
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.query('UPDATE bookings SET otp = $1 WHERE id = $2', [otp, bookingId]);
    await redis.setex(`otp:booking:${bookingId}`, 86400, otp);

    // Reject other pending applications for this job (if workers_needed fulfilled)
    const job = await db.query(
      'SELECT workers_needed, workers_hired FROM jobs WHERE id = $1', [booking.job_id]
    ).then(r => r.rows[0]);

    if (job && job.workers_hired + 1 >= job.workers_needed) {
      await db.query(`
        UPDATE jobs SET workers_hired = workers_hired + 1, status = 'assigned' WHERE id = $1
      `, [booking.job_id]);
    } else {
      await db.query('UPDATE jobs SET workers_hired = workers_hired + 1 WHERE id = $1', [booking.job_id]);
    }

    // Notify worker
    try {
      const io = getIO();
      io.to(`user:${booking.worker_id}`).emit('booking:accepted', {
        booking_id: bookingId,
        otp, // Worker shows this OTP to employer to start
        message: 'Your application was accepted!'
      });
    } catch {}

    return { ...booking, otp };
  },

  async rejectBooking(bookingId, employerId) {
    const booking = await db.query(`
      UPDATE bookings SET status = 'rejected', updated_at = NOW()
      WHERE id = $1 AND employer_id = $2 AND status = 'pending'
      RETURNING *
    `, [bookingId, employerId]).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found', 404);

    try {
      const io = getIO();
      io.to(`user:${booking.worker_id}`).emit('booking:rejected', { booking_id: bookingId });
    } catch {}

    return booking;
  },

  async cancelBooking(bookingId, userId) {
    const booking = await db.query(
      `SELECT * FROM bookings WHERE id = $1 AND (worker_id = $2 OR employer_id = $2)`,
      [bookingId, userId]
    ).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found', 404);
    if (['completed', 'in_progress', 'cancelled'].includes(booking.status)) {
      throw new AppError(`Cannot cancel a ${booking.status} booking`, 400);
    }

    await db.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    return { message: 'Booking cancelled' };
  }
};

module.exports = bookingsService;

/* ─────────────────────────────────────────────────────────── */
