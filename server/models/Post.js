const mongoose = require('mongoose');
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
const PostSchema = new mongoose.Schema(
  {
    user: { ...ref, required: true },
    caption: { type: String, default: '' },
    media: { type: String, required: true },
    type: { type: String, enum: ['post', 'reel'], default: 'post' },
    likes: [ref],
    comments: [{ user: ref, text: String, createdAt: { type: Date, default: Date.now } }],
    hashtags: [{ type: String, index: true }], // lowercase tags extracted from caption (indexed)
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// Feed / profile grid: posts of given user(s) newest first
PostSchema.index({ user: 1, createdAt: -1 });
// Reels tab
PostSchema.index({ type: 1, createdAt: -1 });
// Explore
PostSchema.index({ createdAt: -1 });
// Keep hashtags in sync with caption
PostSchema.pre('save', function (next) {
  if (this.isModified('caption')) {
    this.hashtags = [...new Set((this.caption || '').match(/#\w+/g)?.map((t) => t.slice(1).toLowerCase()) || [])];
  }
  next();
});
module.exports = mongoose.model('Post', PostSchema);
