import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        try {
            const { amount, description } = req.body;
            
            const order = {
                amount: Number(amount),
                // Khử dấu tiếng Việt nhanh để PayOS không lỗi
                description: description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25),
                orderCode: Number(Math.floor(Date.now() / 1000)),
                returnUrl: `https://nguyenxuandat20091985-rgb.github.io/taxi-promax/`, 
                cancelUrl: `https://nguyenxuandat20091985-rgb.github.io/taxi-promax/`,
            };

            const paymentLink = await payos.createPaymentLink(order);
            return res.status(200).json(paymentLink);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
