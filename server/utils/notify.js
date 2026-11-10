const Notification = require('../models/Notification');
// Creates a notification and pushes it live via socket. Skips self-notifications and duplicate like/follow.
module.exports = async (req, { to, type, post, text }) => {
  if (String(to) === String(req.userId)) return;
  if (type !== 'comment' && (await Notification.findOne({ to, from: req.userId, type, post }))) return;
  const n = await Notification.create({ to, from: req.userId, type, post, text });
  const full = await Notification.findById(n._id).populate('from', 'username avatar').populate('post', 'media type');
  req.app.get('io')?.to('u:' + to).emit('notification', full);
};
