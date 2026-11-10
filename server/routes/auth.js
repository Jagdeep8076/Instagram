const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const RESERVED = [
  'messages', 'notifications', 'explore', 'reels', 'create', 'post', 'tag',
  'api', 'uploads', 'saved', 'accounts', 'login', 'signup', 'auth', 'settings'
];

const COMMON_PASSWORDS = [
  'password', '12345678', '123456789', 'qwerty123', 'admin123', 'password123',
  'instaclone', 'welcome123', 'letmein123', 'iloveyou', '1234567890', 'sunshine', 'princess'
];

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests from this IP, please try again in 15 minutes' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts, please try again in 15 minutes' },
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many code resend requests, please try again in 15 minutes' },
});

// Token helpers
const hashToken = (str) => crypto.createHash('sha256').update(str).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

const createRefreshToken = () => crypto.randomBytes(40).toString('hex');

const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
};

const safe = (u) => ({
  _id: u._id,
  username: u.username,
  fullName: u.fullName,
  avatar: u.avatar,
  bio: u.bio,
  saved: u.saved || [],
  isVerified: u.isVerified,
});

// Live username availability check
router.get('/check-username', async (req, res) => {
  try {
    const username = (req.query.username || '').trim().toLowerCase();
    if (!username || username.length < 3) {
      return res.json({ available: false, msg: 'Username must be at least 3 characters' });
    }
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
      return res.json({ available: false, msg: 'Only letters, numbers, periods and underscores' });
    }
    if (RESERVED.includes(username)) {
      return res.json({ available: false, msg: 'This username is reserved' });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.json({ available: false, msg: 'Username is already taken' });
    }
    res.json({ available: true, msg: 'Username is available' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Registration with email verification code
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, fullName, birthdate } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9._]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({ msg: 'Username must be 3-30 characters with letters, numbers, period, or underscore' });
    }
    if (RESERVED.includes(cleanUsername)) {
      return res.status(400).json({ msg: 'This username is not available' });
    }
    if (password.length < 8) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters long' });
    }
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      return res.status(400).json({ msg: 'This password is too common. Please choose a stronger password.' });
    }

    // Check age >= 13
    if (birthdate) {
      const bDate = new Date(birthdate);
      const now = new Date();
      let age = now.getFullYear() - bDate.getFullYear();
      const m = now.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) age--;
      if (age < 13) {
        return res.status(400).json({ msg: 'You must be at least 13 years old to use Instaclone' });
      }
    }

    // Check existing verified user
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    });

    // 6-digit confirmation code
    const rawCode = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashToken(rawCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (existing) {
      if (existing.isVerified) {
        return res.status(400).json({ msg: 'Username or email is already registered and verified' });
      }
      // Update unverified user with new code and details
      existing.username = cleanUsername;
      existing.fullName = (fullName || '').trim();
      existing.password = await bcrypt.hash(password, 12);
      if (birthdate) existing.birthdate = new Date(birthdate);
      existing.verificationCode = {
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      };
      await existing.save();
    } else {
      // Create new unverified user
      const hashedPassword = await bcrypt.hash(password, 12);
      await User.create({
        username: cleanUsername,
        email: cleanEmail,
        fullName: (fullName || '').trim(),
        password: hashedPassword,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        isVerified: false,
        verificationCode: {
          codeHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      });
    }

    // Send code
    await sendMail({
      to: cleanEmail,
      subject: `${rawCode} is your Instaclone confirmation code`,
      text: `Welcome to Instaclone!\n\nYour 6-digit verification code is: ${rawCode}\n\nThis code expires in 10 minutes. If you did not sign up for Instaclone, please disregard this email.`,
    });

    res.json({
      msg: 'Confirmation code sent',
      needsVerification: true,
      email: cleanEmail,
      username: cleanUsername,
    });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Verify 6-digit signup confirmation code
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ msg: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ msg: 'User account not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ msg: 'Account is already verified. Please log in.' });
    }

    const v = user.verificationCode;
    if (!v || !v.codeHash || !v.expiresAt) {
      return res.status(400).json({ msg: 'No active verification code found. Please request a new code.' });
    }

    if (v.attempts >= 5) {
      return res.status(400).json({
        msg: 'Maximum verification attempts exceeded. Please request a new confirmation code.',
        attemptsRemaining: 0,
      });
    }

    if (new Date() > v.expiresAt) {
      return res.status(400).json({ msg: 'Confirmation code has expired. Please request a new code.' });
    }

    if (hashToken(cleanCode) !== v.codeHash) {
      user.verificationCode.attempts = (v.attempts || 0) + 1;
      await user.save();
      const remaining = Math.max(5 - user.verificationCode.attempts, 0);
      return res.status(400).json({
        msg: `Incorrect code. ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // Code verified successfully!
    user.isVerified = true;
    user.verificationCode = { codeHash: null, expiresAt: null, attempts: 0, lastSentAt: null };

    // Issue access token and refresh token
    const accessToken = signAccessToken(user);
    const rawRefreshToken = createRefreshToken();
    const refreshHash = hashToken(rawRefreshToken);
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({ tokenHash: refreshHash, expiresAt: refreshExpiry });
    await user.save();

    setRefreshCookie(res, rawRefreshToken);
    res.json({ token: accessToken, user: safe(user) });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Resend verification code (with 60s cooldown)
router.post('/resend-code', resendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) return res.status(404).json({ msg: 'User account not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'Account is already verified. Please log in.' });

    // Check 60s cooldown
    if (user.verificationCode?.lastSentAt) {
      const elapsedSec = (Date.now() - new Date(user.verificationCode.lastSentAt).getTime()) / 1000;
      if (elapsedSec < 60) {
        return res.status(429).json({
          msg: `Please wait ${Math.ceil(60 - elapsedSec)} seconds before requesting another code.`,
        });
      }
    }

    const rawCode = String(Math.floor(100000 + Math.random() * 900000));
    user.verificationCode = {
      codeHash: hashToken(rawCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date(),
    };
    await user.save();

    await sendMail({
      to: cleanEmail,
      subject: `${rawCode} is your new Instaclone confirmation code`,
      text: `Your new 6-digit confirmation code is: ${rawCode}\n\nThis code expires in 10 minutes.`,
    });

    res.json({ msg: 'New confirmation code sent successfully' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Login with lockout protection and dual-token issuance
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ msg: 'Username/email and password are required' });
    }

    const l = login.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: l }, { username: l }] });

    // Check account lockout
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      const waitMin = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        msg: `Account temporarily locked due to repeated failed logins. Please try again in ${waitMin} minute(s).`,
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        }
        await user.save();
      }
      return res.status(400).json({ msg: 'Invalid credentials. Please check your username and password.' });
    }

    // Check if unverified
    if (!user.isVerified) {
      return res.status(400).json({
        msg: 'Please verify your email address to log in.',
        needsVerification: true,
        email: user.email,
        username: user.username,
      });
    }

    // Reset lockout counters on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // Issue dual tokens
    const accessToken = signAccessToken(user);
    const rawRefreshToken = createRefreshToken();
    const refreshHash = hashToken(rawRefreshToken);
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Filter out expired refresh tokens and add new one
    user.refreshTokens = (user.refreshTokens || []).filter((t) => t.expiresAt > new Date());
    user.refreshTokens.push({ tokenHash: refreshHash, expiresAt: refreshExpiry });
    await user.save();

    setRefreshCookie(res, rawRefreshToken);
    res.json({ token: accessToken, user: safe(user) });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Refresh Access Token with Token Rotation
router.post('/refresh', async (req, res) => {
  try {
    const rawCookieToken = req.cookies?.refreshToken;
    if (!rawCookieToken) {
      return res.status(401).json({ msg: 'No refresh token provided' });
    }

    const hashedReceived = hashToken(rawCookieToken);
    const user = await User.findOne({
      'refreshTokens.tokenHash': hashedReceived,
      'refreshTokens.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ msg: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token: remove used token, add new token
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== hashedReceived && t.expiresAt > new Date());
    const newRawRefreshToken = createRefreshToken();
    const newRefreshHash = hashToken(newRawRefreshToken);
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({ tokenHash: newRefreshHash, expiresAt: refreshExpiry });
    await user.save();

    setRefreshCookie(res, newRawRefreshToken);
    const newAccessToken = signAccessToken(user);

    res.json({ token: newAccessToken, user: safe(user) });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Logout: revoke refresh token and clear cookie
router.post('/logout', async (req, res) => {
  try {
    const rawCookieToken = req.cookies?.refreshToken;
    if (rawCookieToken) {
      const hashedReceived = hashToken(rawCookieToken);
      await User.updateOne(
        { 'refreshTokens.tokenHash': hashedReceived },
        { $pull: { refreshTokens: { tokenHash: hashedReceived } } }
      );
    }
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ ok: true, msg: 'Logged out successfully' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Forgot Password: sends reset link with single-use hashed token
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ msg: 'Username or email is required' });
    }

    const id = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: id }, { username: id }],
      isVerified: { $ne: false },
    });

    let maskedEmail = '';
    if (user) {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      user.resetPassword = {
        tokenHash: hashToken(rawResetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      };
      await user.save();

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetLink = `${clientUrl}/accounts/password/reset/confirm/${rawResetToken}`;

      // Mask email: j***@example.com
      const [localPart, domain] = user.email.split('@');
      maskedEmail = localPart[0] + '****@' + domain;

      await sendMail({
        to: user.email,
        subject: 'Reset your Instaclone password',
        text: `Hi ${user.username},\n\nWe received a request to reset your Instaclone password.\nClick the link below to set a new password:\n\n${resetLink}\n\nThis link is single-use and will expire in 1 hour.\nIf you did not request a password reset, you can safely ignore this email.`,
      });
    }

    // Always generic response to prevent account enumeration
    res.json({
      msg: 'If an account matches that username or email, we have sent a link to reset your password.',
      maskedEmail,
    });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Confirm Password Reset with Token
router.post('/reset-password/:token', authLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ msg: 'Token and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters long' });
    }
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      return res.status(400).json({ msg: 'This password is too common. Please choose a stronger password.' });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      'resetPassword.tokenHash': tokenHash,
      'resetPassword.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Password reset link is invalid or has expired' });
    }

    // Hash new password with 12 rounds
    user.password = await bcrypt.hash(password, 12);
    // Clear reset token
    user.resetPassword = { tokenHash: null, expiresAt: null };
    // Revoke all active sessions
    user.refreshTokens = [];
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.clearCookie('refreshToken', { path: '/' });
    res.json({ msg: 'Password has been reset successfully' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Change Password in settings (requires current password)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ msg: 'New password must be at least 8 characters long' });
    }
    if (COMMON_PASSWORDS.includes(newPassword.toLowerCase())) {
      return res.status(400).json({ msg: 'This password is too common. Please choose a stronger password.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    // Revoke other refresh tokens
    user.refreshTokens = [];
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Get Current Authenticated User
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ user: safe(user) });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

module.exports = router;
