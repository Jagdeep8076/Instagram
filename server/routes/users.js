const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const notify = require('../utils/notify');
const safe = require('../utils/safeUser');
const V = require('../utils/validate');
const { removeUpload } = require('../utils/files');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/search', auth, async (req, res) => {
  const q = esc((req.query.q || '').trim());
  if (!q) return res.json([]);
  res.json(await User.find({ verified: { $ne: false }, $or: [{ username: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }] }).select('username fullName avatar').limit(15));
});

router.get('/suggestions', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  res.json(await User.find({ verified: { $ne: false }, _id: { $nin: [...me.following, me._id] } }).select('username fullName avatar').limit(5));
});

// Edit profile: name, username, bio, avatar (upload or remove)
router.put('/me', auth, upload.single('avatar'), async (req, res) => {
  const me = await User.findById(req.userId);
  const fullName = String(req.body.fullName ?? me.fullName).trim();
  const bio = String(req.body.bio ?? me.bio).trim();
  if (fullName.length > 60) return res.status(400).json({ msg: 'Name can be at most 60 characters.' });
  if (bio.length > 150) return res.status(400).json({ msg: 'Bio can be at most 150 characters.' });
  if (req.body.username && req.body.username.toLowerCase() !== me.username) {
    const p = V.username.safeParse(req.body.username);
    if (!p.success) return res.status(400).json({ msg: p.error.issues[0].message });
    if (await User.exists({ username: p.data, _id: { $ne: me._id } })) return res.status(409).json({ msg: 'That username is taken. Try another.' });
    me.username = p.data;
  }
  me.fullName = fullName; me.bio = bio;
  if (req.file) { removeUpload(me.avatar); me.avatar = '/uploads/' + req.file.filename; }
  else if (req.body.removeAvatar === 'true') { removeUpload(me.avatar); me.avatar = ''; }
  await me.save();
  res.json({ user: safe(me) });
});

router.put('/:id/follow', auth, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ msg: "You can't follow yourself." });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ msg: 'User not found.' });
  const isFollowing = target.followers.some((f) => f.equals(req.userId));
  const op = isFollowing ? '$pull' : '$addToSet';
  await User.findByIdAndUpdate(req.params.id, { [op]: { followers: req.userId } });
  await User.findByIdAndUpdate(req.userId, { [op]: { following: req.params.id } });
  if (!isFollowing) await notify(req, { to: req.params.id, type: 'follow' });
  res.json({ following: !isFollowing });
});

router.get('/:username', auth, async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase(), verified: { $ne: false } });
  if (!u) return res.status(404).json({ msg: 'User not found.' });
  const posts = await Post.find({ user: u._id }).sort('-createdAt');
  res.json({
    user: {
      _id: u._id, username: u.username, fullName: u.fullName, bio: u.bio, avatar: u.avatar,
      followersCount: u.followers.length, followingCount: u.following.length,
      isFollowing: u.followers.some((f) => f.equals(req.userId)),
    },
    posts,
  });
});

module.exports = router;
