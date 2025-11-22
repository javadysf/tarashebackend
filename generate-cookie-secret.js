#!/usr/bin/env node

/**
 * Script to generate a secure COOKIE_SECRET
 * Usage: node generate-cookie-secret.js
 */

const crypto = require('crypto');

// Generate a secure random string (128 characters = 64 bytes in hex)
const cookieSecret = crypto.randomBytes(64).toString('hex');

console.log('\n🍪 Generated COOKIE_SECRET:');
console.log('='.repeat(80));
console.log(cookieSecret);
console.log('='.repeat(80));
console.log('\n📝 Add this to your .env file:');
console.log(`COOKIE_SECRET=${cookieSecret}`);
console.log('\n⚠️  IMPORTANT: Keep this secret secure and never commit it to version control!');
console.log('✅ This is a cryptographically secure random string suitable for production use.\n');






