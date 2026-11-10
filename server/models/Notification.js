const mongoose = require('mongoose');
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
const NotificationSchema = new mongoose.Schema(
  {
    to: { ...ref, required: true },
    from: { ...ref, required: true },
    type: { type: String, enum: ['like', 'comment', 'follow'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    text: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
NotificationSchema.index({ to: 1, createdAt: -1 });        // notification list
NotificationSchema.index({ to: 1, read: 1 });               // unread badge count
NotificationSchema.index({ to: 1, from: 1, type: 1, post: 1 }); // duplicate like/follow check
module.exports = mongoose.model('Notification', NotificationSchema);
