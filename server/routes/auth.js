const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const AuthToken = require('../models/AuthToken');
const auth = require('../middleware/auth');
const limit = require('../middleware/rateLimit');
const safe = require('../utils/safeUser');
const { sha, rand, issueSession } = require('../utils/tokens');
const { sendMail, codeMail, resetMail } = require('../utils/mail');
const V = require('../utils/validate');

const COOLDOWN_MS = 60e3;
const MAX_CODE_ATTEMPTS = 5;
const showDev = () => process.env.NODE_ENV !== 'production' && process.env.DEV_SHOW_OTP === 'true'; // dev helper only
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps login timing equal for unknown users

// Create + email a fresh 6-digit code. Returns { code, emailSent } (throws if SMTP is configured but fails and we can't fall back)
async function sendCode(email) {
  const code = String(crypto.randomInt(100000, 1000000));
  await OtpCode.findOneAndUpdate({ email, purpose: 'signup' }, { codeHash: sha(code), expiresAt: new Date(Date.now() + 10 * 60e3), attempts: 0, lastSentAt: new Date() }, { upsert: true });
  let emailSent = false, emailError = false;
  try { emailSent = await sendMail({ to: email, ...codeMail(code) }); } catch { emailError = true; }
  if (emailError && !showDev()) { await OtpCode.deleteOne({ email, purpose: 'signup' }); const e = new Error("We couldn't send the confirmation email. Please try again in a moment."); e.status = 502; throw e; }
  return { code, emailSent, emailError };
}
const cooldownLeft = async (email) => { const o = await OtpCode.findOne({ email, purpose: 'signup' }); return o ? Math.max(0, Math.ceil((o.lastSentAt.getTime() + COOLDOWN_MS - Date.now()) / 1000)) : 0; };
const devInfo = (r) => (showDev() ? { devCode: r.code, emailSent: r.emailSent, emailError: r.emailError } : { emailSent: r.emailSent });

// ---------- Sign up ----------
router.get('/check-username', limit.code, async (req, res) => {
  const p = V.username.safeParse(String(req.query.u || req.query.username || ''));
  if (!p.success) return res.json({ available: false, reason: p.error.issues[0].message });
  const taken = await User.exists({ username: p.data, verified: { $ne: false } });
  res.json({ available: !taken, reason: taken ? 'That username is taken. Try another.' : undefined });
});

router.post('/signup', limit.signup, async (req, res) => {
  const p = V.signup.safeParse(req.body);
  if (!p.success) return V.fail(res, p.error);
  const { email, password, username, fullName, birthday } = p.data;
  const byEmail = await User.findOne({ email });
  if (byEmail?.verified) return res.status(409).json({ msg: 'An account with this email already exists. Try logging in.', field: 'email' });
  const byName = await User.findOne({ username });
  if (byName && !(byEmail && byName._id.equals(byEmail._id))) {
    if (byName.verified) return res.status(409).json({ msg: 'That username is taken. Try another.', field: 'username' });
    await byName.deleteOne(); // abandoned, never-confirmed signup
  }
  const data = { username, email, fullName, password: await bcrypt.hash(password, 12), birthday: new Date(Date.UTC(birthday.year, birthday.month - 1, birthday.day)), verified: false };
  if (byEmail) { Object.assign(byEmail, data); await byEmail.save(); } else await User.create(data);
  const wait = await cooldownLeft(email);
  if (wait > 0) return res.json({ ok: true, email, retryAfter: wait }); // a code was just sent; keep using it
  const r = await sendCode(email);
  res.json({ ok: true, email, retryAfter: 60, ...devInfo(r) });
});

router.post('/verify', limit.code, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const otp = await OtpCode.findOne({ email, purpose: 'signup' });
  if (!otp || otp.expiresAt < new Date()) return res.status(400).json({ msg: 'That code has expired. Request a new one.', code: 'EXPIRED' });
  if (otp.attempts >= MAX_CODE_ATTEMPTS) return res.status(429).json({ msg: 'Too many incorrect attempts. Request a new code.', code: 'LOCKED' });
  if (sha(code) !== otp.codeHash) {
    otp.attempts += 1; await otp.save();
    return res.status(400).json({ msg: "That code isn't right. Check the code and try again.", attemptsLeft: MAX_CODE_ATTEMPTS - otp.attempts });
  }
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'Account not found. Please sign up again.' });
  user.verified = true; await user.save();
  await OtpCode.deleteOne({ _id: otp._id });
  res.json({ accessToken: await issueSession(req, res, user), user: safe(user) });
});

router.post('/resend', limit.code, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email, verified: false });
  if (!user) return res.json({ ok: true, retryAfter: 60 }); // generic
  const wait = await cooldownLeft(email);
  if (wait > 0) return res.status(429).json({ msg: `Please wait ${wait}s before requesting another code.`, retryAfter: wait });
  const r = await sendCode(email);
  res.json({ ok: true, retryAfter: 60, ...devInfo(r) });
});

// ---------- Log in / session ----------
router.post('/login', limit.login, async (req, res) => {
  const id = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!id || !password) return res.status(400).json({ msg: 'Enter your username or email and password.' });
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] });
  if (user?.lockUntil && user.lockUntil > new Date()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60e3);
    return res.status(429).json({ msg: `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''} or reset your password.`, code: 'LOCKED' });
  }
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) {
    if (user) {
      user.failedLogins += 1;
      if (user.failedLogins >= 5) { user.lockUntil = new Date(Date.now() + 15 * 60e3); user.failedLogins = 0; }
      await user.save();
    }
    return res.status(400).json({ msg: 'The username or password you entered is incorrect.' });
  }
  if (!user.verified) {
    let dev = {};
    if (!(await cooldownLeft(user.email))) dev = devInfo(await sendCode(user.email));
    return res.status(403).json({ msg: 'Confirm your email to continue. We sent you a code.', code: 'UNVERIFIED', email: user.email, ...dev });
  }
  user.failedLogins = 0; user.lockUntil = undefined; await user.save();
  res.json({ accessToken: await issueSession(req, res, user), user: safe(user) });
});

// Rotating refresh token: every use issues a new one; reuse of an old one revokes all sessions (token theft protection)
router.post('/refresh', async (req, res) => {
  const deny = () => { res.clearCookie('refresh', { path: '/api/auth' }); return res.status(401).json({ msg: 'Please log in again.' }); };
  const raw = req.cookies?.refresh;
  if (!raw) return res.status(401).json({ msg: 'Not logged in.' });
  const t = await AuthToken.findOne({ type: 'refresh', hash: sha(raw) });
  if (!t || t.expiresAt < new Date()) return deny();
  if (t.usedAt) {
    const grace = process.env.REFRESH_GRACE_MS !== undefined ? +process.env.REFRESH_GRACE_MS : 10000; // tolerates two tabs refreshing together
    if (Date.now() - t.usedAt.getTime() > grace) { await AuthToken.deleteMany({ user: t.user, type: 'refresh' }); return deny(); }
  } else { t.usedAt = new Date(); await t.save(); }
  const user = await User.findById(t.user);
  if (!user || !user.verified) return deny();
  res.json({ accessToken: await issueSession(req, res, user), user: safe(user) });
});

router.post('/logout', async (req, res) => {
  if (req.cookies?.refresh) await AuthToken.deleteOne({ type: 'refresh', hash: sha(req.cookies.refresh) });
  res.clearCookie('refresh', { path: '/api/auth' });
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: 'User not found.' });
  res.json({ user: safe(user) });
});

// ---------- Forgot / reset password ----------
// Always answers the same way so nobody can discover which accounts exist.
router.post('/forgot', limit.forgot, async (req, res) => {
  const id = String(req.body.login || '').trim().toLowerCase();
  if (!id) return res.status(400).json({ msg: 'Enter your username or email.' });
  const out = { ok: true, message: "If we found an account, we've sent a link to its email address to reset your password." };
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] });
  if (user && user.verified) {
    const recent = await AuthToken.findOne({ user: user._id, type: 'reset', usedAt: null, createdAt: { $gt: new Date(Date.now() - COOLDOWN_MS) } });
    if (!recent) {
      await AuthToken.deleteMany({ user: user._id, type: 'reset' }); // only the newest link works
      const raw = rand();
      await AuthToken.create({ user: user._id, type: 'reset', hash: sha(raw), expiresAt: new Date(Date.now() + 3600e3) });
      const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accounts/password/reset/confirm/${raw}`;
      let sent = false, mailErr = false;
      try { sent = await sendMail({ to: user.email, ...resetMail(link) }); } catch { mailErr = true; }
      if (showDev()) { out.devLink = link; out.emailSent = sent; out.emailError = mailErr; }
    }
  }
  res.json(out);
});

router.get('/reset/validate/:token', limit.code, async (req, res) => {
  const t = await AuthToken.findOne({ type: 'reset', hash: sha(req.params.token) });
  res.json({ valid: !!t && !t.usedAt && t.expiresAt > new Date() });
});

router.post('/reset', limit.reset, async (req, res) => {
  const p = V.password.safeParse(req.body.password);
  if (!p.success) return res.status(400).json({ msg: p.error.issues[0].message, field: 'password' });
  const t = await AuthToken.findOne({ type: 'reset', hash: sha(String(req.body.token || '')) });
  if (!t || t.usedAt || t.expiresAt < new Date()) return res.status(400).json({ msg: 'This reset link is invalid or has expired. Request a new one.', code: 'INVALID_LINK' });
  const user = await User.findById(t.user);
  if (!user) return res.status(400).json({ msg: 'This reset link is invalid or has expired.', code: 'INVALID_LINK' });
  user.password = await bcrypt.hash(p.data, 12); user.passwordChangedAt = new Date(); user.verified = true; user.failedLogins = 0; user.lockUntil = undefined;
  await user.save();
  t.usedAt = new Date(); await t.save();
  await AuthToken.deleteMany({ user: user._id, type: 'refresh' }); // log out everywhere
  res.json({ ok: true });
});

router.post('/change-password', auth, limit.reset, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!(await bcrypt.compare(String(req.body.current || ''), user.password))) return res.status(400).json({ msg: 'Your current password is incorrect.', field: 'current' });
  const p = V.password.safeParse(req.body.next);
  if (!p.success) return res.status(400).json({ msg: p.error.issues[0].message, field: 'next' });
  if (await bcrypt.compare(p.data, user.password)) return res.status(400).json({ msg: 'Your new password must be different from the current one.', field: 'next' });
  user.password = await bcrypt.hash(p.data, 12); user.passwordChangedAt = new Date(); await user.save();
  await AuthToken.deleteMany({ user: user._id, type: 'refresh' });
  res.json({ ok: true, accessToken: await issueSession(req, res, user) }); // keep this device logged in
});

module.exports = router;
