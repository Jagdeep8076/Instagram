const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuthToken = require('../models/AuthToken');

const REFRESH_DAYS = 30;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
const signAccess = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
// Refresh cookie is httpOnly (JS can't read it), only sent to /api/auth/*
const cookieOpts = () => ({ httpOnly: true, sameSite: process.env.COOKIE_SAMESITE || 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/auth', maxAge: REFRESH_DAYS * 864e5 });

async function issueSession(req, res, user) {
  const raw = rand();
  await AuthToken.create({ user: user._id, type: 'refresh', hash: sha(raw), expiresAt: new Date(Date.now() + REFRESH_DAYS * 864e5), meta: (req.headers['user-agent'] || '').slice(0, 120) });
  res.cookie('refresh', raw, cookieOpts());
  return signAccess(user._id);
}
module.exports = { sha, rand, signAccess, issueSession, cookieOpts };
