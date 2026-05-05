const PayOS = require('@payos/node');
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    // Chỉ cho phép phương thức POST
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    try {
        const { amount, description, orderCode, phone } = req.body;
        
        const paymentData = {
            orderCode: orderCode,
            amount: amount,
            description: `${phone} nap ${description}`, // Lưu SĐT vào mô tả để đối soát
            cancelUrl: `https://${req.headers.host}/`,
            returnUrl: `https://${req.headers.host}/?status=success`,
        };

        const checkoutLink = await payos.createPaymentLink(paymentData);
        res.status(200).json({ checkoutUrl: checkoutLink.checkoutUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
