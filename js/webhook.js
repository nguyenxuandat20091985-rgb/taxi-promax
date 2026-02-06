const PayOS = require('@payos/node');

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const webhookData = req.body;
        
        // 1. Kiểm tra tính xác thực của dữ liệu (tránh bị hack nạp khống)
        const verifiedData = payos.verifyPaymentWebhookData(webhookData);

        if (verifiedData.description.includes('NAP')) {
            console.log(`✅ Đã nhận tiền cho đơn hàng: ${verifiedData.orderCode}`);
            // Sau này anh muốn lưu vào Database thì viết thêm code ở đây nhé
        }

        // 2. Trả về 200 để PayOS biết là anh đã nhận được thông tin
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Lỗi Webhook:", error);
        return res.status(400).json({ message: "Webhook lỗi" });
    }
}
