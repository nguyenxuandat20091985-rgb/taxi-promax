const PayOS = require('@payos/node');

// Khai báo PayOS
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

module.exports = async (req, res) => {
    // Cho phép gọi API từ giao diện web
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Lấy dữ liệu từ file payment.js gửi lên
        const { amount, description, orderCode } = req.body;

        const order = {
            amount: amount || 10000,
            description: description || 'Nap tien Taxi ProMax',
            orderCode: orderCode || Number(String(Date.now()).slice(-6)),
            returnUrl: `https://${req.headers.host}/`,
            cancelUrl: `https://${req.headers.host}/`,
        };

        const paymentLink = await payos.createPaymentLink(order);
        
        // Trả về link cho file payment.js nhận
        res.status(200).json(paymentLink);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
