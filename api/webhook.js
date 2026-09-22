/**
 * PAYOS WEBHOOK — gia hạn gói (cần FIREBASE_DATABASE_SECRET để ghi drivers)
 */
import PayOS from '@payos/node';
import { fbGet, fbPut, fbPatch, fbDelete, hasFirebaseSecret } from '../lib/firebase-rest.js';

const PLAN_DAYS = { 'TRIAL 7D': 7, 'LẺ': 1, 'LE': 1, 'PRO': 30, 'PROMAX': 90 };
const AMOUNT_TO_PLAN = { 5000: 'LẺ', 49000: 'PRO', 129000: 'PROMAX' };
const PLAN_ALIASES = {
  'LẺ': 'LẺ', 'LE': 'LẺ', 'PRO': 'PRO', 'PROMAX': 'PROMAX', 'PRO MAX': 'PROMAX',
  'TRIAL 7D': 'TRIAL 7D', 'TRIAL': 'TRIAL 7D'
};

function normalizePlan(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') raw = raw.key || raw.name || raw.plan || '';
  const key = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
  return PLAN_ALIASES[key] || PLAN_ALIASES[String(raw).trim()] || String(raw).trim() || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const data = req.body;
    if (!data || data.description === 'Confirm Webhook' || data.desc === 'Confirm Webhook') {
      return res.status(200).json({
        success: true,
        message: 'Webhook OK',
        hasSecret: hasFirebaseSecret()
      });
    }

    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      return res.status(200).json({ success: false, error: 'PayOS not configured' });
    }

    const payos = new PayOS(
      process.env.PAYOS_CLIENT_ID,
      process.env.PAYOS_API_KEY,
      process.env.PAYOS_CHECKSUM_KEY
    );
    const v = payos.verifyPaymentWebhookData(data);
    if (!v) return res.status(400).json({ success: false, error: 'Sai chữ ký' });
    if (v.code !== '00') {
      return res.status(200).json({ success: true, message: 'Giao dịch không thành công' });
    }

    const orderCode = v.orderCode;

    const existing = await fbGet('/payment_logs/' + orderCode);
    if (existing) {
      return res.status(200).json({ success: true, message: 'Đã xử lý' });
    }

    let uid = null;
    let plan = null;
    const pend = await fbGet('/payment_pending/' + orderCode);
    if (pend && pend.uid) {
      uid = String(pend.uid).trim();
      plan = normalizePlan(pend.plan);
    }

    // Fallback: đoán gói theo số tiền
    if (!plan && v.amount != null) {
      plan = AMOUNT_TO_PLAN[Number(v.amount)] || null;
    }

    const days = plan && PLAN_DAYS[plan] != null ? PLAN_DAYS[plan] : 0;
    if (!uid || !days) {
      console.warn(`[webhook] skip order=${orderCode} plan=${plan} uid=${uid} amount=${v.amount}`);
      return res.status(200).json({
        success: true,
        message: 'Bỏ qua — thiếu uid/plan (cần pending hoặc client returnUrl)',
        hasSecret: hasFirebaseSecret()
      });
    }

    let base = Date.now();
    const d = await fbGet('/drivers/' + uid);
    if (d && d.tp_expiry && parseInt(d.tp_expiry, 10) > base) {
      base = parseInt(d.tp_expiry, 10);
    }

    const newExpiry = base + days * 24 * 60 * 60 * 1000;
    const patch = await fbPatch('/drivers/' + uid, {
      tp_expiry: newExpiry,
      active_plan: plan,
      last_payment: { orderCode, amount: v.amount, plan, at: Date.now() }
    });

    if (!patch.ok) {
      console.error('[webhook] PATCH drivers failed', patch.body);
      return res.status(200).json({
        success: false,
        error: 'Khong ghi duoc drivers — set FIREBASE_DATABASE_SECRET',
        hasSecret: hasFirebaseSecret()
      });
    }

    await fbPut('/payment_logs/' + orderCode, {
      uid,
      plan,
      amount: v.amount,
      expiry: newExpiry,
      at: Date.now()
    });
    await fbDelete('/payment_pending/' + orderCode);

    console.log(`[webhook] OK ${plan} +${days}d uid=${uid}`);
    return res.status(200).json({ success: true, plan, uid, expiry: newExpiry });
  } catch (e) {
    console.error('[webhook]', e.message);
    return res.status(200).json({ success: false, error: e.message });
  }
}
