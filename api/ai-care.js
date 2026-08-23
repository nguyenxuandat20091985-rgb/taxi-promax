/**
 * =============================================================================
 * TAXI PROMAX — AI CHĂM SÓC KHÁCH HÀNG (3 APP → BÁO ADMIN)
 * =============================================================================
 * Endpoint: POST /api/ai-care
 *
 * Dùng cho:
 *   - App tài xế   (channel: driver)
 *   - App khách    (channel: customer)
 *   - App xe ghép  (channel: xeghep)
 *
 * Body:
 * {
 *   "channel": "driver" | "customer" | "xeghep",
 *   "userId": "uid",
 *   "userName": "...",
 *   "phone": "...",
 *   "message": "câu hỏi",
 *   "sessionId": "optional",
 *   "context": { orderId, bookingId, ... }  // optional
 * }
 *
 * Việc làm:
 *   1. Trả lời bằng knowledge nội bộ + (nếu có) Groq
 *   2. Lưu hội thoại care_chats/{sessionId}
 *   3. Nếu khiếu nại / SOS / yêu cầu người thật → escalate admin
 *   4. Mọi phiên báo admin_notifications + care_reports
 *
 * Env: GROQ_API_KEY (optional), FIREBASE_DATABASE_URL, ALLOWED_ORIGINS
 * =============================================================================
 */

const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const BRAND = 'ProMax Care AI';
const CHANNELS = new Set(['driver', 'customer', 'xeghep']);

const KB = {
  common:
    'Taxi ProMax là nền tảng kết nối tài xế–khách (SaaS). Khách trả tiền mặt cho tài xế. ' +
    'Hỗ trợ: Zalo/phone chủ app theo thông báo trong app. Không hướng dẫn gian lận GPS.',
  customer:
    'Đặt xe trên app Khách: chọn điểm đón/đến, loại xe, xác nhận. Theo dõi tài xế realtime. ' +
    'Hủy chuyến: dùng nút hủy trong app; có thể phát sinh phí nếu tài xế đã đến gần. ' +
    'SOS: giữ nút SOS gửi vị trí + ghi âm cho admin. Đánh giá + tip sau chuyến.',
  driver:
    'Tài xế: bật Online để nhận đơn. Gói cước SaaS (Lẻ/PRO/PROMAX). ' +
    'Nhận đơn bằng transaction — một tài xế một đơn. Auto Dispatch có thể offer đơn công bằng. ' +
    'GPS yếu: bật Vị trí chính xác. SOS 2 phút ghi âm. Không dùng GPS giả.',
  xeghep:
    'Xe ghép: tài xế đăng chuyến; khách tìm/đặt ghế, nhận QR vé. ' +
    'Hủy sát giờ có thể phí 20%. Chat tài xế–khách trong app. Theo dõi hành trình trên bản đồ.'
};

const ESCALATE_KEYWORDS = [
  'khiếu nại', 'khieu nai', 'lừa', 'lua dao', 'mất tiền', 'mat tien',
  'kiện', 'công an', 'sos', 'nguy hiểm', 'nguy hiem', 'đánh', 'danh nhau',
  'hoàn tiền', 'hoan tien', 'chửi', 'lừa đảo', 'scam', 'hack',
  'gặp admin', 'gap admin', 'người thật', 'nguoi that', 'tổng đài', 'tong dai'
];

function cleanText(v, max = 1200) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function applyCors(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers?.origin;
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

async function fb(path, options = {}) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    ...options,
    signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Firebase HTTP ${res.status}`);
  return res.json();
}

async function fbPut(path, data) {
  return fb(path, { method: 'PUT', body: JSON.stringify(data) });
}

async function fbPost(path, data) {
  return fb(path, { method: 'POST', body: JSON.stringify(data) });
}

function needsEscalate(message) {
  const m = message.toLowerCase();
  return ESCALATE_KEYWORDS.some((k) => m.includes(k));
}

function localReply(channel, message) {
  const m = message.toLowerCase();
  const base = KB[channel] || KB.common;

  if (/giá|cước|bao nhiêu|tính tiền/.test(m)) {
    return {
      answer:
        'Cước ước tính theo km trên app (tham khảo ~15.000đ/km, tối thiểu khoảng 20.000đ — có thể khác theo khu vực). Thanh toán tiền mặt cho tài xế. Chi tiết hiện trên màn hình trước khi xác nhận.',
      source: 'local_kb'
    };
  }
  if (/hủy|huy chuyen|cancel/.test(m)) {
    return {
      answer:
        channel === 'xeghep'
          ? 'Hủy xe ghép: vào Của tôi → chọn chuyến → Hủy. Sát giờ có thể phí ~20%. Liên hệ tài xế qua chat nếu cần.'
          : 'Hủy chuyến: mở chi tiết chuyến → Hủy. Nếu tài xế đã nhận và đến gần, có thể phát sinh phí theo chính sách app.',
      source: 'local_kb'
    };
  }
  if (/gps|định vị|dinh vi|sai vị trí/.test(m)) {
    return {
      answer:
        'Vào Cài đặt điện thoại/trình duyệt → Quyền → Vị trí → Cho phép + bật Vị trí chính xác. Tắt mock GPS nếu có. Mở lại app và bấm làm mới GPS.',
      source: 'local_kb'
    };
  }
  if (/gói|gia hạn|het han|hết hạn|nạp/.test(m) && channel === 'driver') {
    return {
      answer:
        'Vào Ví tiền / Gói cước trong app tài xế để xem hạn và gia hạn (PayOS QR). Gói hết hạn sẽ tạm khóa nhận đơn đến khi gia hạn thành công.',
      source: 'local_kb'
    };
  }
  if (/sos|cấp cứu|nguy/.test(m)) {
    return {
      answer:
        'Nếu đang nguy hiểm: bấm giữ nút SOS trên app để gửi vị trí + ghi âm cho admin. Đồng thời gọi 113 nếu cần. Admin sẽ nhận cảnh báo ưu tiên.',
      source: 'local_kb',
      forceEscalate: true
    };
  }

  return {
    answer:
      `ProMax Care hỗ trợ kênh ${channel}. ${base} ` +
      'Anh/chị mô tả rõ hơn tình huống (mã đơn nếu có) để được hỗ trợ chính xác. ' +
      'Khi cần người thật, soạn "gặp admin" — hệ thống sẽ chuyển admin.',
    source: 'local_kb'
  };
}

async function groqReply(channel, message, context) {
  const key = cleanText(process.env.GROQ_API_KEY || '', 300);
  if (!key) return null;

  const sys =
    `Bạn là ${BRAND} của Taxi ProMax Việt Nam, đang hỗ trợ kênh "${channel}". ` +
    'Trả lời tiếng Việt, ngắn gọn dưới 120 từ, lịch sự, có bước xử lý cụ thể. ' +
    'Không cam kết hoàn tiền tùy tiện, không hướng dẫn gian lận GPS. ' +
    'Nếu ngoài phạm vi hoặc khiếu nại phức tạp: khuyên dùng SOS trong app hoặc chờ admin. ' +
    `Kiến thức: ${KB.common} ${KB[channel] || ''}`;

  const userContent = context
    ? `Ngữ cảnh: ${JSON.stringify(context).slice(0, 400)}\nCâu hỏi: ${message}`
    : message;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: process.env.CARE_MODEL || 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userContent }
      ],
      max_tokens: 220,
      temperature: 0.35
    }),
    signal: AbortSignal.timeout(12000)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return null;
  return { answer: text, source: 'groq', model: data.model || 'llama' };
}

async function notifyAdmin(payload) {
  const row = {
    type: 'care_report',
    read: false,
    createdAt: Date.now(),
    ...payload
  };
  try {
    await fbPost('admin_notifications', row);
  } catch (_) {}
  try {
    await fbPost('care_reports', row);
  } catch (_) {}
  return row;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, brand: BRAND, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const channel = cleanText(body.channel || body.role || 'customer', 20);
    if (!CHANNELS.has(channel)) {
      return res.status(400).json({
        success: false,
        brand: BRAND,
        error: 'channel phải là driver | customer | xeghep'
      });
    }

    const message = cleanText(body.message || body.question || body.text, 1200);
    if (!message) {
      return res.status(400).json({ success: false, brand: BRAND, error: 'Thiếu message' });
    }

    const userId = cleanText(body.userId || body.uid || 'anon', 120) || 'anon';
    const userName = cleanText(body.userName || body.name || '', 80);
    const phone = cleanText(body.phone || '', 20);
    const sessionId =
      cleanText(body.sessionId, 80) ||
      `care_${channel}_${userId}_${Date.now().toString(36)}`;
    const context =
      body.context && typeof body.context === 'object' ? body.context : null;

    // Trả lời
    let reply = localReply(channel, message);
    try {
      const ai = await groqReply(channel, message, context);
      if (ai?.answer) reply = ai;
    } catch (_) {
      /* giữ local */
    }

    const escalate = reply.forceEscalate || needsEscalate(message) || body.escalate === true;
    if (escalate && !/admin|tổng đài|113|SOS/i.test(reply.answer)) {
      reply.answer +=
        ' Hệ thống đã chuyển thông tin cho admin — anh/chị vui lòng giữ app để được liên hệ.';
    }

    const now = Date.now();
    const turn = {
      role: 'user',
      message,
      at: now
    };
    const botTurn = {
      role: 'assistant',
      message: reply.answer,
      source: reply.source || 'local_kb',
      at: Date.now()
    };

    // Lưu hội thoại
    const chatPath = `care_chats/${sessionId}`;
    let chat = null;
    try {
      chat = await fb(chatPath);
    } catch (_) {}

    const messages = Array.isArray(chat?.messages) ? chat.messages.slice(-40) : [];
    messages.push(turn, botTurn);

    const chatRecord = {
      sessionId,
      channel,
      userId,
      userName: userName || null,
      phone: phone || null,
      context: context || null,
      messages,
      escalate,
      status: escalate ? 'escalated' : 'open',
      updatedAt: Date.now(),
      createdAt: chat?.createdAt || now,
      lastMessage: message,
      lastAnswer: reply.answer
    };

    try {
      await fbPut(chatPath, chatRecord);
    } catch (_) {}

    // Báo admin: mọi phiên (tóm tắt); escalate = ưu tiên
    await notifyAdmin({
      title: escalate
        ? `🚨 Care cần xử lý (${channel})`
        : `💬 Care ${channel}: ${userName || userId}`,
      body: `KH: ${message.slice(0, 180)}\nAI: ${reply.answer.slice(0, 180)}`,
      channel,
      userId,
      userName,
      phone,
      sessionId,
      escalate,
      priority: escalate ? 'high' : 'normal',
      source: reply.source
    });

    // Escalation node riêng cho admin queue
    if (escalate) {
      try {
        await fbPost('care_escalations', {
          sessionId,
          channel,
          userId,
          userName,
          phone,
          message,
          answer: reply.answer,
          context,
          status: 'open',
          createdAt: Date.now()
        });
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      brand: BRAND,
      channel,
      sessionId,
      answer: reply.answer,
      source: reply.source || 'local_kb',
      escalate,
      reportedToAdmin: true
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      brand: BRAND,
      error: 'Care AI tạm thời không khả dụng',
      detail: String(error?.message || '').slice(0, 200)
    });
  }
}

export const config = { runtime: 'nodejs' };
