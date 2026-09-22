/**
 * PAYOS WEBHOOK — gia hạn gói tài xế
 * - Xác thực chữ ký PayOS
 * - Chống nạp trùng (payment_logs/{orderCode})
 * - Ưu tiên uid/plan từ payment_pending
 * - Cập nhật drivers/{uid}.tp_expiry + active_plan
 */
import PayOS from '@payos/node';

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

// Khớp index.html + js/driver/16-wallet-unify.js
const PLAN_DAYS = {
  'TRIAL 7D': 7,
  'LẺ': 1,
  'LE': 1,
  'PRO': 30,
  'PROMAX': 90
};

const PLAN_ALIASES = {
  'LẺ': 'LẺ',
  'LE': 'LẺ',
  'CHUYEN LE': 'LẺ',
  'PRO': 'PRO',
  'GÓI PRO': 'PRO',
  'GOI PRO': 'PRO',
  'PROMAX': 'PROMAX',
  'PRO MAX': 'PROMAX',
  'PRO-MAX': 'PROMAX',
  'TRIAL 7D': 'TRIAL 7D',
  'TRIAL': 'TRIAL 7D'
};

function normalizePlan(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') raw = raw.key || raw.name || raw.plan || '';
  const key = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
  return PLAN_ALIASES[key] || PLAN_ALIASES[String(raw).trim()] || String(raw).trim() || null;
}

function getPayOS() {
  return new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  try {
    const data = req.body;

    // PayOS test / confirm webhook
    if (!data || data.description === 'Confirm Webhook' || data.desc === 'Confirm Webhook') {
      return res.status(200).json({ success: true, message: 'Webhook OK' });
    }

    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      console.error('[webhook] PayOS env missing');
      return res.status(200).json({ success: false, error: 'PayOS not configured' });
    }

    const payos = getPayOS();
    const v = payos.verifyPaymentWebhookData(data);
    if (!v) return res.status(400).json({ success: false, error: 'Sai chữ ký' });
    if (v.code !== '00') {
      return res.status(200).json({ success: true, message: 'Giao dịch không thành công' });
    }

    const orderCode = v.orderCode;

    // Chống nạp trùng
    const logRes = await fetch(`${FIREBASE_URL}/payment_logs/${orderCode}.json`);
    if (logRes.ok) {
      const existing = await logRes.json();
      if (existing) {
        console.log(`[webhook] Trùng orderCode=${orderCode}`);
        return res.status(200).json({ success: true, message: 'Đã xử lý' });
      }
    }

    let uid = null;
    let plan = null;
    let expectedAmount = null;

    const pend = await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`)
      .then(r => r.json())
      .catch(() => null);

    if (pend && pend.uid) {
      uid = String(pend.uid).trim();
      plan = normalizePlan(pend.plan);
      expectedAmount = pend.amount != null ? Number(pend.amount) : null;
    } else {
      // Fallback cũ: description "PROMAX uid plan..."
      const parts = String(v.description || '').trim().split(/\s+/);
      if (parts[0] === 'PROMAX' && parts.length >= 3) {
        uid = parts[1];
        plan = normalizePlan(parts.slice(2).join(' '));
      }
    }

    const days = plan && PLAN_DAYS[plan] != null ? PLAN_DAYS[plan] : 0;
    if (!uid || !days) {
      console.warn(`[webhook] Không xác định uid/plan order=${orderCode} plan=${plan} uid=${uid}`);
      return res.status(200).json({ success: true, message: 'Bỏ qua' });
    }

    // Cảnh báo nếu số tiền lệch (không chặn — tránh fail do làm tròn)
    if (expectedAmount != null && Number(v.amount) !== expectedAmount) {
      console.warn(`[webhook] Amount mismatch order=${orderCode} expected=${expectedAmount} got=${v.amount}`);
    }

    let base = Date.now();
    try {
      const d = await fetch(`${FIREBASE_URL}/drivers/${encodeURIComponent(uid)}.json`).then(r => r.json());
      if (d && d.tp_expiry && parseInt(d.tp_expiry, 10) > base) {
        base = parseInt(d.tp_expiry, 10);
      }
    } catch (e) {
      console.warn('[webhook] read driver failed', e.message);
    }

    const newExpiry = base + days * 24 * 60 * 60 * 1000;

    const patchRes = await fetch(`${FIREBASE_URL}/drivers/${encodeURIComponent(uid)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tp_expiry: newExpiry,
        active_plan: plan,
        last_payment: {
          orderCode,
          amount: v.amount,
          plan,
          at: Date.now()
        }
      })
    });

    if (!patchRes.ok) {
      console.error('[webhook] PATCH driver failed', await patchRes.text());
      return res.status(200).json({ success: false, error: 'Update driver failed' });
    }

    await fetch(`${FIREBASE_URL}/payment_logs/${orderCode}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        plan,
        amount: v.amount,
        expiry: newExpiry,
        at: Date.now()
      })
    });

    await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`, { method: 'DELETE' });

    console.log(`[webhook] OK ${plan} +${days}d uid=${uid} expiry=${new Date(newExpiry).toISOString()}`);
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[webhook]', e.message);
    // Trả 200 để PayOS không retry vô hạn khi lỗi logic nội bộ
    return res.status(200).json({ success: false, error: e.message });
  }
}
