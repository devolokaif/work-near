
// ─── Tracking Routes (src/modules/tracking/tracking.routes.js)
const expressTracking = require('express');
const routerTracking = expressTracking.Router();
const authenticateTracking = require('../../middleware/authenticate');
const { redis } = require('../../config/redis');
const { db: dbTracking } = require('../../config/database');
const { asyncHandler: asyncHandlerT } = require('../../utils/asyncHandler');
 
routerTracking.get('/:bookingId/location', authenticateTracking, asyncHandlerT(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
 
  // Verify access
  const booking = await dbTracking.query(
    'SELECT * FROM bookings WHERE id = $1 AND (worker_id = $2 OR employer_id = $2)',
    [bookingId, userId]
  ).then(r => r.rows[0]);
 
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
 
  // Get from Redis first (latest)
  const cached = await redis.get(`location:${bookingId}`);
  if (cached) return res.json(JSON.parse(cached));
 
  // Fall back to DB
  const location = await dbTracking.query(`
    SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat,
      accuracy, speed, heading, recorded_at
    FROM location_tracking
    WHERE booking_id = $1
    ORDER BY recorded_at DESC LIMIT 1
  `, [bookingId]).then(r => r.rows[0]);
 
  if (!location) return res.json({ lat: null, lng: null, message: 'No location data yet' });
  res.json(location);
}));
 
routerTracking.get('/:bookingId/history', authenticateTracking, asyncHandlerT(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
 
  const booking = await dbTracking.query(
    'SELECT * FROM bookings WHERE id = $1 AND (worker_id = $2 OR employer_id = $2)',
    [bookingId, userId]
  ).then(r => r.rows[0]);
 
  if (!booking) return res.status(404).json({ error: 'Not found' });
 
  const history = await dbTracking.query(`
    SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, recorded_at
    FROM location_tracking
    WHERE booking_id = $1
    ORDER BY recorded_at ASC
  `, [bookingId]).then(r => r.rows);
 
  res.json(history);
}));
 
module.exports = routerTracking;