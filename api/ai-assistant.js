/**
 * 🤖 AI ASSISTANT - Proxy Groq (Miễn phí, cực nhanh, không lỗi quota)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = process.env.GROQ_API_KEY;
    if (!key) return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel' });

    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Thiếu câu hỏi' });

    const systemPrompt = 'Bạn là trợ lý AI thông minh của tài xế Taxi ProMax tại Việt Nam. ' +
        'Trả lời NGẮN GỌN dưới 100 từ, thân thiện, tiếng Việt. Chuyên về: ' +
        'mẹo chạy taxi, khung giờ/điểm nóng nhiều khách, luật giao thông, ' +
        'bảo dưỡng xe xăng & điện, xử lý tình huống với khách hàng.';

    try {
        const r = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + key
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 150
                })
            }
        );
        const d = await r.json();

        if (d.error) {
            return res.status(500).json({ error: 'Lỗi từ Groq: ' + (d.error.message || JSON.stringify(d.error)) });
        }

        const answer = d?.choices?.[0]?.message?.content || 'Xin lỗi, tôi chưa nhận được phản hồi.';
        return res.status(200).json({ success: true, answer: answer });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
