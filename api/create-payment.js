/**
 * 💳 PAYOS CREATE PAYMENT — Vercel Serverless Function
 */
import PayOS from '@payos/node';

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
        return res.status(500).json({ success: false, error: 'Thiếu env PAYOS trên Vercel' });
    }

    try {
        const { amount, plan, planName, driverUid, phone } = req.body || {};
        const planFinal = plan || planName;
        const uid = driverUid || phone;

        if (!amount || !planFinal || !uid) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin' });
        }

        const payos = new PayOS(
            process.env.PAYOS_CLIENT_ID,
            process.env.PAYOS_API_KEY,
            process.env.PAYOS_CHECKSUM_KEY
        );

        const orderCode = Date.now();

        // Lưu ánh xạ để webhook biết nạp gói cho ai
        await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: uid, plan: planFinal, amount: amount, createdAt: Date.now() })
        });

        const baseUrl = 'https://taxi-promax.vercel.app';
        const link = await payos.createPaymentLink({
            orderCode: orderCode,
            amount: amount,
            description: 'PROMAX ' + orderCode,
            returnUrl: baseUrl + '/?status=success&order=' + orderCode,
            cancelUrl: baseUrl + '/?status=cancel'
        });

        return res.status(200).json({ success: true, checkoutUrl: link.checkoutUrl, orderCode: orderCode });

    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}