const crypto = require('crypto');

module.exports = {
    bootstrapNodes: ['127.0.0.1:30001'],
    uniqueId: crypto.randomBytes(4).toString('hex') // Unique ID for each instance
};