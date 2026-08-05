/**
 * PAYOS WEBHOOK — Vercel Serverless Function
 * FIX: cập nhật ĐÚNG node drivers/{uid}/tp_expiry (index.html đọc node này)
 * Chống nạp trùng bằng payment_logs/{orderCode}
 */
import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

// Khớp đúng 4 gói trong index.html
const PLAN_DAYS = { 'TRIAL 7D': 7, 'LẺ': 1, 'PRO': 30, 'PROMAX': 90 };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    try {
        const data = req.body;

        // Test webhook cấu hình
        if (!data || data.description === 'Confirm Webhook' || data.desc === 'Confirm Webhook') {
            return res.status(200).json({ success: true, message: 'Webhook OK' });
        }

        // 1. Xác thực chữ ký
        const v = payos.verifyPaymentWebhookData(data);
        if (!v) return res.status(400).json({ success: false, error: 'Sai chữ ký' });
        if (v.code !== '00') return res.status(200).json({ success: true, message: 'Giao dịch không thành công' });

        const orderCode = v.orderCode;

        // 2. Chống nạp trùng
        const logRes = await fetch(`${FIREBASE_URL}/payment_logs/${orderCode}.json`);
        if (logRes.ok && (await logRes.json())) {
            console.log(`[webhook] ⚠️ Trùng: ${orderCode} đã xử lý`);
            return res.status(200).json({ success: true, message: 'Đã xử lý' });
        }

        // 3. Lấy uid + plan từ ánh xạ (ưu tiên) hoặc description (dự phòng)
        let uid = null, plan = null;
        const pend = await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`).then(r => r.json()).catch(() => null);
        if (pend && pend.uid && pend.plan) {
            uid = pend.uid; plan = pend.plan;
        } else {
            const parts = (v.description || '').trim().split(' ');
            if (parts[0] === 'PROMAX' && parts.length >= 3) { uid = parts[1]; plan = parts.slice(2).join(' '); }
        }

        const days = PLAN_DAYS[plan] || 0;
        if (!uid || !days) {
            console.warn(`[webhook] ❌ Không xác định uid/plan: "${v.description}"`);
            return res.status(200).json({ success: true, message: 'Bỏ qua' });
        }

        // 4. Cộng dồn hạn từ drivers/{uid}
        let base = Date.now();
        try {
            const d = await fetch(`${FIREBASE_URL}/drivers/${uid}.json`).then(r => r.json());
            if (d && d.tp_expiry && parseInt(d.tp_expiry) > base) base = parseInt(d.tp_expiry);
        } catch (e) {}

        const newExpiry = base + days * 24 * 60 * 60 * 1000;

        // 5. Cập nhật ĐÚNG node mà index.html đọc
        await fetch(`${FIREBASE_URL}/drivers/${uid}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tp_expiry: newExpiry,
                active_plan: plan,
                last_payment: { orderCode: orderCode, amount: v.amount, plan: plan, at: Date.now() }
            })
        });

        // 6. Ghi log chống trùng + xóa pending
        await fetch(`${FIREBASE_URL}/payment_logs/${orderCode}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, plan, amount: v.amount, expiry: newExpiry, at: Date.now() })
        });
        await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`, { method: 'DELETE' });

        console.log(`[webhook] ✅ ${plan} +${days} ngày cho ${uid} → hạn ${new Date(newExpiry).toLocaleString('vi-VN')}`);
        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('[webhook] ❌', e.message);
        return res.status(200).json({ success: false, error: e.message });
    }
}