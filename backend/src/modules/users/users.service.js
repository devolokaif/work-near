// ============================================================
// Users Module (src/modules/users/)
// ============================================================

// ─── users.service.js ───────────────────────────────────────
const { db } = require('../../config/database');
const AppError = require('../../utils/AppError');

const usersService = {
  async getMe(userId) {
    const user = await db.query(`
      SELECT u.*,
        wp.bio, wp.hourly_rate, wp.daily_rate, wp.is_available,
        wp.availability_radius, wp.upi_id, wp.documents_verified,
        wp.background_checked, wp.experience_years,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'category_id', ws.category_id,
            'name', c.name,
            'icon_url', c.icon_url,
            'is_primary', ws.is_primary
          )) FILTER (WHERE ws.category_id IS NOT NULL),
          '[]'
        ) as skills
      FROM users u
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN worker_skills ws ON ws.worker_id = wp.id
      LEFT JOIN categories c ON c.id = ws.category_id
      WHERE u.id = $1
      GROUP BY u.id, wp.bio, wp.hourly_rate, wp.daily_rate, wp.is_available,
        wp.availability_radius, wp.upi_id, wp.documents_verified,
        wp.background_checked, wp.experience_years
    `, [userId]).then(r => r.rows[0]);

    if (!user) throw new AppError('User not found', 404);

    // Remove sensitive fields
    delete user.aadhaar_number;
    delete user.bank_account_number;
    delete user.bank_ifsc;

    return user;
  },

  async updateMe(userId, data) {
    const allowed = ['full_name', 'email', 'language', 'gender', 'date_of_birth', 'fcm_token'];
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
    params.push(userId);

    return db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, full_name, email, language, profile_photo, role, status, rating`,
      params
    ).then(r => r.rows[0]);
  },

  async updateProfilePhoto(userId, photoUrl) {
    return db.query(
      'UPDATE users SET profile_photo = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_photo',
      [photoUrl, userId]
    ).then(r => r.rows[0]);
  },

  async updateWorkerProfile(userId, data) {
    const { skills, bio, hourly_rate, daily_rate, availability_radius,
      upi_id, bank_account_number, bank_ifsc, experience_years } = data;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Update worker profile
      await client.query(`
        UPDATE worker_profiles SET
          bio = COALESCE($1, bio),
          hourly_rate = COALESCE($2, hourly_rate),
          daily_rate = COALESCE($3, daily_rate),
          availability_radius = COALESCE($4, availability_radius),
          upi_id = COALESCE($5, upi_id),
          bank_account_number = COALESCE($6, bank_account_number),
          bank_ifsc = COALESCE($7, bank_ifsc),
          experience_years = COALESCE($8, experience_years),
          updated_at = NOW()
        WHERE user_id = $9
      `, [bio, hourly_rate, daily_rate, availability_radius, upi_id, bank_account_number, bank_ifsc, experience_years, userId]);

      // Update skills
      if (skills && Array.isArray(skills)) {
        const wp = await client.query('SELECT id FROM worker_profiles WHERE user_id = $1', [userId]).then(r => r.rows[0]);
        if (wp) {
          await client.query('DELETE FROM worker_skills WHERE worker_id = $1', [wp.id]);
          if (skills.length > 0) {
            const skillValues = skills.map((catId, i) =>
              `($1, $${i + 2}, ${i === 0})`
            ).join(', ');
            await client.query(
              `INSERT INTO worker_skills (worker_id, category_id, is_primary) VALUES ${skillValues}`,
              [wp.id, ...skills]
            );
          }
        }
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateAvailability(userId, is_available) {
    await db.query(
      'UPDATE worker_profiles SET is_available = $1, updated_at = NOW() WHERE user_id = $2',
      [is_available, userId]
    );
    return { is_available };
  },

  async getWorkerProfile(workerId, requesterId) {
    const worker = await db.query(`
      SELECT u.id, u.full_name, u.profile_photo, u.rating, u.total_reviews,
        u.total_earnings, u.created_at as member_since,
        wp.bio, wp.hourly_rate, wp.daily_rate, wp.is_available,
        wp.experience_years, wp.documents_verified, wp.background_checked,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('name', c.name, 'icon_url', c.icon_url))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) as skills,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'rating', r.rating, 'comment', r.comment,
            'reviewer_name', ru.full_name, 'created_at', r.created_at
          )) FILTER (WHERE r.id IS NOT NULL), '[]'
        ) as reviews
      FROM users u
      JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN worker_skills ws ON ws.worker_id = wp.id
      LEFT JOIN categories c ON c.id = ws.category_id
      LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.is_public = TRUE
      LEFT JOIN users ru ON ru.id = r.reviewer_id
      WHERE u.id = $1 AND u.role = 'worker' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.profile_photo, u.rating, u.total_reviews,
        u.total_earnings, u.created_at, wp.bio, wp.hourly_rate, wp.daily_rate,
        wp.is_available, wp.experience_years, wp.documents_verified, wp.background_checked
    `, [workerId]).then(r => r.rows[0]);

    if (!worker) throw new AppError('Worker not found', 404);
    return worker;
  },

  async updateLocation(userId, lat, lng) {
    await db.query(
      `UPDATE worker_profiles SET current_location = ST_MakePoint($1, $2)::geography, last_location_update = NOW() WHERE user_id = $3`,
      [lng, lat, userId]
    );
  }
};

module.exports = usersService;

/* ─────────────────────────────────────────────────────────── */
