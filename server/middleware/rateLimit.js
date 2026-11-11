const rateLimit = require('express-rate-limit');
// Set RATE_LIMIT_DISABLED=true only for automated tests
const make = (minutes, limit) =>
  process.env.RATE_LIMIT_DISABLED === 'true'
    ? (req, res, next) => next()
    : rateLimit({ windowMs: minutes * 60e3, limit, standardHeaders: true, legacyHeaders: false, message: { msg: 'Too many attempts. Please wait a few minutes and try again.' } });
module.exports = { login: make(15, 30), signup: make(60, 15), code: make(15, 30), forgot: make(60, 10), reset: make(15, 20) };
