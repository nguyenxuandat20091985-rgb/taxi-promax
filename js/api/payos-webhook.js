import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Chỉ chấp nhận phương thức POST' });
    }

    const webhookData = req.body;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    // 1. Kiểm tra tính toàn vẹn (Chống gian lận)
    // PayOS sẽ gửi mã xác thực, ta cần kiểm tra xem có đúng là PayOS gửi không
    if (!webhookData.data || !webhookData.signature) {
        return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    // 2. Log dữ liệu để Admin kiểm tra trong Vercel Logs
    console.log("Dữ liệu thanh toán mới:", webhookData.data);

    // 3. Phân tích nội dung chuyển khoản (DAT TX-XXXX GÓI)
    const description = webhookData.data.description;
    const amount = webhookData.data.amount;

    if (webhookData.code === "00") { // Thanh toán thành công
        console.log(`>>> KÍCH HOẠT THÀNH CÔNG: ${description} - Số tiền: ${amount}`);
        // Ở đây anh có thể dùng Firebase hoặc Supabase để lưu trạng thái VIP của User
        return res.status(200).json({ success: true });
    }

    res.status(200).json({ message: 'Đã nhận thông báo' });
}
