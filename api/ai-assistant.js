import {
  applyCors,
  rejectInvalidMethod,
  readJsonBody,
  cleanText
} from '../lib/api-security.js';
import { generateWithGateway } from '../lib/ai-gateway.js';

const BRAND = 'Trợ lý ProMax AI';

const ROLE_PROMPTS = {
  customer:
    'Bạn hỗ trợ khách hàng Taxi ProMax tại Việt Nam. Tư vấn đặt xe, cước phí, trạng thái thanh toán PayOS và khiếu nại. Không tự cam kết hoàn tiền hoặc thay đổi dữ liệu.',
  driver:
    'Bạn hỗ trợ tài xế Taxi ProMax tại Việt Nam. Tư vấn nhận chuyến, an toàn, GPS, điểm nóng, cước và xử lý sự cố. Không hướng dẫn gian lận định vị.',
  support:
    'Bạn là bộ phận hỗ trợ Taxi ProMax. Trả lời ngắn gọn, lịch sự, có bước xử lý cụ thể và chuyển nhân sự khi cần.'
};

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');

  if (rejectInvalidMethod(req, res)) return;

  try {
    const body = readJsonBody(req);
    const question = cleanText(
      body.question || body.query || body.message,
      1200
    );

    const role = Object.prototype.hasOwnProperty.call(
      ROLE_PROMPTS,
      body.role
    )
      ? body.role
      : 'customer';

    if (!question) {
      return res.status(400).json({
        brand: BRAND,
        success: false,
        error: 'Thiếu câu hỏi'
      });
    }

    const result = await generateWithGateway({
      messages: [
        {
          role: 'system',
          content:
            `${ROLE_PROMPTS[role]} ` +
            'Trả lời bằng tiếng Việt, tối đa 140 từ. ' +
            'Tên thương hiệu là Taxi ProMax.'
        },
        {
          role: 'user',
          content: question
        }
      ]
    });

    return res.status(200).json({
      brand: BRAND,
      success: true,
      externalAi: true,
      role,
      answer: result.text,
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    const status = Number(error?.status) || 502;

    return res.status(status).json({
      brand: BRAND,
      success: false,
      externalAi: true,
      error:
        error?.message ||
        'Trợ lý AI bên ngoài tạm thời không khả dụng',
      code: error?.code || 'EXTERNAL_AI_ERROR'
    });
  }
}
