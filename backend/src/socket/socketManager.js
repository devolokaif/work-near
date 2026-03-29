// ============================================================
// Socket.io Real-time Location Tracking
// (src/socket/socketManager.js)
// ============================================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // ── Auth Middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Track online status
    await redis.setex(`online:${socket.userId}`, 300, socket.id);

    // ── Location Events (Worker) ──────────────────────────

    // Worker updates location during active booking
    socket.on('location:update', async (data) => {
      try {
        const { lat, lng, accuracy, speed, heading, booking_id } = data;
        if (!lat || !lng || !booking_id) return;

        // Validate worker owns this booking
        const booking = await db.query(`
          SELECT b.id, b.employer_id, b.status
          FROM bookings b
          WHERE b.id = $1 AND b.worker_id = $2 AND b.status = 'in_progress'
        `, [booking_id, socket.userId]).then(r => r.rows[0]);

        if (!booking) return socket.emit('error', { message: 'Invalid booking' });

        // Save to DB (every 5th update to reduce writes)
        const updateCount = await redis.incr(`loc:count:${booking_id}`);
        if (updateCount % 5 === 0) {
          await db.query(`
            INSERT INTO location_tracking (booking_id, worker_id, location, accuracy, speed, heading)
            VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7)
          `, [booking_id, socket.userId, lng, lat, accuracy, speed, heading]).catch(() => {});
        }

        // Cache latest location in Redis (fast reads)
        const locationData = { lat, lng, accuracy, speed, heading, updated_at: new Date() };
        await redis.setex(
          `location:${booking_id}`,
          3600,
          JSON.stringify(locationData)
        );

        // Update worker_profiles table (for availability map)
        await redis.setex(`worker:loc:${socket.userId}`, 60, JSON.stringify({ lat, lng }));

        // Broadcast to employer
        io.to(`user:${booking.employer_id}`).emit('worker:location', {
          booking_id,
          worker_id: socket.userId,
          ...locationData
        });

      } catch (err) {
        logger.error('Location update error:', err);
      }
    });

    // Worker goes online/offline
    socket.on('availability:set', async ({ is_available }) => {
      try {
        await db.query(
          'UPDATE worker_profiles SET is_available = $1 WHERE user_id = $2',
          [is_available, socket.userId]
        );
        socket.emit('availability:updated', { is_available });
      } catch (err) {
        logger.error('Availability update error:', err);
      }
    });

    // ── Booking Events ────────────────────────────────────

    socket.on('booking:accept', async ({ booking_id }) => {
      try {
        const booking = await db.query(`
          UPDATE bookings SET status = 'accepted', updated_at = NOW()
          WHERE id = $1 AND worker_id = $2 AND status = 'pending'
          RETURNING *, (SELECT employer_id FROM bookings WHERE id = $1) as emp_id
        `, [booking_id, socket.userId]).then(r => r.rows[0]);

        if (!booking) return socket.emit('error', { message: 'Booking not found' });

        // Generate OTP for job start
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await db.query('UPDATE bookings SET otp = $1 WHERE id = $2', [otp, booking_id]);
        await redis.setex(`otp:booking:${booking_id}`, 86400, otp);

        // Notify employer
        io.to(`user:${booking.employer_id}`).emit('booking:accepted', {
          booking_id,
          otp,
          message: 'Worker has accepted your job request!'
        });

        socket.emit('booking:accept:success', { booking_id, otp });
      } catch (err) {
        logger.error('Booking accept error:', err);
      }
    });

    socket.on('booking:start', async ({ booking_id, otp }) => {
      try {
        const storedOTP = await redis.get(`otp:booking:${booking_id}`);
        if (storedOTP !== otp) return socket.emit('error', { message: 'Invalid OTP' });

        const booking = await db.query(`
          UPDATE bookings SET status = 'in_progress', started_at = NOW(), otp_verified = TRUE
          WHERE id = $1 AND worker_id = $2 AND status = 'accepted'
          RETURNING *
        `, [booking_id, socket.userId]).then(r => r.rows[0]);

        if (!booking) return socket.emit('error', { message: 'Cannot start job' });

        // Update job status
        await db.query("UPDATE jobs SET status = 'in_progress' WHERE id = $1", [booking.job_id]);

        io.to(`user:${booking.employer_id}`).emit('job:started', {
          booking_id, started_at: booking.started_at
        });

        socket.emit('booking:start:success', { booking_id });
        logger.info(`Job started: booking ${booking_id}`);
      } catch (err) {
        logger.error('Booking start error:', err);
      }
    });

    socket.on('booking:complete', async ({ booking_id }) => {
      try {
        const booking = await db.query(`
          UPDATE bookings SET status = 'completed', completed_at = NOW()
          WHERE id = $1 AND worker_id = $2 AND status = 'in_progress'
          RETURNING *
        `, [booking_id, socket.userId]).then(r => r.rows[0]);

        if (!booking) return socket.emit('error', { message: 'Cannot complete job' });

        await db.query("UPDATE jobs SET status = 'completed', completed_at = NOW() WHERE id = $1", [booking.job_id]);

        io.to(`user:${booking.employer_id}`).emit('job:completed', { booking_id });
        socket.emit('booking:complete:success', { booking_id });
      } catch (err) {
        logger.error('Booking complete error:', err);
      }
    });

    // ── Chat Messages ─────────────────────────────────────

    socket.on('chat:message', async ({ booking_id, message }) => {
      try {
        // Verify user is part of this booking
        const booking = await db.query(
          'SELECT worker_id, employer_id FROM bookings WHERE id = $1 AND (worker_id = $2 OR employer_id = $2)',
          [booking_id, socket.userId]
        ).then(r => r.rows[0]);

        if (!booking) return;

        const recipientId = booking.worker_id === socket.userId ? booking.employer_id : booking.worker_id;

        const msgData = {
          booking_id, message, sender_id: socket.userId,
          sent_at: new Date()
        };

        // Store in Redis list (last 100 messages)
        await redis.lpush(`chat:${booking_id}`, JSON.stringify(msgData));
        await redis.ltrim(`chat:${booking_id}`, 0, 99);

        io.to(`user:${recipientId}`).emit('chat:message', msgData);
        socket.emit('chat:message:sent', msgData);
      } catch (err) {
        logger.error('Chat error:', err);
      }
    });

    socket.on('chat:history', async ({ booking_id }) => {
      try {
        const messages = await redis.lrange(`chat:${booking_id}`, 0, 49);
        socket.emit('chat:history', messages.map(m => JSON.parse(m)).reverse());
      } catch (err) {
        logger.error('Chat history error:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────

    socket.on('disconnect', async () => {
      await redis.del(`online:${socket.userId}`);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };