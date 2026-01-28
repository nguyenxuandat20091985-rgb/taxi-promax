export default async function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body;
    // Kiểm tra nếu thanh toán thành công (mã 00)
    if (data.code === "00") {
      console.log("Thanh toán thành công cho đơn:", data.data.orderCode);
      return res.status(200).json({ success: true });
    }
    return res.status(200).json({ success: false });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}
