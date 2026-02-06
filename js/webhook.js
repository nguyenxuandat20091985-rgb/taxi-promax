const PayOS = require('@payos/node');
const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    try {
        const { amount, description, orderCode } = req.body;
        const paymentData = {
            orderCode: orderCode,
            amount: amount,
            description: description,
            cancelUrl: `https://${req.headers.host}/`,
            returnUrl: `https://${req.headers.host}/?status=success`,
        };
        const checkoutLink = await payos.createPaymentLink(paymentData);
        res.status(200).json({ checkoutUrl: checkoutLink.checkoutUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
