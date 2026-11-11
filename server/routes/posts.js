const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const notify = require('../utils/notify');
const { removeUpload } = require('../utils/files');

const populate = (q) => q.populate('user', 'username avatar').populate('comments.user', 'username avatar');

router.post('/', auth, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'Please select a file.' });
  const isVideo = req.file.mimetype.startsWith('video');
  const type = req.body.type === 'reel' || isVideo ? 'reel' : 'post';
  if (type === 'reel' && !isVideo) { removeUpload('/uploads/' + req.file.filename); return res.status(400).json({ msg: 'A reel must be a video.' }); }
  const caption = String(req.body.caption || '').slice(0, 2200);
  const post = await Post.create({ user: req.userId, caption, media: '/uploads/' + req.file.filename, type });
  res.json(await populate(Post.findById(post._id)));
});

// Paginated feed: /feed?page=1&limit=5
router.get('/feed', auth, async (req, res) => {
  const page = Math.max(+req.query.page || 1, 1);
  const limit = Math.min(+req.query.limit || 10, 30);
  const me = await User.findById(req.userId);
  res.json(await populate(Post.find({ user: { $in: [...me.following, me._id] } }).sort('-createdAt').skip((page - 1) * limit).limit(limit)));
});

router.get('/explore', auth, async (req, res) => {
  res.json(await Post.find().sort('-createdAt').limit(60).populate('user', 'username avatar'));
});

router.get('/reels', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  const reels = await populate(Post.find({ type: 'reel' }).sort('-createdAt').limit(30));
  res.json(reels.map((r) => ({ ...r.toObject(), isFollowing: me.following.some((f) => f.equals(r.user._id)) })));
});

router.get('/saved', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  res.json(await Post.find({ _id: { $in: me.saved } }).sort('-createdAt').populate('user', 'username avatar'));
});

router.get('/tag/:tag', auth, async (req, res) => {
  if (!/^\w{1,50}$/.test(req.params.tag)) return res.json([]);
  res.json(await Post.find({ hashtags: req.params.tag.toLowerCase() }).sort('-createdAt').limit(60).populate('user', 'username avatar'));
});

router.get('/:id', auth, async (req, res) => {
  const p = await populate(Post.findById(req.params.id));
  p ? res.json(p) : res.status(404).json({ msg: 'Post not found.' });
});

// Edit caption (owner only)
router.put('/:id', auth, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Post not found.' });
  if (!p.user.equals(req.userId)) return res.status(403).json({ msg: "You can't edit someone else's post." });
  const caption = String(req.body.caption ?? '');
  if (caption.length > 2200) return res.status(400).json({ msg: 'Caption can be at most 2,200 characters.' });
  if (caption !== p.caption) { p.caption = caption; p.edited = true; await p.save(); }
  res.json(await populate(Post.findById(p._id)));
});

router.put('/:id/like', auth, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Post not found.' });
  const liked = p.likes.some((l) => l.equals(req.userId));
  p.likes = liked ? p.likes.filter((l) => !l.equals(req.userId)) : [...p.likes, req.userId];
  await p.save();
  if (!liked) await notify(req, { to: p.user, type: 'like', post: p._id });
  res.json({ likes: p.likes });
});

router.put('/:id/save', auth, async (req, res) => {
  if (!(await Post.exists({ _id: req.params.id }))) return res.status(404).json({ msg: 'Post not found.' });
  const me = await User.findById(req.userId);
  const has = me.saved.some((s) => s.equals(req.params.id));
  await User.findByIdAndUpdate(req.userId, { [has ? '$pull' : '$addToSet']: { saved: req.params.id } });
  res.json({ saved: !has });
});

router.post('/:id/comment', auth, async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ msg: "Comment can't be empty." });
  if (text.length > 500) return res.status(400).json({ msg: 'Comments can be at most 500 characters.' });
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Post not found.' });
  p.comments.push({ user: req.userId, text });
  await p.save();
  await notify(req, { to: p.user, type: 'comment', post: p._id, text: text.slice(0, 80) });
  res.json((await populate(Post.findById(p._id))).comments);
});

// Delete a comment: its author, or the owner of the post
router.delete('/:id/comments/:cid', auth, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Post not found.' });
  const c = p.comments.id(req.params.cid);
  if (!c) return res.status(404).json({ msg: 'Comment not found.' });
  if (!c.user.equals(req.userId) && !p.user.equals(req.userId)) return res.status(403).json({ msg: "You can't delete this comment." });
  p.comments = p.comments.filter((x) => !x._id.equals(c._id));
  await p.save();
  res.json((await populate(Post.findById(p._id))).comments);
});

router.delete('/:id', auth, async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Post not found.' });
  if (!p.user.equals(req.userId)) return res.status(403).json({ msg: "You can't delete someone else's post." });
  removeUpload(p.media);
  await Notification.deleteMany({ post: p._id });
  await User.updateMany({ saved: p._id }, { $pull: { saved: p._id } });
  await p.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
