
// ─── reviews.routes.js ──────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const reviewsService = require('./reviews.service');
const { asyncHandler } = require('../../utils/asyncHandler');

router.post('/:bookingId',
  authenticate,
  [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 1000 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const review = await reviewsService.createReview(req.params.bookingId, req.user.id, req.body);
    res.status(201).json(review);
  })
);

router.get('/worker/:workerId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await reviewsService.getWorkerReviews(req.params.workerId, req.query);
    res.json(result);
  })
);

module.exports = router;

