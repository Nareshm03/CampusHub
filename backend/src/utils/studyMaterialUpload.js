// Study-material uploader (25MB/file, max 10 files).
//
// Staging variant: files land in uploads/.tmp/ and the controller persists
// them through the storage adapter (local dir today, private blob tomorrow).
// Validation (doc/slide/sheet/text/image allowlist, 25MB, 10 files) is
// unchanged.
const { uploadFor } = require('./stagedUpload');

const studyMaterialUpload = uploadFor('study-materials', { files: 10 });

module.exports = studyMaterialUpload;
