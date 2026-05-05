const PayOS = require('@payos/node');
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const webhookData = req.body;
    
    // 1. Xác thực dữ liệu từ PayOS (Tránh bị hack nạp khống)
    const verifiedData = payos.verifyPaymentWebhookData(webhookData);

    if (verifiedData) {
        const description = verifiedData.description; // Ví dụ: "0912345678 nap GOI PRO"
        const phone = description.split(' ')[0]; // Tách lấy SĐT
        
        // 2. Logic tự động cộng hạn dùng trên Firebase
        // Anh có thể dùng Fetch hoặc Admin SDK ở đây để update users/{phone}/tp_expiry
        console.log(`Thanh toán thành công cho tài xế: ${phone}`);
        
        return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false });
}
