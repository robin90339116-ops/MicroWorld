const crypto = require('crypto');

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function secureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

module.exports = {
  hashValue,
  secureToken
};
