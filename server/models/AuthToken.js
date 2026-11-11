const mongoose = require('mongoose');
// Refresh tokens and password-reset tokens. Only a SHA-256 hash of the secret is stored.
const S = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['refresh', 'reset'], required: true },
    hash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    meta: String,
  },
  { timestamps: true }
);
S.index({ user: 1, type: 1 });
S.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-clean expired tokens
module.exports = mongoose.model('AuthToken', S);
