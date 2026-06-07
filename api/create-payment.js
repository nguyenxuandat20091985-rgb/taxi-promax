/**
 * TAXI PROMAX - CREATE PAYMENT (Vercel Serverless Function)
 * FIX v2.0:
 * [FIX-1] returnUrl/cancelUrl thông minh — phân biệt app tài xế vs khách hàng
 * [FIX-2] Thêm success:true trong response — đồng bộ với payment.js frontend
 * Giữ nguyên: CORS, PayOS logic, description format, orderCode auto-gen
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

import PayOS from '@payos/node';

// Dùng Environment Variables — KHÔNG hardcode (constitution §9)
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {

    // ===== CORS =====
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Xử lý preflight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Chỉ nhận POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { amount, description, orderCode, phone, planName, returnPage } = req.body;

        // Validate amount
        const parsedAmount = parseInt(amount);
        if (!parsedAmount || parsedAmount < 1000) {
            return res.status(400).json({ success: false, error: 'Số tiền không hợp lệ' });
        }

        // Auto-generate orderCode nếu thiếu
        const finalOrderCode = orderCode
            ? parseInt(orderCode)
            : Math.floor(Date.now() / 1000);

        // Format description chuẩn PayOS: "PROMAX {TX_ID} {PLAN}"
        // Webhook.js sẽ parse theo format này để kích hoạt gói
        const safePhone = (phone || 'TAIXE').replace(/\s/g, '').toUpperCase();
        const safePlan  = (planName || description || 'NAPGOI').replace(/\s/g, '').toUpperCase();
        const fullDesc  = `PROMAX ${safePhone} ${safePlan}`;

        // [FIX-1] returnUrl thông minh — phân biệt trang gọi
        // returnPage: 'driver' (mặc định) hoặc 'customer'
        const host      = req.headers.host;
        const basePage  = (returnPage === 'customer') ? 'khachhang.html' : 'index.html';
        const returnUrl = `https://${host}/${basePage}?status=success&plan=${encodeURIComponent(safePlan)}`;
        const cancelUrl = `https://${host}/${basePage}?status=cancel`;

        // Cấu hình PayOS
        const paymentData = {
            orderCode:   finalOrderCode,
            amount:      parsedAmount,
            description: fullDesc.substring(0, 25), // PayOS giới hạn 25 ký tự
            cancelUrl:   cancelUrl,
            returnUrl:   returnUrl
        };

        console.log(`[create-payment] Tạo đơn: ${JSON.stringify(paymentData)}`);

        const checkoutLink = await payos.createPaymentLink(paymentData);

        // [FIX-2] Thêm success:true — đồng bộ với payment.js frontend check data.success
        return res.status(200).json({
            success:     true,
            checkoutUrl: checkoutLink.checkoutUrl,
            orderCode:   finalOrderCode
        });

    } catch (error) {
        console.error('[create-payment] Lỗi PayOS:', error.message);
        return res.status(500).json({
            success: false,
            error:   error.message
        });
    }
}
