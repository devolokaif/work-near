
// ─── users.routes.js ────────────────────────────────────────
const express = require('express');
const multer = require('multer');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const usersService = require('./users.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  }
});

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await usersService.getMe(req.user.id);
  res.json(user);
}));

router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  res.json(user);
}));

router.post('/me/photo', authenticate, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('No file uploaded');

  // In production: upload to S3/Cloudflare R2
  // For now: return placeholder
  const url = `https://assets.worknear.in/photos/${req.user.id}-${Date.now()}.jpg`;
  const result = await usersService.updateProfilePhoto(req.user.id, url);
  res.json({ url: result.profile_photo });
}));

router.patch('/worker-profile', authenticate, authorize('worker'), asyncHandler(async (req, res) => {
  const result = await usersService.updateWorkerProfile(req.user.id, req.body);
  res.json(result);
}));

router.patch('/worker-profile/availability', authenticate, authorize('worker'), asyncHandler(async (req, res) => {
  const result = await usersService.updateAvailability(req.user.id, req.body.is_available);
  res.json(result);
}));

router.get('/workers/:id', authenticate, asyncHandler(async (req, res) => {
  const worker = await usersService.getWorkerProfile(req.params.id, req.user.id);
  res.json(worker);
}));

router.patch('/location', authenticate, authorize('worker'), asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  await usersService.updateLocation(req.user.id, lat, lng);
  res.json({ success: true });
}));

module.exports = router;