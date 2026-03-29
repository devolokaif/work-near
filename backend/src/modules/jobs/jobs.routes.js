// ============================================================
// Jobs Module (src/modules/jobs/)
// ============================================================

// ─── jobs.routes.js ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const jobsController = require('./jobs.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const cache = require('../../middleware/cache');

router.get('/',
  authenticate,
  cache(60),   // cache 60s
  jobsController.listJobs
);

router.get('/nearby',
  authenticate,
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isUUID()
  ],
  validate,
  cache(30),
  jobsController.getNearbyJobs
);

router.get('/:id', authenticate, jobsController.getJob);

router.post('/',
  authenticate,
  authorize('employer', 'admin'),
  [
    body('title').trim().isLength({ min: 5, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('category_id').isUUID(),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
    body('address_text').trim().notEmpty(),
    body('budget_min').optional().isFloat({ min: 0 }),
    body('budget_max').optional().isFloat({ min: 0 }),
    body('duration_hours').optional().isFloat({ min: 0.5 }),
    body('workers_needed').optional().isInt({ min: 1, max: 50 }),
    body('is_urgent').optional().isBoolean(),
    body('scheduled_at').optional().isISO8601()
  ],
  validate,
  jobsController.createJob
);

router.patch('/:id',
  authenticate,
  authorize('employer', 'admin'),
  jobsController.updateJob
);

router.delete('/:id',
  authenticate,
  authorize('employer', 'admin'),
  jobsController.deleteJob
);

module.exports = router;
