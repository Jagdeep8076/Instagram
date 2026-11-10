const mongoose = require('mongoose');
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
const MessageSchema = new mongoose.Schema(
  {
    from: { ...ref, required: true },
    to: { ...ref, required: true },
    text: { type: String, default: '' },
    isUnsent: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
MessageSchema.index({ from: 1, to: 1, createdAt: 1 }); // chat history (one direction)
MessageSchema.index({ to: 1, from: 1, createdAt: 1 }); // chat history (other direction)
MessageSchema.index({ to: 1, read: 1 });               // unread count
MessageSchema.index({ from: 1, createdAt: -1 });        // conversation list
module.exports = mongoose.model('Message', MessageSchema);
