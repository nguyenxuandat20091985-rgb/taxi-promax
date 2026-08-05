/**
 * TAXI PROMAX - PAYOS WEBHOOK HANDLER
 * Vercel Serverless Function - Xử lý webhook từ PayOS
 * 
 * Endpoint: POST /api/webhook
 * Input: PayOS webhook data
 * Output: { success, message }
 */

import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

const FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";

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
        const webhookData = req.body;

        // 1. Handle test webhook from PayOS
        if (!webhookData || 
            webhookData.desc === "Confirm Webhook" || 
            webhookData.description === "Confirm Webhook") {
            console.log('[webhook] ✅ Test webhook received - configuration successful');
            return res.status(200).json({ 
                success: true, 
                message: 'Webhook configured successfully' 
            });
        }

        // 2. Verify webhook signature
        const verifiedData = payos.verifyPaymentWebhookData(webhookData);
        
        if (!verifiedData) {
            console.error('[webhook] ❌ Invalid webhook signature');
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid webhook signature' 
            });
        }

        // 3. Check if payment was successful
        if (verifiedData.code !== '00') {
            console.log(`[webhook] Payment not successful: code=${verifiedData.code}, desc=${verifiedData.desc}`);
            return res.status(200).json({ 
                success: true, 
                message: 'Payment not successful, no action taken' 
            });
        }

        const orderCode = verifiedData.orderCode;
        const amount = verifiedData.amount;
        const description = verifiedData.description || '';

        console.log(`[webhook] Processing payment: orderCode=${orderCode}, amount=${amount}, desc="${description}"`);

        // 4. Prevent duplicate processing
        const paymentLogUrl = `${FIREBASE_URL}/payment_logs/${orderCode}.json`;
        
        try {
            const existingLog = await fetch(paymentLogUrl).then(r => r.json());
            
            if (existingLog) {
                console.log(`[webhook] ⚠️ Duplicate payment detected: orderCode=${orderCode} already processed`);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Payment already processed' 
                });
            }
        } catch (err) {
            // Log doesn't exist yet, continue processing
        }

        // 5. Parse description: "PROMAX {driverUid} {planName}"
        const parts = description.trim().split(' ');
        
        if (parts[0] !== 'PROMAX' || parts.length < 3) {
            console.warn(`[webhook] ❌ Invalid description format: "${description}"`);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid description format' 
            });
        }

        const driverUid = parts[1]; // VD: DRV_ABC123
        const planName = parts.slice(2).join(' ').toUpperCase();

        console.log(`[webhook] Driver: ${driverUid}, Plan: ${planName}`);

        // 6. Calculate days based on plan name
        let days = 0;
        if (planName.includes("LẺ") || planName.includes("LE")) {
            days = 1;
        } else if (planName.includes("PROMAX") || planName.includes("PRO MAX")) {
            days = 90;
        } else if (planName.includes("PRO")) {
            days = 30;
        } else if (planName.includes("THỬ") || planName.includes("TRIAL")) {
            days = 7;
        }

        if (days === 0) {
            console.warn(`[webhook] ⚠️ Unknown plan type: "${planName}"`);
            return res.status(400).json({ 
                success: false, 
                error: 'Unknown plan type' 
            });
        }

        // 7. Update correct Firebase node: drivers/{uid}
        const driverUrl = `${FIREBASE_URL}/drivers/${driverUid}.json`;

        // 8. Get current expiry to accumulate
        let currentExpiry = Date.now();
        try {
            const driverData = await fetch(driverUrl).then(r => r.json());
            
            if (driverData?.tp_expiry && parseInt(driverData.tp_expiry) > Date.now()) {
                currentExpiry = parseInt(driverData.tp_expiry);
                console.log(`[webhook] Accumulating from existing expiry: ${new Date(currentExpiry).toLocaleString('vi-VN')}`);
            }
        } catch (err) {
            console.warn('[webhook] Could not fetch driver data, using current time');
        }

        // 9. Calculate new expiry
        const now = Date.now();
        const startTime = Math.max(currentExpiry, now);
        const newExpiry = startTime + (days * 24 * 60 * 60 * 1000);

        // 10. Update Firebase - CORRECT NODE
        const updateResponse = await fetch(driverUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tp_expiry: newExpiry,
                active_plan: planName,
                last_payment: {
                    amount: amount,
                    orderCode: orderCode,
                    timestamp: now,
                    plan: planName,
                    description: description
                }
            })
        });

        if (!updateResponse.ok) {
            throw new Error(`Firebase update failed: ${updateResponse.status}`);
        }

        // 11. Log payment to prevent duplicates
        await fetch(paymentLogUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                driverUid: driverUid,
                plan: planName,
                amount: amount,
                orderCode: orderCode,
                timestamp: now,
                expiry: newExpiry,
                processed: true
            })
        });

        console.log(`[webhook] ✅ Successfully activated ${planName} (+${days} days) for ${driverUid}`);
        console.log(`[webhook] New expiry: ${new Date(newExpiry).toLocaleString('vi-VN')}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Payment processed successfully',
            data: {
                driverUid: driverUid,
                plan: planName,
                days: days,
                expiry: newExpiry
            }
        });

    } catch (error) {
        console.error('[webhook] ❌ Error processing webhook:', {
            message: error.message,
            stack: error.stack
        });
        
        // Return 200 to prevent PayOS from retrying
        return res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
}