const mongoose = require('mongoose');
// 6-digit email confirmation codes (hashed, expiring, attempt-limited)
const S = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, default: 'signup' },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
});
S.index({ email: 1, purpose: 1 }, { unique: true });
S.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('OtpCode', S);
