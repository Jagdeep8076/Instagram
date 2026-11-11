const mongoose = require('mongoose');
const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    birthday: Date,
    verified: { type: Boolean, default: true }, // signup sets false until the email code is confirmed
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
    followers: [ref],
    following: [ref],
    saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
module.exports = mongoose.model('User', UserSchema);
