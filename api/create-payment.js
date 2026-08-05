/**
 * TAXI PROMAX - PAYOS CREATE PAYMENT
 * Vercel Serverless Function - Tạo payment link PayOS
 * 
 * Endpoint: POST /api/create-payment
 * Input: { amount, planName, driverUid, driverPhone }
 * Output: { success, checkoutUrl, orderCode, qrCode }
 */

import PayOS from '@payos/node';

// Khởi tạo PayOS với environment variables
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { amount, planName, driverUid, driverPhone } = req.body;

        // Validate input
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Amount must be a positive number' 
            });
        }

        if (!planName || typeof planName !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Plan name is required' 
            });
        }

        if (!driverUid || typeof driverUid !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Driver UID is required' 
            });
        }

        // Generate unique order code
        const orderCode = Date.now();

        // Format description: "PROMAX {driverUid} {planName}"
        // Example: "PROMAX DRV_ABC123 PROMAX 90 NGÀY"
        const description = `PROMAX ${driverUid} ${planName}`.substring(0, 25); // PayOS limit 25 chars

        // Base URL for return/cancel URLs
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'https://taxi-promax.vercel.app';

        // Create payment link
        const paymentLink = await payos.createPaymentLink({
            orderCode: orderCode,
            amount: amount,
            description: description,
            returnUrl: `${baseUrl}/?status=success&plan=${encodeURIComponent(planName)}&uid=${driverUid}`,
            cancelUrl: `${baseUrl}/?status=cancel&plan=${encodeURIComponent(planName)}`
        });

        console.log(`[create-payment] ✅ Payment link created:`, {
            orderCode: orderCode,
            amount: amount,
            plan: planName,
            driver: driverUid
        });

        return res.status(200).json({
            success: true,
            checkoutUrl: paymentLink.checkoutUrl,
            orderCode: orderCode,
            qrCode: paymentLink.qrCode,
            description: description
        });

    } catch (error) {
        console.error('[create-payment] ❌ Error:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });

        return res.status(500).json({ 
            success: false, 
            error: 'Không thể tạo payment link: ' + error.message 
        });
    }
}