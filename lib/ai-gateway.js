const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const REQUEST_TIMEOUT_MS = 15000;

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function gatewayError(code, message, status = 502) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export async function generateWithGateway({ messages = [] } = {}) {
  const apiKey = text(process.env.EXTERNAL_AI_API_KEY || process.env.GROQ_API_KEY, 500);

  if (!apiKey) {
    throw gatewayError(
      'EXTERNAL_AI_NOT_CONFIGURED',
      'AI bên ngoài chưa được cấu hình API key',
      503
    );
  }

  const baseUrl = text(
    process.env.EXTERNAL_AI_BASE_URL || DEFAULT_BASE_URL,
    500
  );

  const model = text(
    process.env.EXTERNAL_AI_MODEL || process.env.GROQ_MODEL || DEFAULT_MODEL,
    120
  );

  const safeMessages = messages
    .filter(
      (item) =>
        item &&
        (item.role === 'system' || item.role === 'user')
    )
    .map((item) => ({
      role: item.role,
      content: text(
        item.content,
        item.role === 'system' ? 4000 : 1200
      )
    }))
    .filter((item) => item.content);

  if (!safeMessages.some((item) => item.role === 'user')) {
    throw gatewayError(
      'EXTERNAL_AI_EMPTY_PROMPT',
      'Thiếu câu hỏi cho AI bên ngoài',
      400
    );
  }

  const externalBoundary = {
    role: 'system',
    content:
      'Bạn là AI bên ngoài, độc lập hoàn toàn với AI hệ thống Taxi ProMax. ' +
      'Bạn chỉ giải đáp câu hỏi mở rộng và kiến thức chung. ' +
      'Không được giả nhận là AI hệ thống, không truy cập dữ liệu nội bộ, ' +
      'không sửa chuyến đi, không duyệt thanh toán, không khóa tài khoản ' +
      'và không thực hiện thao tác quản trị. ' +
      'Nếu câu hỏi cần dữ liệu nội bộ, hãy nói người dùng liên hệ AI hệ thống hoặc quản trị viên.'
  };

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [externalBoundary, ...safeMessages],
        temperature: 0.3,
        max_tokens: 300
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw gatewayError(
        'EXTERNAL_AI_PROVIDER_ERROR',
        `AI bên ngoài trả về HTTP ${response.status}`,
        502
      );
    }

    const result = text(
      payload?.choices?.[0]?.message?.content,
      4000
    );

    if (!result) {
      throw gatewayError(
        'EXTERNAL_AI_EMPTY_RESPONSE',
        'AI bên ngoài không có nội dung trả lời',
        502
      );
    }

    return {
      text: result,
      provider: 'external-groq-compatible',
      model: text(payload.model, 120) || model
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw gatewayError(
        'EXTERNAL_AI_TIMEOUT',
        'AI bên ngoài phản hồi quá thời gian',
        504
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}
