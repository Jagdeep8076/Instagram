const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname)),
});
module.exports = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^(image|video)\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image/video allowed')),
});
