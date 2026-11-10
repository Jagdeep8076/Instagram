const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const notify = require('../utils/notify');

const populate = (q) =>
  q.populate('user', 'username avatar').populate('comments.user', 'username avatar');

router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'Please select a media file' });
    const isVideo = req.file.mimetype.startsWith('video');
    const type = req.body.type === 'reel' || isVideo ? 'reel' : 'post';
    if (type === 'reel' && !isVideo) {
      return res.status(400).json({ msg: 'A video file is required for reels' });
    }
    const post = await Post.create({
      user: req.userId,
      caption: req.body.caption || '',
      media: '/uploads/' + req.file.filename,
      type,
    });
    res.json(await populate(Post.findById(post._id)));
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Edit caption (owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Post not found' });
    if (!p.user.equals(req.userId)) {
      return res.status(403).json({ msg: 'You do not have permission to edit this post' });
    }
    p.caption = req.body.caption !== undefined ? req.body.caption.trim() : p.caption;
    p.isEdited = true;
    await p.save();
    res.json(await populate(Post.findById(p._id)));
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Delete post & media file from disk (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Post not found' });
    if (!p.user.equals(req.userId)) {
      return res.status(403).json({ msg: 'You do not have permission to delete this post' });
    }

    // Delete media file from disk
    if (p.media && p.media.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', p.media.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await p.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Paginated feed: /feed?page=1&limit=5
router.get('/feed', auth, async (req, res) => {
  try {
    const page = Math.max(+req.query.page || 1, 1);
    const limit = Math.min(+req.query.limit || 10, 30);
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ msg: 'User not found' });
    res.json(
      await populate(
        Post.find({ user: { $in: [...me.following, me._id] } })
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit)
      )
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/explore', auth, async (req, res) => {
  try {
    res.json(
      await Post.find()
        .sort('-createdAt')
        .limit(60)
        .populate('user', 'username avatar')
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/reels', auth, async (req, res) => {
  try {
    res.json(await populate(Post.find({ type: 'reel' }).sort('-createdAt').limit(30)));
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ msg: 'User not found' });
    res.json(
      await Post.find({ _id: { $in: me.saved } })
        .sort('-createdAt')
        .populate('user', 'username avatar')
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/tag/:tag', auth, async (req, res) => {
  try {
    if (!/^\w{1,50}$/.test(req.params.tag)) return res.json([]);
    res.json(
      await Post.find({ hashtags: req.params.tag.toLowerCase() })
        .sort('-createdAt')
        .limit(60)
        .populate('user', 'username avatar')
    );
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const p = await populate(Post.findById(req.params.id));
    p ? res.json(p) : res.status(404).json({ msg: 'Post not found' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.put('/:id/like', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Post not found' });
    const liked = p.likes.some((l) => l.equals(req.userId));
    p.likes = liked ? p.likes.filter((l) => !l.equals(req.userId)) : [...p.likes, req.userId];
    await p.save();
    if (!liked) await notify(req, { to: p.user, type: 'like', post: p._id });
    res.json({ likes: p.likes });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.put('/:id/save', auth, async (req, res) => {
  try {
    if (!(await Post.exists({ _id: req.params.id }))) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    const me = await User.findById(req.userId);
    const has = me.saved.some((s) => s.equals(req.params.id));
    await User.findByIdAndUpdate(req.userId, { [has ? '$pull' : '$addToSet']: { saved: req.params.id } });
    res.json({ saved: !has });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.post('/:id/comment', auth, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ msg: 'Comment cannot be empty' });
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Post not found' });
    p.comments.push({ user: req.userId, text });
    await p.save();
    await notify(req, { to: p.user, type: 'comment', post: p._id, text: text.slice(0, 80) });
    res.json((await populate(Post.findById(p._id))).comments);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Delete comment: comment author can delete own; post owner can delete any comment on their post
router.delete('/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ msg: 'Post not found' });

    const comment = p.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    const isCommentAuthor = comment.user.equals(req.userId);
    const isPostOwner = p.user.equals(req.userId);
    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({ msg: 'You do not have permission to delete this comment' });
    }

    p.comments.pull({ _id: req.params.commentId });
    await p.save();
    res.json((await populate(Post.findById(p._id))).comments);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
