import PayOS from '@payos/node';

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const body = req.body || {};
        const amount = body.amount;
        const plan = body.plan || body.planName || 'PRO';
        const uid = body.driverUid || body.phone || 'KHACH';

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'So tien sai' });
        }

        const payos = new PayOS(
            process.env.PAYOS_CLIENT_ID,
            process.env.PAYOS_API_KEY,
            process.env.PAYOS_CHECKSUM_KEY
        );

        const orderCode = Date.now();

        await fetch(FIREBASE_URL + '/payment_pending/' + orderCode + '.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: uid, plan: plan, amount: amount, createdAt: Date.now() })
        });

        const link = await payos.createPaymentLink({
            orderCode: orderCode,
            amount: amount,
            description: 'PROMAX ' + orderCode,
            returnUrl: 'https://taxi-promax.vercel.app/?status=success',
            cancelUrl: 'https://taxi-promax.vercel.app/?status=cancel'
        });

        return res.status(200).json({ success: true, checkoutUrl: link.checkoutUrl, orderCode: orderCode });

    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}