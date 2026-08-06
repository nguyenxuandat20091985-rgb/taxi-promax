/**
 * 🤖 AI ASSISTANT - Proxy Gemini (key nằm ở server, không lộ ra app)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel' });

    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Thiếu câu hỏi' });

    const system = 'Bạn là trợ lý AI của tài xế Taxi ProMax tại Việt Nam. ' +
        'Trả lời NGẮN GỌN dưới 100 từ, thân thiện, tiếng Việt. Chuyên về: ' +
        'mẹo chạy taxi, khung giờ/điểm nóng nhiều khách, luật giao thông, ' +
        'bảo dưỡng xe xăng & điện, xử lý tình huống với khách hàng.';

    try {
        const r = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: system + '\n\nCâu hỏi: ' + question }] }]
                })
            }
        );
        const d = await r.json();

        // Nếu Google trả về lỗi, hiện nguyên văn lỗi để dễ kiểm tra
        if (d.error) {
            return res.status(500).json({ error: 'Lỗi từ Google: ' + d.error.message });
        }

        const answer = d?.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi chưa nhận được phản hồi từ AI.';
        return res.status(200).json({ success: true, answer: answer });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
