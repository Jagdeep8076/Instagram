const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'Please log in to continue.' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ msg: 'Your session has expired. Please log in again.' }); }
};
