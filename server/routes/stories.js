const router = require('express').Router();
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { removeUpload } = require('../utils/files');

router.post('/', auth, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'Please select a file.' });
  res.json(await Story.create({ user: req.userId, media: '/uploads/' + req.file.filename }));
});

router.get('/', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const stories = await Story.find({ user: { $in: [...me.following, me._id] }, createdAt: { $gt: since } }).sort('createdAt').populate('user', 'username avatar');
  const groups = new Map();
  for (const s of stories) {
    if (!s.user) continue;
    const k = String(s.user._id);
    if (!groups.has(k)) groups.set(k, { user: s.user, stories: [], allSeen: true });
    const seen = s.viewers.some((v) => v.equals(req.userId));
    groups.get(k).stories.push({ _id: s._id, media: s.media, createdAt: s.createdAt, seen, viewersCount: s.user._id.equals(req.userId) ? s.viewers.length : undefined });
    if (!seen) groups.get(k).allSeen = false;
  }
  const mine = String(req.userId);
  res.json([...groups.values()].sort((a, b) => (String(b.user._id) === mine) - (String(a.user._id) === mine) || a.allSeen - b.allSeen));
});

router.put('/:id/view', auth, async (req, res) => {
  await Story.updateOne({ _id: req.params.id, user: { $ne: req.userId } }, { $addToSet: { viewers: req.userId } });
  res.json({ ok: true });
});

// Owner-only: who viewed my story
router.get('/:id/viewers', auth, async (req, res) => {
  const s = await Story.findById(req.params.id).populate('viewers', 'username avatar fullName');
  if (!s) return res.status(404).json({ msg: 'Story not found.' });
  if (!s.user.equals(req.userId)) return res.status(403).json({ msg: "You can't see who viewed someone else's story." });
  res.json(s.viewers);
});

router.delete('/:id', auth, async (req, res) => {
  const s = await Story.findById(req.params.id);
  if (!s) return res.status(404).json({ msg: 'Story not found.' });
  if (!s.user.equals(req.userId)) return res.status(403).json({ msg: "You can't delete someone else's story." });
  removeUpload(s.media);
  await s.deleteOne();
  res.json({ ok: true });
});
module.exports = router;
