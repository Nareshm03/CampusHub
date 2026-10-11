// Student profile-photo uploader (2MB images).
//
// Staging variant: files land in uploads/.tmp/ and the controller persists
// them through the storage adapter (local dir today, private blob tomorrow).
// Validation (JPEG/PNG/WebP, 2MB, single file) is unchanged.
const { uploadFor } = require('./stagedUpload');

const upload = uploadFor('students');

module.exports = upload;
