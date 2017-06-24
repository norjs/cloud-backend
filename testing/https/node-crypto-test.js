
// External const data
const serverPrivateKeyFile = "./tmp/localhost-key.pem";
const serverPublicKeyFile = "./tmp/localhost-crt.pem";

// Modules
const crypto = require('crypto');
const debug = require('nor-debug');
const fs = require('fs');

// Read files
const serverPrivateKey = fs.readFileSync(serverPrivateKeyFile, {encoding:'utf8'});
const serverPublicKey = fs.readFileSync(serverPublicKeyFile, {encoding:'utf8'});

// Test content
const originalContent = "Hello World";
const originalContentBuffer = Buffer.from(originalContent, 'utf8');

// Server encrypts content
const encryptedTestContent = crypto.privateEncrypt(serverPrivateKey, originalContentBuffer);
debug.log('encryptedTestContent = ', encryptedTestContent);

// Client decrypts content
const decryptedTestContent = crypto.publicDecrypt(serverPublicKey, encryptedTestContent);
debug.log('decryptedTestContent = ', decryptedTestContent);

const decryptedTestContentString = decryptedTestContent.toString('utf8');
debug.log('decryptedTestContentString = ', decryptedTestContentString);

