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

function normalizeEndpoint(value) {
  const configured = text(value, 500);
  if (!configured) return DEFAULT_BASE_URL;
  let url = configured.replace(/\/+$/, '');
  // Accept either the complete OpenAI-compatible URL or a Groq base URL.
  if (/api\.groq\.com/i.test(url) && !/\/chat\/completions$/i.test(url)) {
    if (/\/openai$/i.test(url)) url += '/v1/chat/completions';
    else if (/\/openai\/v1$/i.test(url)) url += '/chat/completions';
    else if (/\/v1$/i.test(url)) url += '/chat/completions';
  }
  return url;
}

async function callProvider(url, apiKey, model, messages, signal) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 300
    }),
    signal
  });
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

  const baseUrl = normalizeEndpoint(process.env.EXTERNAL_AI_BASE_URL);

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
    const messagesToSend = [externalBoundary, ...safeMessages];
    const isGroq = /api\.groq\.com/i.test(baseUrl) || Boolean(process.env.GROQ_API_KEY);
    let requestUrl = baseUrl;
    let requestModel = model;
    let response = await callProvider(requestUrl, apiKey, requestModel, messagesToSend, controller.signal);
    let payload = await response.json().catch(() => ({}));

    // A stale Vercel variable may contain only the provider base path, or a
    // retired model. On Groq-compatible deployments, retry once with the
    // known-good endpoint/model instead of surfacing an opaque HTTP 404.
    if (!response.ok && response.status === 404 && isGroq &&
        (requestUrl !== DEFAULT_BASE_URL || requestModel !== DEFAULT_MODEL)) {
      requestUrl = DEFAULT_BASE_URL;
      requestModel = DEFAULT_MODEL;
      response = await callProvider(requestUrl, apiKey, requestModel, messagesToSend, controller.signal);
      payload = await response.json().catch(() => ({}));
    }

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
      model: text(payload.model, 120) || requestModel
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
