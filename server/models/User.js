const mongoose = require('mongoose');

const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    birthdate: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      codeHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
    },
    resetPassword: {
      tokenHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
    followers: [ref],
    following: [ref],
    saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });

module.exports = mongoose.model('User', UserSchema);
