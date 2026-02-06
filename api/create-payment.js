
const PayOS = require('@payos/node');

// Khai báo PayOS bằng cách lấy mã từ Environment Variables của Vercel
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID, 
  process.env.PAYOS_API_KEY, 
  process.env.PAYOS_CHECKSUM_KEY
);

module.exports = async (req, res) => {
  try {
    const order = {
      amount: 10000,
      description: 'Nạp tiền Taxi ProMax',
      orderCode: Number(String(Date.now()).slice(-6)), // Tạo mã đơn hàng ngắn
      returnUrl: `https://${req.headers.host}/`,
      cancelUrl: `https://${req.headers.host}/`,
    };

    const paymentLink = await payos.createPaymentLink(order);
    // Chuyển hướng khách đến trang thanh toán của PayOS
    res.redirect(303, paymentLink.checkoutUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
