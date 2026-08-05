/**
 * PAYOS CREATE PAYMENT — Vercel Serverless Function
 * Tạo link thanh toán + lưu ánh xạ orderCode → {uid, plan} vào Firebase
 */
import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { amount, plan, driverUid } = req.body;

        if (!amount || !plan || !driverUid) {
            return res.status(400).json({ success: false, error: 'Thiếu amount/plan/driverUid' });
        }

        const orderCode = Date.now();

        // Lưu ánh xạ để webhook biết nạp cho AI, gói nào (không phụ thuộc description)
        await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: driverUid, plan: plan, amount: amount, createdAt: Date.now() })
        });

        const baseUrl = process.env.BASE_URL || 'https://taxi-promax.vercel.app';

        const paymentLink = await payos.createPaymentLink({
            orderCode: orderCode,
            amount: amount,
            description: 'PROMAX ' + orderCode,
            returnUrl: `${baseUrl}/?status=success&order=${orderCode}`,
            cancelUrl: `${baseUrl}/?status=cancel`
        });

        console.log(`[create-payment] ✅ order=${orderCode} amount=${amount} plan=${plan} uid=${driverUid}`);
        return res.status(200).json({ success: true, checkoutUrl: paymentLink.checkoutUrl, orderCode: orderCode });

    } catch (e) {
        console.error('[create-payment] ❌', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
}