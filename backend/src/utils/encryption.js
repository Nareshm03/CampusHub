const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

const encrypt = (text) => {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encryptedData) => {
  if (!encryptedData) return null;
  
  const { encrypted, iv, authTag } = encryptedData;
  const decipher = crypto.createDecipher(algorithm, secretKey, Buffer.from(iv, 'hex'));
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Mongoose plugin for field encryption
const encryptionPlugin = function(schema, options) {
  const fieldsToEncrypt = options.fields || [];
  
  schema.pre('save', function(next) {
    fieldsToEncrypt.forEach(field => {
      if (this[field] && !this[field].encrypted) {
        this[field] = encrypt(this[field]);
      }
    });
    next();
  });
  
  schema.post('find', function(docs) {
    if (Array.isArray(docs)) {
      docs.forEach(doc => decryptFields(doc, fieldsToEncrypt));
    }
  });
  
  schema.post('findOne', function(doc) {
    if (doc) decryptFields(doc, fieldsToEncrypt);
  });
};

const decryptFields = (doc, fields) => {
  fields.forEach(field => {
    if (doc[field] && doc[field].encrypted) {
      doc[field] = decrypt(doc[field]);
    }
  });
};

module.exports = {
  encrypt,
  decrypt,
  encryptionPlugin
};