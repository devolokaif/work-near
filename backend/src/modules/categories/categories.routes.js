// ============================================================
// Categories Route (src/modules/categories/categories.routes.js)
// ============================================================
 
const express = require('express');
const router = express.Router();
const { db } = require('../../config/database');
const cache = require('../../middleware/cache');
const { asyncHandler } = require('../../utils/asyncHandler');
 
router.get('/', cache(300), asyncHandler(async (req, res) => {
  const categories = await db.query(
    'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC'
  ).then(r => r.rows);
  res.json(categories);
}));
 
module.exports = router;