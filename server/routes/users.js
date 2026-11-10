const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const notify = require('../utils/notify');

const RESERVED = ['messages', 'notifications', 'explore', 'reels', 'create', 'post', 'tag', 'api', 'uploads', 'saved', 'accounts', 'login', 'signup', 'auth'];

router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!q) return res.json([]);
    res.json(
      await User.find({
        isVerified: { $ne: false },
        $or: [{ username: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }],
      })
        .select('username fullName avatar')
        .limit(15)
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/suggestions', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ msg: 'User not found' });
    res.json(
      await User.find({
        _id: { $nin: [...me.following, me._id] },
        isVerified: { $ne: false },
      })
        .select('username fullName avatar')
        .limit(5)
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Update profile: name, username, bio, avatar, remove avatar
router.put('/me', auth, upload.single('avatar'), async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ msg: 'User not found' });

    const update = {};
    if (req.body.fullName !== undefined) update.fullName = req.body.fullName.trim();
    if (req.body.bio !== undefined) update.bio = req.body.bio.trim();

    if (req.body.username && req.body.username.trim().toLowerCase() !== me.username) {
      const newUsername = req.body.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9._]{3,30}$/.test(newUsername)) {
        return res.status(400).json({ msg: 'Username must be 3-30 characters with letters, numbers, period, or underscore' });
      }
      if (RESERVED.includes(newUsername)) {
        return res.status(400).json({ msg: 'This username is not available' });
      }
      const existing = await User.findOne({ username: newUsername, _id: { $ne: me._id } });
      if (existing) {
        return res.status(400).json({ msg: 'Username is already taken' });
      }
      update.username = newUsername;
    }

    if (req.body.removeAvatar === 'true') {
      if (me.avatar && me.avatar.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, '..', me.avatar.replace(/^\//, ''));
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch {}
        }
      }
      update.avatar = '';
    } else if (req.file) {
      if (me.avatar && me.avatar.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, '..', me.avatar.replace(/^\//, ''));
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch {}
        }
      }
      update.avatar = '/uploads/' + req.file.filename;
    }

    const u = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({
      user: {
        _id: u._id,
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar,
        bio: u.bio,
        saved: u.saved,
      },
    });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.put('/:id/follow', auth, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ msg: 'You cannot follow yourself' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ msg: 'User not found' });
    const isFollowing = target.followers.some((f) => f.equals(req.userId));
    const op = isFollowing ? '$pull' : '$addToSet';
    await User.findByIdAndUpdate(req.params.id, { [op]: { followers: req.userId } });
    await User.findByIdAndUpdate(req.userId, { [op]: { following: req.params.id } });
    if (!isFollowing) await notify(req, { to: req.params.id, type: 'follow' });
    res.json({ following: !isFollowing });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/:username', auth, async (req, res) => {
  try {
    const u = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!u) return res.status(404).json({ msg: 'User not found' });
    const posts = await Post.find({ user: u._id }).sort('-createdAt');
    res.json({
      user: {
        _id: u._id,
        username: u.username,
        fullName: u.fullName,
        bio: u.bio,
        avatar: u.avatar,
        followersCount: u.followers ? u.followers.length : 0,
        followingCount: u.following ? u.following.length : 0,
        isFollowing: u.followers ? u.followers.some((f) => f.equals(req.userId)) : false,
      },
      posts,
    });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
