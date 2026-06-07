/**
 * TAXI PROMAX - WEBHOOK PAYOS (Vercel Serverless Function)
 * FIX v2.0: Đúng Firebase URL taxipromax-new Asia Southeast
 * Giữ nguyên: xác thực chữ ký, cộng dồn ngày, logic gói cước
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

import PayOS from '@payos/node';

// Dùng Environment Variables — KHÔNG hardcode (constitution §9)
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
);

// [FIX] Đúng Firebase URL — taxipromax-new Asia Southeast
const FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";

export default async function handler(req, res) {

    // Chỉ nhận POST từ PayOS
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookData = req.body;

        // Bảo vệ 1: Bỏ qua nếu là gói test cấu hình kết nối PayOS
        if (
            !webhookData ||
            webhookData.desc        === "Confirm Webhook" ||
            webhookData.description === "Confirm Webhook"
        ) {
            return res.status(200).json({ success: true, message: "Cấu hình webhook thành công!" });
        }

        // Bảo vệ 2: Xác thực chữ ký số — tránh giả mạo webhook
        const verifiedData = payos.verifyPaymentWebhookData(webhookData);

        if (verifiedData) {
            // Định dạng description chuẩn: "PROMAX {TX_ID} {PLAN}"
            // Ví dụ: "PROMAX PRO-ABC12 PRO" hoặc "PROMAX PRO-XYZ99 PRO MAX"
            const description = verifiedData.description || '';
            const parts       = description.trim().split(' ');
            const driverId    = parts[1] || 'TAIXE';
            const planName    = parts.slice(2).join(' ').toUpperCase();

            console.log(`[webhook] Nhận thanh toán: driverId=${driverId} plan=${planName}`);

            // Tính số ngày theo tên gói
            let days = 0;
            if      (planName.includes("LẺ"))                                   days = 1;
            else if (planName.includes("PROMAX") || planName.includes("PRO MAX")) days = 90;
            else if (planName.includes("PRO"))                                  days = 30;
            else if (planName.includes("THỬ") || planName.includes("TRIAL"))   days = 7;

            if (days > 0) {
                // [FIX] Đúng node /tai_xe_online/{driverId} — đồng bộ với index.html
                const dbUrl = `${FIREBASE_URL}/tai_xe_online/${driverId}.json`;

                // Lấy hạn dùng hiện tại để cộng dồn
                let currentExpiry = Date.now();
                try {
                    const fbRes    = await fetch(dbUrl);
                    const fbData   = fbRes.ok ? await fbRes.json() : null;
                    if (fbData && fbData.tp_expiry && parseInt(fbData.tp_expiry) > Date.now()) {
                        currentExpiry = parseInt(fbData.tp_expiry); // Còn hạn → cộng dồn
                    }
                } catch (fetchErr) {
                    console.warn('[webhook] Không lấy được dữ liệu tài xế cũ, dùng Date.now()');
                }

                const now       = Date.now();
                const startTime = Math.max(currentExpiry, now);
                const newExpiry = startTime + (days * 24 * 60 * 60 * 1000);

                // Cập nhật gói lên Firebase đúng node
                await fetch(dbUrl, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tp_expiry:         newExpiry,
                        active_plan_name:  planName,
                        last_payment_time: now,
                        last_payment_plan: planName
                    })
                });

                console.log(`[webhook] ✅ Kích hoạt ${planName} (+${days} ngày) cho ${driverId}. Hạn đến: ${new Date(newExpiry).toLocaleString('vi-VN')}`);

            } else {
                console.warn(`[webhook] Không xác định được gói từ description: "${description}"`);
            }

            // Trả 200 để PayOS không gửi lại
            return res.status(200).json({ success: true });
        }

        // Chữ ký sai
        return res.status(400).json({ success: false, error: "Xác thực chữ ký thất bại" });

    } catch (error) {
        console.error("[webhook] Lỗi xử lý:", error.message);
        // Trả 200 để PayOS không spam retry — lỗi logic nội bộ không phải lỗi PayOS
        return res.status(200).json({ success: false, error: error.message });
    }
}
