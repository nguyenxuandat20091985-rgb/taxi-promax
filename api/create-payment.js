/**
 * api/create-payment.js — Tạo link thanh toán PayOS
 * Body: { amount, plan|planName, driverUid|phone }
 * Plan key chuẩn: LẺ | PRO | PROMAX | TRIAL 7D
 */
import PayOS from '@payos/node';

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

/** Map mọi biến thể tên gói về key chuẩn (khớp webhook + index.html) */
const PLAN_ALIASES = {
  'LẺ': 'LẺ',
  'LE': 'LẺ',
  'CHUYEN LE': 'LẺ',
  'CHUYẾN LẺ': 'LẺ',
  'PRO': 'PRO',
  'GÓI PRO': 'PRO',
  'GOI PRO': 'PRO',
  'PROMAX': 'PROMAX',
  'PRO MAX': 'PROMAX',
  'PRO-MAX': 'PROMAX',
  'TRIAL 7D': 'TRIAL 7D',
  'TRIAL': 'TRIAL 7D',
  'TRẢI NGHIỆM': 'TRIAL 7D'
};

function normalizePlan(raw) {
  if (raw == null) return 'PRO';
  if (typeof raw === 'object') {
    raw = raw.key || raw.name || raw.plan || raw.label || '';
  }
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
      return res.status(400).json({ success: false, error: 'Thieu driverUid' });
    }
    if (plan === 'TRIAL 7D') {
      return res.status(400).json({ success: false, error: 'Goi trial khong dung PayOS' });
    }

    const payos = new PayOS(
      process.env.PAYOS_CLIENT_ID,
      process.env.PAYOS_API_KEY,
      process.env.PAYOS_CHECKSUM_KEY
    );

    // PayOS orderCode: số nguyên dương, dùng Date.now() ổn định
    const orderCode = Date.now();
    const amountInt = Math.round(amount);

    const pending = {
      uid,
      plan,
      amount: amountInt,
      createdAt: Date.now(),
      status: 'pending'
    };

    const pendRes = await fetch(FIREBASE_URL + '/payment_pending/' + orderCode + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending)
    });
    if (!pendRes.ok) {
      return res.status(502).json({ success: false, error: 'Khong luu duoc payment_pending' });
    }

    // description ≤ 25 ký tự (giới hạn PayOS) — uid/plan lấy từ payment_pending
    const description = ('PMX ' + String(orderCode)).slice(0, 25);

    const link = await payos.createPaymentLink({
      orderCode,
      amount: amountInt,
      description,
      returnUrl: 'https://taxi-promax.vercel.app/?status=success',
      cancelUrl: 'https://taxi-promax.vercel.app/?status=cancel'
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: link.checkoutUrl,
      orderCode,
      plan,
      amount: amountInt
    });
  } catch (e) {
    console.error('[create-payment]', e);
    return res.status(500).json({ success: false, error: e.message || 'PayOS error' });
  }
}
