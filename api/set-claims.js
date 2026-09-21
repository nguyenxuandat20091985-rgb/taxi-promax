/**
 * api/set-claims.js — STUB (preview-safe)
 *
 * Bản đầy đủ nằm ở: scripts/set-claims.template.js
 * Khi anh sẵn sàng bật Custom Claims:
 * 1. npm install firebase-admin
 * 2. Copy scripts/set-claims.template.js → api/set-claims.js
 * 3. Set FIREBASE_SERVICE_ACCOUNT_JSON trên Vercel
 *
 * Stub này luôn trả 503 để không làm fail build/preview.
 */
import {
  applyCors,
  rejectInvalidMethod,
  verifyAdminSession
} from '../lib/api-security.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (rejectInvalidMethod(req, res)) return;

  if (!verifyAdminSession(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  return res.status(503).json({
    success: false,
    error: 'set-claims not enabled yet. See scripts/set-claims.template.js and AUTH_MIGRATION.md'
  });
}
