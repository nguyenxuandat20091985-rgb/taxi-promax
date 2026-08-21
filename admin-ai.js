/**
 * Admin Assistant compatibility endpoint.
 * Deterministic and self-contained: no external AI provider or API key.
 */
import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, verifyAdminSession } from '../lib/api-security.js';
import { queryKnowledge, getKnowledgeBaseMeta } from '../lib/knowledge-base.js';

export default async function handler(req, res) {
    applyCors(req, res, 'POST, OPTIONS');
    if (rejectInvalidMethod(req, res)) return;
    if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Admin session required' });
    }

    const body = readJsonBody(req);
    const question = cleanText(body.question || body.query, 1200);
    if (!question) return res.status(400).json({ success: false, error: 'Thiếu câu hỏi' });

    try {
        const matches = queryKnowledge(question, {
            category: cleanText(body.category, 40) || 'all',
            limit: body.limit || 5
        });
        const answer = matches.length
            ? matches.map((result, index) => {
                const item = result.item || result;
                const title = item.title || item.name || `Mục ${index + 1}`;
                const content = item.content || item.text || item.summary || (item.steps ? item.steps.join(' ') : JSON.stringify(item));
                return `${index + 1}. ${title}\n${content}`;
            }).join('\n\n')
            : 'Chưa tìm thấy nội dung phù hợp trong knowledge-base nội bộ.';
        return res.status(200).json({
            success: true,
            autonomous: true,
            answer,
            matches,
            knowledgeBase: getKnowledgeBaseMeta()
        });
    } catch (error) {
        return res.status(500).json({ success: false, autonomous: true, error: 'Knowledge service unavailable' });
    }
}

export const config = { runtime: 'nodejs20.x' };
