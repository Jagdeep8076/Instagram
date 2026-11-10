const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'Please select a media file' });
    const story = await Story.create({
      user: req.userId,
      media: '/uploads/' + req.file.filename,
    });
    res.json(story);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ msg: 'User not found' });
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const stories = await Story.find({
      user: { $in: [...me.following, me._id] },
      createdAt: { $gt: since },
    })
      .sort('createdAt')
      .populate('user', 'username avatar');

    const groups = new Map();
    for (const s of stories) {
      if (!s.user) continue;
      const k = String(s.user._id);
      if (!groups.has(k)) groups.set(k, { user: s.user, stories: [], allSeen: true });
      const seen = s.viewers.some((v) => v.equals(req.userId));
      groups.get(k).stories.push({
        _id: s._id,
        media: s.media,
        createdAt: s.createdAt,
        seen,
        viewersCount: s.viewers ? s.viewers.length : 0,
      });
      if (!seen) groups.get(k).allSeen = false;
    }
    const mine = String(req.userId);
    res.json(
      [...groups.values()].sort(
        (a, b) =>
          (String(b.user._id) === mine) - (String(a.user._id) === mine) ||
          a.allSeen - b.allSeen
      )
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.put('/:id/view', auth, async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.id, { $addToSet: { viewers: req.userId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Viewers list for story owner
router.get('/:id/viewers', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers', 'username fullName avatar');
    if (!story) return res.status(404).json({ msg: 'Story not found' });
    if (!story.user.equals(req.userId)) {
      return res.status(403).json({ msg: 'You do not have permission to view viewers of this story' });
    }
    res.json(story.viewers || []);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Delete own story
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ msg: 'Story not found' });
    if (!story.user.equals(req.userId)) {
      return res.status(403).json({ msg: 'You do not have permission to delete this story' });
    }

    if (story.media && story.media.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', story.media.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await story.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
