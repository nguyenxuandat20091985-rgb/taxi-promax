#!/usr/bin/env node
/**
 * Tạo ADMIN_PASSWORD_HASH (sha256 hex) để set trên Vercel.
 *
 *   node scripts/hash-admin-password.mjs "matkhau-cua-anh"
 */
import crypto from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your-password"');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');
console.log('ADMIN_PASSWORD_HASH=' + hash);
