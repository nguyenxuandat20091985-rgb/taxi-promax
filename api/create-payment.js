import PayOS from '@payos/node';

// Khởi tạo PayOS đồng bộ chuẩn cú pháp ES Modules (import)
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    // Cấu hình CORS để cho phép App Frontend gọi API mượt mà không bị chặn
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Xử lý phương thức OPTIONS (Preflight request) bắt buộc của cấu hình CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Chỉ cho phép phương thức POST để bảo mật dữ liệu nạp tiền
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { amount, description, orderCode, phone } = req.body;
        
        // Khóa bảo vệ: Tự động sinh mã đơn hàng nếu frontend truyền lên bị thiếu/trống
        const finalOrderCode = orderCode ? parseInt(orderCode) : Math.floor(Date.now() / 1000);

        // Format nội dung chuyển khoản: Không dấu, viết liền, giới hạn dưới 25 ký tự theo luật PayOS
        const safePhone = (phone || 'TAIXE').replace(/\s/g, '');
        const safeDesc = (description || 'NAPGOI').replace(/\s/g, '').toUpperCase();
        const fullDescription = `PROMAX ${safePhone} ${safeDesc}`;
        
        // Cấu hình gói dữ liệu thanh toán chuẩn hóa
        const paymentData = {
            orderCode: finalOrderCode,
            amount: parseInt(amount), // Ép kiểu số nguyên bắt buộc cho PayOS
            description: fullDescription.substring(0, 25), // Cắt chuỗi an toàn bảo vệ hệ thống
            cancelUrl: `https://${req.headers.host}/index.html?status=cancel`,
            returnUrl: `https://${req.headers.host}/index.html?status=success`,
        };

        // Gọi PayOS sinh cổng thanh toán trực tuyến
        const checkoutLink = await payos.createPaymentLink(paymentData);
        
        // Trả link thành công về cho thiết bị tài xế nổ đơn
        return res.status(200).json({ checkoutUrl: checkoutLink.checkoutUrl });

    } catch (error) {
        console.error("Lỗi PayOS Serverless:", error);
        return res.status(500).json({ error: error.message });
    }
}
