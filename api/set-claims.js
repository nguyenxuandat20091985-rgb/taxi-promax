/**
 * api/set-claims.js — gắn Custom Claims (admin only)
 *
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON (toàn bộ JSON service account)
 * Body: { uid, role: 'driver'|'customer'|'admin', entityId? }
 *
 * Dynamic import firebase-admin → không cần có package lúc node --check.
 * Khi bật production: npm install firebase-admin --save
 */
import {
  applyCors,
  rejectInvalidMethod,
  readJsonBody,
  verifyAdminSession,
  cleanText,
  isSafeId
} from '../lib/api-security.js';

let adminApp = null;

async function getAdmin() {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const err = new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
    err.code = 'NO_SERVICE_ACCOUNT';
    throw err;
  }
  let firebaseAdmin;
  try {
    firebaseAdmin = await import('firebase-admin');
  } catch (e) {
    const err = new Error('firebase-admin package is not installed. Run: npm install firebase-admin');
    err.code = 'NO_PACKAGE';
    throw err;
  }
  const admin = firebaseAdmin.default || firebaseAdmin;
  if (!admin.apps.length) {
    const sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  adminApp = admin;
  return admin;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (rejectInvalidMethod(req, res)) return;

  if (!verifyAdminSession(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  let body;
  try {
    body = readJsonBody(req);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }

  const uid = cleanText(body.uid, 128);
  const role = cleanText(body.role, 20);
  const entityId = cleanText(body.entityId || '', 64);

  if (!uid || !['driver', 'customer', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'uid and valid role are required' });
  }

  const claims = { admin: false, driverId: null, customerId: null };
  if (role === 'admin') {
    claims.admin = true;
  } else if (role === 'driver') {
    if (!isSafeId(entityId)) {
      return res.status(400).json({ success: false, error: 'Valid entityId (driverId) required' });
    }
    claims.driverId = entityId;
  } else if (role === 'customer') {
    if (!isSafeId(entityId)) {
      return res.status(400).json({ success: false, error: 'Valid entityId (customerId) required' });
    }
    claims.customerId = entityId;
  }

  try {
    const admin = await getAdmin();
    await admin.auth().setCustomUserClaims(uid, claims);
    return res.status(200).json({ success: true, uid, claims });
  } catch (err) {
    console.error('[set-claims]', err);
    if (err && (err.code === 'NO_SERVICE_ACCOUNT' || err.code === 'NO_PACKAGE')) {
      return res.status(503).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to set custom claims' });
  }
}
