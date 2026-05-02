#!/usr/bin/env node
/**
 * Prints a bcrypt hash suitable for PLATFORM_ADMIN_PASSWORD_HASH.
 * Usage: node scripts/hash-platform-admin-password.mjs 'your-secure-password'
 */
import bcrypt from 'bcryptjs';

const plain = process.argv[2];
if (!plain || plain.length < 8) {
  console.error('Usage: node scripts/hash-platform-admin-password.mjs <password-at-least-8-chars>');
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 12);
const b64 = `b64:${Buffer.from(hash, 'utf8').toString('base64')}`;

console.log('');
console.log('Add ONE of these to .env.local (recommended: b64 — no $ character issues):');
console.log('');
console.log(`PLATFORM_ADMIN_PASSWORD_HASH=${b64}`);
console.log('');
console.log('Or raw bcrypt (must keep double quotes — unquoted values often break on $):');
console.log(`PLATFORM_ADMIN_PASSWORD_HASH="${hash}"`);
console.log('');
