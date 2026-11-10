const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/unread', auth, async (req, res) => {
  try {
    res.json({ count: await Message.countDocuments({ to: req.userId, read: false }) });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const msgs = await Message.find({ $or: [{ from: req.userId }, { to: req.userId }] })
      .sort('-createdAt')
      .limit(500)
      .populate('from to', 'username avatar fullName');

    const map = new Map();
    for (const m of msgs) {
      if (!m.from || !m.to) continue;
      const mine = m.from._id.equals(req.userId);
      const other = mine ? m.to : m.from;
      const k = String(other._id);
      if (!map.has(k)) {
        map.set(k, {
          user: other,
          last: {
            text: m.isUnsent ? 'Message unsent' : m.text,
            isUnsent: m.isUnsent,
            createdAt: m.createdAt,
            mine,
          },
          unread: 0,
        });
      }
      if (!mine && !m.read && !m.isUnsent) map.get(k).unread++;
    }
    res.json([...map.values()]);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const msgs = await Message.find({
      $or: [
        { from: req.userId, to: userId },
        { from: userId, to: req.userId },
      ],
    })
      .sort('createdAt')
      .limit(300);
    await Message.updateMany({ from: userId, to: req.userId, read: false }, { read: true });
    res.json(msgs);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.put('/:userId/read', auth, async (req, res) => {
  try {
    await Message.updateMany({ from: req.params.userId, to: req.userId, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.post('/:userId', auth, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ msg: 'Message cannot be empty' });
    if (req.params.userId === req.userId) {
      return res.status(400).json({ msg: 'You cannot message yourself' });
    }
    if (!(await User.exists({ _id: req.params.userId }))) {
      return res.status(404).json({ msg: 'User not found' });
    }
    const m = await Message.create({ from: req.userId, to: req.params.userId, text: text.slice(0, 1000) });
    const io = req.app.get('io');
    io?.to('u:' + req.params.userId).emit('message', m);
    io?.to('u:' + req.userId).emit('message', m);
    res.json(m);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Unsend own message (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const m = await Message.findById(req.params.id);
    if (!m) return res.status(404).json({ msg: 'Message not found' });
    if (!m.from.equals(req.userId)) {
      return res.status(403).json({ msg: 'You can only unsend your own messages' });
    }

    m.isUnsent = true;
    m.text = '';
    await m.save();

    const io = req.app.get('io');
    io?.to('u:' + m.to).emit('message_unsent', { messageId: m._id });
    io?.to('u:' + m.from).emit('message_unsent', { messageId: m._id });

    res.json({ ok: true, message: m });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
