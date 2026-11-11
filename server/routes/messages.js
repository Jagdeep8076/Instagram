const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/unread', auth, async (req, res) => res.json({ count: await Message.countDocuments({ to: req.userId, read: false, deleted: false }) }));

router.get('/conversations', auth, async (req, res) => {
  const msgs = await Message.find({ $or: [{ from: req.userId }, { to: req.userId }] }).sort('-createdAt').limit(500).populate('from to', 'username avatar fullName');
  const map = new Map();
  for (const m of msgs) {
    if (!m.from || !m.to) continue;
    const mine = m.from._id.equals(req.userId);
    const other = mine ? m.to : m.from;
    const k = String(other._id);
    if (!map.has(k)) map.set(k, { user: other, last: { text: m.deleted ? 'Message unsent' : m.text, createdAt: m.createdAt, mine }, unread: 0 });
    if (!mine && !m.read && !m.deleted) map.get(k).unread++;
  }
  res.json([...map.values()]);
});

router.get('/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const msgs = await Message.find({ $or: [{ from: req.userId, to: userId }, { from: userId, to: req.userId }] }).sort('createdAt').limit(300);
  await Message.updateMany({ from: userId, to: req.userId, read: false }, { read: true });
  res.json(msgs);
});

router.put('/:userId/read', auth, async (req, res) => {
  await Message.updateMany({ from: req.params.userId, to: req.userId, read: false }, { read: true });
  res.json({ ok: true });
});

router.post('/:userId', auth, async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ msg: "Message can't be empty." });
  if (req.params.userId === req.userId) return res.status(400).json({ msg: "You can't message yourself." });
  if (!(await User.exists({ _id: req.params.userId, verified: { $ne: false } }))) return res.status(404).json({ msg: 'User not found.' });
  const m = await Message.create({ from: req.userId, to: req.params.userId, text: text.slice(0, 1000) });
  req.app.get('io')?.to('u:' + req.params.userId).emit('message', m);
  res.json(m);
});

// Unsend: only the sender, keeps a "Message unsent" placeholder for both people
router.delete('/:id', auth, async (req, res) => {
  const m = await Message.findById(req.params.id);
  if (!m) return res.status(404).json({ msg: 'Message not found.' });
  if (!m.from.equals(req.userId)) return res.status(403).json({ msg: "You can only unsend your own messages." });
  m.deleted = true; m.text = ''; await m.save();
  const io = req.app.get('io');
  const payload = { _id: m._id, from: m.from, to: m.to };
  io?.to('u:' + m.to).to('u:' + m.from).emit('message-deleted', payload);
  res.json({ ok: true });
});
module.exports = router;
