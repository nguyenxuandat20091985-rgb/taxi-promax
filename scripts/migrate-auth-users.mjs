/**
 * scripts/migrate-auth-users.mjs
 *
 * Chạy local với service account.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *   export FIREBASE_DB_URL=https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app
 *   node scripts/migrate-auth-users.mjs --dry-run
 *   node scripts/migrate-auth-users.mjs
 */

import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';

const DRY_RUN = process.argv.includes('--dry-run');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DB_URL || 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
}

const db = getDatabase();
const auth = admin.auth();

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0') && p.length === 10) p = '84' + p.slice(1);
  if (p.startsWith('84') && p.length === 11) return '+' + p;
  if (p.length >= 10) return '+' + p;
  return null;
}

async function ensureAuthUser(phone, displayName) {
  const e164 = normalizePhone(phone);
  if (!e164) {
    console.warn(`  ⚠ Không chuẩn hóa được SĐT: ${phone}`);
    return null;
  }
  try {
    const existing = await auth.getUserByPhoneNumber(e164);
    return existing.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  if (DRY_RUN) {
    console.log(`  [DRY] Sẽ tạo Auth user phone=${e164} name=${displayName}`);
    return 'DRY_RUN_UID_' + e164;
  }
  const user = await auth.createUser({
    phoneNumber: e164,
    displayName: displayName || undefined
  });
  console.log(`  ✓ Tạo Auth user ${user.uid} (${e164})`);
  return user.uid;
}

async function setClaims(uid, role, entityId) {
  const claims = { admin: false, driverId: null, customerId: null };
  if (role === 'driver') claims.driverId = entityId;
  if (role === 'customer') claims.customerId = entityId;
  if (role === 'admin') claims.admin = true;
  if (DRY_RUN) {
    console.log(`  [DRY] setCustomUserClaims(${uid}, ${JSON.stringify(claims)})`);
    return;
  }
  await auth.setCustomUserClaims(uid, claims);
  console.log(`  ✓ Claims: ${JSON.stringify(claims)}`);
}

async function migrateDrivers() {
  console.log('\n=== MIGRATING DRIVERS ===');
  const snap = await db.ref('drivers').once('value');
  const drivers = snap.val() || {};
  let ok = 0, skip = 0, fail = 0;
  for (const [driverId, data] of Object.entries(drivers)) {
    if (!data || typeof data !== 'object') continue;
    console.log(`\nDriver ${driverId} (${data.name || data.phone})`);
    if (data.authUid && !DRY_RUN) { console.log('  → Đã có authUid, bỏ qua'); skip++; continue; }
    try {
      const uid = await ensureAuthUser(data.phone, data.name);
      if (!uid) { fail++; continue; }
      await setClaims(uid, 'driver', driverId);
      if (!DRY_RUN) {
        await db.ref(`drivers/${driverId}/authUid`).set(uid);
        await db.ref(`drivers/${driverId}/uid`).set(driverId);
      }
      ok++;
    } catch (err) {
      console.error(`  ✗ Lỗi:`, err.message);
      fail++;
    }
  }
  console.log(`\nDrivers xong: ok=${ok} skip=${skip} fail=${fail}`);
}

async function migrateCustomers() {
  console.log('\n=== MIGRATING CUSTOMERS ===');
  const snap = await db.ref('customers').once('value');
  const customers = snap.val() || {};
  let ok = 0, skip = 0, fail = 0;
  for (const [customerId, data] of Object.entries(customers)) {
    if (!data || typeof data !== 'object') continue;
    console.log(`\nCustomer ${customerId} (${data.name || data.phone})`);
    if (data.authUid && !DRY_RUN) { console.log('  → Đã có authUid, bỏ qua'); skip++; continue; }
    try {
      const uid = await ensureAuthUser(data.phone, data.name);
      if (!uid) { fail++; continue; }
      await setClaims(uid, 'customer', customerId);
      if (!DRY_RUN) {
        await db.ref(`customers/${customerId}/authUid`).set(uid);
        await db.ref(`customers/${customerId}/uid`).set(customerId);
      }
      ok++;
    } catch (err) {
      console.error(`  ✗ Lỗi:`, err.message);
      fail++;
    }
  }
  console.log(`\nCustomers xong: ok=${ok} skip=${skip} fail=${fail}`);
}

async function main() {
  console.log(DRY_RUN ? '*** DRY-RUN MODE ***' : '*** LIVE MODE ***');
  await migrateDrivers();
  await migrateCustomers();
  console.log('\nHoàn tất. Nhớ force refresh token phía client sau khi set claims.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
