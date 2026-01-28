import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // CHỖ QUAN TRỌNG: Anh copy cái mã Checksum Key trên PayOS dán vào giữa dấu ""
  const CHECKSUM_KEY = "MÃ_CHECKSUM_KEY_CỦA_ANH"; 

  try {
    const webhookData = req.body;
    const data = webhookData.data;
    const signature = webhookData.signature;

    if (!data || !signature) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Thuật toán kiểm tra chữ ký để chống nạp tiền giả
    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
      obj[key] = data[key];
      return obj;
    }, {});
    
    const dataString = Object.entries(sortedData)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');
      
    const expectedSignature = crypto
      .createHmac('sha256', CHECKSUM_KEY)
      .update(dataString)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: "Chữ ký không khớp - Cảnh báo giả mạo!" });
    }

    if (webhookData.code === "00") {
      console.log("Xác nhận tiền thật về BIDV cho đơn:", data.orderCode);
      return res.status(200).json({ success: true, message: "OK" });
    }

    return res.status(200).json({ success: false });

  } catch (error) {
    return res.status(500).json({ error: "Lỗi hệ thống" });
  }
}
