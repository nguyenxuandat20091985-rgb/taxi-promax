// Dùng import thay cho require để đồng bộ với export default phía dưới
import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    // 1. Cấu hình CORS (Để GitHub.io gọi sang Vercel không bị chặn)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Xử lý Preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Xử lý tạo thanh toán
    if (req.method === 'POST') {
        try {
            const { amount, description } = req.body;
            
            // Chống lỗi ký tự có dấu (PayOS rất kén tiếng Việt có dấu)
            const cleanDescription = (description || "Thanh toan Taxi ProMax")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[đĐ]/g, "d")
                .substring(0, 25);

            const order = {
                amount: Number(amount) || 10000,
                description: cleanDescription,
                orderCode: Number(String(Date.now()).slice(-6)),
                // Link quay về App của anh sau khi trả tiền xong
                returnUrl: `https://nguyenxuandat20091985-rgb.github.io/taxi-promax/`, 
                cancelUrl: `https://nguyenxuandat20091985-rgb.github.io/taxi-promax/`,
            };

            const paymentLink = await payos.createPaymentLink(order);
            
            // Trả về kết quả cho giao diện
            return res.status(200).json(paymentLink);

        } catch (error) {
            console.error("PayOS Error:", error.message);
            return res.status(500).json({ error: error.message });
        }
    } else {
        return res.status(405).json({ message: "Vui lòng dùng phương thức POST" });
    }
}
