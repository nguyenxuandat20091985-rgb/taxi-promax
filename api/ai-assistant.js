/**
 * 🤖 ADMIN AI ASSISTANT - Proxy Groq (context-aware)
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = process.env.GROQ_API_KEY;
    if (!key) return res.status(500).json({ error: 'Chưa cấu hình GROQ_API_KEY trên Vercel' });

    const { question, context } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Thiếu câu hỏi' });

    const systemPrompt = `Bạn là trợ lý AI của ADMIN quản trị hệ thống Taxi ProMax tại Việt Nam.
Nhiệm vụ: hỗ trợ admin ra quyết định nhanh, phân tích dữ liệu, cảnh báo bất thường.

CONTEXT HIỆN TẠI (dữ liệu thật từ Firebase):
${JSON.stringify(context || {}, null, 2)}

QUY TẮC TRẢ LỜI:
- Tiếng Việt, ngắn gọn dưới 150 từ
- Dùng số liệu từ CONTEXT khi có, KHÔNG bịa số liệu
- Gợi ý hành động cụ thể nếu phù hợp`;

    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
                max_tokens: 200,
                temperature: 0.3
            })
        });
        const d = await r.json();
        if (d.error) return res.status(500).json({ error: 'Lỗi Groq: ' + (d.error.message || '') });
        const answer = d?.choices?.[0]?.message?.content || 'Không nhận được phản hồi.';
        return res.status(200).json({ success: true, answer });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}