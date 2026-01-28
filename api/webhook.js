import crypto from 'crypto';

export default async function handler(req, res) {
  // Chỉ cho phép gửi dữ liệu bằng phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Chỉ chấp nhận phương thức POST" });
  }

  // Lấy "Chìa khóa" bí mật từ két sắt Vercel đã cài đặt
  const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY; 

  try {
    const webhookData = req.body;
    const data = webhookData.data;
    const signature = webhookData.signature;

    // Kiểm tra nếu dữ liệu từ PayOS gửi về bị trống
    if (!data || !signature) {
      return res.status(400).json({ message: "Dữ liệu không đầy đủ" });
    }

    // --- BẮT ĐẦU KIỂM TRA TÍNH XÁC THỰC (CHỐNG HACK) ---
    // Sắp xếp dữ liệu theo thứ tự bảng chữ cái để tạo chữ ký đối soát
    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});
    
    const dataString = Object.entries(sortedData)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    // Tạo chữ ký từ dữ liệu nhận được và chìa khóa trong két sắt
    const expectedSignature = crypto
      .createHmac('sha256', CHECKSUM_KEY)
      .update(dataString)
      .digest('hex');

    // So sánh chữ ký của PayOS gửi sang và chữ ký app tự tính toán
    if (signature !== expectedSignature) {
      console.error("CẢNH BÁO: Phát hiện chữ ký không khớp! Có thể là hacker giả mạo.");
      return res.status(400).json({ error: "Chữ ký không hợp lệ" });
    }
    // --- KẾT THÚC KIỂM TRA ---

    // Nếu mã code là "00" nghĩa là tiền đã vào tài khoản BIDV của anh Đạt
    if (webhookData.code === "00") {
      console.log("TIỀN ĐÃ VỀ! Nạp tiền thành công cho đơn hàng: " + data.orderCode);
      
      // Ở đây anh có thể viết thêm lệnh cộng tiền vào database của khách
      return res.status(200).json({ success: true, message: "Thanh toán thành công" });
    }

    return res.status(200).json({ success: false, message: "Thanh toán thất bại hoặc bị hủy" });

  } catch (error) {
    console.error("Lỗi hệ thống Webhook:", error);
    return res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
}
