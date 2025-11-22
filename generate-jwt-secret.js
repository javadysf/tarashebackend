#!/usr/bin/env node

/**
 * Script to generate a secure JWT_SECRET
 * Usage: node generate-jwt-secret.js
 */

const crypto = require('crypto');

// Generate a secure random string (128 characters = 64 bytes in hex)
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 Generated JWT_SECRET:');
console.log('='.repeat(80));
console.log(jwtSecret);
console.log('='.repeat(80));
console.log('\n📝 Add this to your .env file:');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('\n⚠️  IMPORTANT: Keep this secret secure and never commit it to version control!');
console.log('✅ This is a cryptographically secure random string suitable for production use.\n');






