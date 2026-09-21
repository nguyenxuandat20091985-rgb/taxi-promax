/**
 * scripts/set-claims.template.js
 *
 * Khi sẵn sàng bật Custom Claims:
 * 1. npm install firebase-admin --save
 * 2. Copy file này thành api/set-claims.js
 * 3. Set env FIREBASE_SERVICE_ACCOUNT_JSON trên Vercel (toàn bộ JSON service account)
 *
 * Body: { uid, role: 'driver'|'customer'|'admin', entityId? }
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
  const firebaseAdmin = await import('firebase-admin');
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

  const body = readJsonBody(req);
  const uid = cleanText(body.uid, 128);
  const role = cleanText(body.role, 20);
  const entityId = cleanText(body.entityId || '', 64);

  if (!uid || !['driver', 'customer', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'uid and valid role are required' });
  }

  const claims = { admin: false, driverId: null, customerId: null };
  if (role === 'admin') claims.admin = true;
  else if (role === 'driver') {
    if (!isSafeId(entityId)) return res.status(400).json({ success: false, error: 'Valid entityId required' });
    claims.driverId = entityId;
  } else if (role === 'customer') {
    if (!isSafeId(entityId)) return res.status(400).json({ success: false, error: 'Valid entityId required' });
    claims.customerId = entityId;
  }

  try {
    const admin = await getAdmin();
    await admin.auth().setCustomUserClaims(uid, claims);
    return res.status(200).json({ success: true, uid, claims });
  } catch (err) {
    console.error('[set-claims]', err);
    if (err && err.code === 'NO_SERVICE_ACCOUNT') {
      return res.status(503).json({ success: false, error: 'Set FIREBASE_SERVICE_ACCOUNT_JSON' });
    }
    return res.status(500).json({ success: false, error: 'Failed to set custom claims' });
  }
}
