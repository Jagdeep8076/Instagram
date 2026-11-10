const mongoose = require('mongoose');
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
const StorySchema = new mongoose.Schema({
  user: { ...ref, required: true },
  media: { type: String, required: true },
  viewers: [ref],
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // auto-delete after 24h (TTL index)
});
StorySchema.index({ user: 1, createdAt: 1 });
module.exports = mongoose.model('Story', StorySchema);
