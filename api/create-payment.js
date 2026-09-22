/**
 * api/create-payment.js — Tạo link PayOS + lưu pending (nếu có FIREBASE_DATABASE_SECRET)
 */
import PayOS from '@payos/node';
import { fbPut, hasFirebaseSecret } from '../lib/firebase-rest.js';

const APP_URL = 'https://taxi-promax.vercel.app';

const PLAN_ALIASES = {
  'LẺ': 'LẺ', 'LE': 'LẺ', 'CHUYEN LE': 'LẺ', 'CHUYẾN LẺ': 'LẺ',
  'PRO': 'PRO', 'GÓI PRO': 'PRO', 'GOI PRO': 'PRO',
  'PROMAX': 'PROMAX', 'PRO MAX': 'PROMAX', 'PRO-MAX': 'PROMAX',
  'TRIAL 7D': 'TRIAL 7D', 'TRIAL': 'TRIAL 7D'
};

function normalizePlan(raw) {
  if (raw == null) return 'PRO';
  if (typeof raw === 'object') raw = raw.key || raw.name || raw.plan || raw.label || '';
  const key = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
  return PLAN_ALIASES[key] || PLAN_ALIASES[String(raw).trim()] || String(raw).trim() || 'PRO';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      return res.status(503).json({ success: false, error: 'PayOS chưa cấu hình (thiếu env)' });
    }

    const body = req.body || {};
    const amount = Number(body.amount);
    const plan = normalizePlan(body.plan != null ? body.plan : body.planName);
    const uid = String(body.driverUid || body.phone || body.uid || '').trim();

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
      return res.status(400).json({ success: false, error: 'So tien sai' });
    }
    if (!uid || uid.length > 120) {
      return res.status(400).json({ success: false, error: 'Thieu driverUid — vui lòng đăng nhập lại' });
    }
    if (plan === 'TRIAL 7D') {
      return res.status(400).json({ success: false, error: 'Goi trial khong dung PayOS' });
    }

    const payos = new PayOS(
      process.env.PAYOS_CLIENT_ID,
      process.env.PAYOS_API_KEY,
      process.env.PAYOS_CHECKSUM_KEY
    );

    const orderCode = Date.now();
    const amountInt = Math.round(amount);

    let pendingOk = false;
    const pending = { uid, plan, amount: amountInt, createdAt: Date.now(), status: 'pending' };
    const put = await fbPut('/payment_pending/' + orderCode, pending);
    pendingOk = put.ok;
    if (!pendingOk) {
      console.warn('[create-payment] pending denied — set FIREBASE_DATABASE_SECRET on Vercel');
    }

    const q = new URLSearchParams({
      status: 'success',
      oc: String(orderCode),
      plan: plan,
      uid: uid
    });
    const returnUrl = APP_URL + '/?' + q.toString();
    const cancelUrl = APP_URL + '/?status=cancel';
    const description = ('PMX' + String(orderCode).slice(-10)).slice(0, 25);

    const link = await payos.createPaymentLink({
      orderCode,
      amount: amountInt,
      description,
      returnUrl,
      cancelUrl
    });

    if (!link || !link.checkoutUrl) {
      return res.status(502).json({ success: false, error: 'PayOS khong tra checkoutUrl' });
    }

    return res.status(200).json({
      success: true,
      checkoutUrl: link.checkoutUrl,
      orderCode,
      plan,
      amount: amountInt,
      pendingOk,
      hasSecret: hasFirebaseSecret()
    });
  } catch (e) {
    console.error('[create-payment]', e);
    return res.status(500).json({ success: false, error: e.message || 'PayOS error' });
  }
}
