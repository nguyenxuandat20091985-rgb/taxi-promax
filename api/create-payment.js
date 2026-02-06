const PayOS = require('@payos/node');

// Khởi tạo PayOS với các biến môi trường anh đã cài trên Vercel
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

module.exports = async (req, res) => {
    // 1. Cấu hình cho phép giao diện web gọi vào API này
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Xử lý yêu cầu kiểm tra kết nối từ trình duyệt
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Chỉ chấp nhận phương thức POST (như file payment.js của anh đang dùng)
    if (req.method === 'POST') {
        try {
            // Lấy dữ liệu gửi từ file payment.js
            const { amount, description } = req.body;

            // Tạo đơn hàng
            const order = {
                amount: amount || 10000,
                description: description || 'Nap tien Taxi ProMax',
                orderCode: Number(String(Date.now()).slice(-6)), // Tạo mã số ngẫu nhiên
                returnUrl: `https://${req.headers.host}/`,
                cancelUrl: `https://${req.headers.host}/`,
            };

            // Gọi sang PayOS để lấy link thanh toán
            const paymentLink = await payos.createPaymentLink(order);
            
            // Gửi kết quả về cho giao diện để nó tự chuyển hướng sang trang QR
            return res.status(200).json(paymentLink);

        } catch (error) {
            console.error("Lỗi PayOS:", error.message);
            return res.status(500).json({ error: error.message });
        }
    } else {
        // Nếu không phải POST thì báo lỗi
        res.status(405).json({ message: 'Anh Đạt ơi, API này chỉ nhận lệnh POST thôi!' });
    }
};
