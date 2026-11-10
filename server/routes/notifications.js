const router = require('express').Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
router.get('/unread', auth, async (req, res) => res.json({ count: await Notification.countDocuments({ to: req.userId, read: false }) }));
router.get('/', auth, async (req, res) =>
  res.json(await Notification.find({ to: req.userId }).sort('-createdAt').limit(50).populate('from', 'username avatar').populate('post', 'media type')));
router.put('/read', auth, async (req, res) => { await Notification.updateMany({ to: req.userId, read: false }, { read: true }); res.json({ ok: true }); });
module.exports = router;
