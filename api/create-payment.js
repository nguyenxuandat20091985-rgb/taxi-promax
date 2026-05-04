/**
 * BACKEND XỬ LÝ THANH TOÁN PAYOS - TAXI PROMAX
 * File: /api/create-payment.js
 */

const PayOS = require('@payos/node');

// Khởi tạo PayOS
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

module.exports = async (req, res) => {
    // 1. Cấu hình CORS cho phép gọi từ GitHub.io của anh
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Xử lý yêu cầu Preflight (OPTIONS) - Quan trọng để trình duyệt không chặn lệnh POST
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Chỉ nhận lệnh POST
    if (req.method === 'POST') {
        try {
            // Lấy dữ liệu từ giao diện gửi lên
            let { amount, description } = req.body;

            // Xử lý Description: Không dấu, tối đa 25 ký tự để tránh lỗi PayOS
            let safeDescription = (description || "Nap tien Taxi ProMax")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Khử dấu tiếng Việt
                .replace(/[đĐ]/g, "d")
                .substring(0, 25);

            // Cấu hình đơn hàng theo chuẩn PayOS
            const order = {
                amount: Number(amount) || 10000,
                description: safeDescription,
                orderCode: Number(String(Date.now()).slice(-6)), 
                returnUrl: `https://${req.headers.host}/?status=success`,
                cancelUrl: `https://${req.headers.host}/?status=cancel`,
            };

            // Gọi PayOS tạo link thanh toán
            const paymentLink = await payos.createPaymentLink(order);
            
            // Trả link về cho App của anh Đạt
            return res.status(200).json(paymentLink);

        } catch (error) {
            console.error("Lỗi PayOS:", error.message);
            // Trả về chi tiết lỗi để anh dễ debug
            return res.status(500).json({ 
                error: "Lỗi kết nối PayOS", 
                detail: error.message 
            });
        }
    } else {
        // Trả về lỗi nếu không dùng POST
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ 
            message: `Anh Đạt ơi, API này nhận POST mà anh lại dùng ${req.method} rồi!` 
        });
    }
};
