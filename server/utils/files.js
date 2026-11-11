const fs = require('fs');
const path = require('path');
// Delete an uploaded file from disk (ignores errors / foreign paths)
exports.removeUpload = (rel) => {
  if (!rel || !rel.startsWith('/uploads/')) return;
  fs.unlink(path.join(__dirname, '..', 'uploads', path.basename(rel)), () => {});
};
