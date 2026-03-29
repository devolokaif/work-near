
// ─── payments.routes.js ─────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const paymentsService = require('./payments.service');
const { asyncHandler } = require('../../utils/asyncHandler');

router.post('/create-order',
  authenticate,
  [body('booking_id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const order = await paymentsService.createOrder({ bookingId: req.body.booking_id, userId: req.user.id });
    res.json(order);
  })
);

router.post('/verify',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await paymentsService.verifyPayment({ ...req.body, userId: req.user.id });
    res.json(result);
  })
);

router.post('/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    await paymentsService.handleWebhook(req.body, req.headers['x-razorpay-signature']);
    res.json({ received: true });
  })
);

router.post('/payout',
  authenticate,
  [body('amount').isFloat({ min: 100 })],
  validate,
  asyncHandler(async (req, res) => {
    const result = await paymentsService.requestPayout({ userId: req.user.id, amount: req.body.amount });
    res.json(result);
  })
);

router.get('/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const history = await paymentsService.getPaymentHistory({ userId: req.user.id, ...req.query });
    res.json(history);
  })
);

module.exports = router;