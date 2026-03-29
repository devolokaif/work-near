
// ─── bookings.routes.js ─────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bookingsService = require('./bookings.service');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { asyncHandler } = require('../../utils/asyncHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const bookings = await bookingsService.listBookings(req.user.id, req.user.role, req.query);
  res.json(bookings);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const booking = await bookingsService.getBooking(req.params.id, req.user.id);
  res.json(booking);
}));

router.post('/apply/:jobId',
  authenticate,
  [
    body('proposed_rate').optional().isFloat({ min: 0 }),
    body('message').optional().trim().isLength({ max: 500 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const booking = await bookingsService.applyForJob(req.params.jobId, req.user.id, req.body);
    res.status(201).json(booking);
  })
);

router.post('/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const result = await bookingsService.acceptBooking(req.params.id, req.user.id);
  res.json(result);
}));

router.post('/:id/reject', authenticate, asyncHandler(async (req, res) => {
  const result = await bookingsService.rejectBooking(req.params.id, req.user.id);
  res.json(result);
}));

router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const result = await bookingsService.cancelBooking(req.params.id, req.user.id);
  res.json(result);
}));

module.exports = router;