
// ─── notifications.routes.js ────────────────────────────────
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const { notificationsService } = require('./notifications.service');
const { asyncHandler } = require('../../utils/asyncHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const notifications = await notificationsService.list(req.user.id, req.query);
  const unread = await notificationsService.getUnreadCount(req.user.id);
  res.json({ notifications, unread });
}));

router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  await notificationsService.markRead(req.params.id, req.user.id);
  res.json({ success: true });
}));

router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  await notificationsService.markAllRead(req.user.id);
  res.json({ success: true });
}));

module.exports = router;