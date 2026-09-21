/**
 * api/set-claims.js
 * Chỉ admin session được phép gọi.
 * Cần biến môi trường: FIREBASE_SERVICE_ACCOUNT_JSON (toàn bộ JSON service account)
 *
 * Body: { uid: string, role: 'driver'|'customer'|'admin', entityId?: string }
 */
import admin from 'firebase-admin';
import {
  applyCors,
  rejectInvalidMethod,
  readJsonBody,
  verifyAdminSession,
  cleanText,
  isSafeId
} from '../lib/api-security.js';

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  }
  const sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
  admin.initializeApp({
    credential: admin.credential.cert(sa)
  });
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

  const claims = {
    admin: false,
    driverId: null,
    customerId: null
  };

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
    initAdmin();
    await admin.auth().setCustomUserClaims(uid, claims);
    return res.status(200).json({ success: true, uid, claims });
  } catch (err) {
    console.error('[set-claims]', err);
    return res.status(500).json({ success: false, error: 'Failed to set custom claims' });
  }
}
