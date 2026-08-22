// /api/assistant.js
// Module 1: Trợ lý ProMax AI - Xử lý hội thoại cho App Khách & Tài xế

const {
  authMiddleware,
  cleanText,
  rateLimiter,
} = require("../lib/api-security");
const {
  BRAND_NAME,
  formatAIResponse,
  calculateFare,
  haversineDistance,
} = require("../lib/promax-ai-core");

/**
 * Kịch bản trả lời cho Khách hàng
 */
function handleCustomerQuery(query, context) {
  const q = query.toLowerCase();

  // 1. Hướng dẫn đặt xe
  if (q.includes("đặt xe") || q.includes("book")) {
    return formatAIResponse("success",
      `${BRAND_NAME} hướng dẫn đặt xe:\n` +
      `1️⃣ Mở app → Nhập điểm đón (GPS tự động nhận diện)\n` +
      `2️⃣ Nhập điểm đến → Xem giá ước tính minh bạch\n` +
      `3️⃣ Chọn loại xe (4 chỗ/7 chỗ/Tiện chuyến tiết kiệm 30%)\n` +
      `4️⃣ Xác nhận → Tài xế sẽ nhận chuyến trong 30s`
    );
  }

  // 2. Chính sách hủy chuyến
  if (q.includes("hủy") || q.includes("cancel")) {
    return formatAIResponse("success",
      `${BRAND_NAME} - Chính sách hủy chuyến:\n` +
      `✅ Hủy MIỄN PHÍ trong 2 phút đầu sau khi đặt\n` +
      `⚠️ Sau 2 phút hoặc tài xế đã đến: phí hủy 10.000đ\n` +
      `❌ Hủy khi tài xế đang đến gần (< 500m): phí 20.000đ`
    );
  }

  // 3. Tính giá cước
  if (q.includes("giá") || q.includes("tiền") || q.includes("cước")) {
    const { fromLat, fromLon, toLat, toLon } = context || {};
    if (fromLat && toLat) {
      const distance = haversineDistance(fromLat, fromLon, toLat, toLon);
      const fare = calculateFare(distance);
      return formatAIResponse("success",
        `${BRAND_NAME} tính giá minh bạch:\n` +
        `📏 Quãng đường: ${distance.toFixed(2)} km\n` +
        `💰 Giá ước tính: ${fare.toLocaleString("vi-VN")}đ\n` +
        `💡 Mẹo: Chọn "Xe Tiện Chuyến" để tiết kiệm đến 30%!`,
        { distance: distance.toFixed(2), fare }
      );
    }
    return formatAIResponse("success",
      `${BRAND_NAME}: Vui lòng cho tôi biết điểm đi và điểm đến để tính giá chính xác.`
    );
  }

  // 4. Xe tiện chuyến
  if (q.includes("tiện chuyến") || q.includes("tiết kiệm")) {
    return formatAIResponse("success",
      `${BRAND_NAME} - Xe Tiện Chuyến ProMax:\n` +
      `🌟 Tiết kiệm đến 30% so với xe thường\n` +
      `🤝 Ghép chung với hành khách có lộ trình trùng khớp\n` +
      `⏱️ Thời gian chờ thêm tối đa 10 phút\n` +
      `🔒 Vẫn đảm bảo an toàn và bảo hiểm đầy đủ`
    );
  }

  // Fallback
  return formatAIResponse("success",
    `${BRAND_NAME} sẵn sàng hỗ trợ bạn! Bạn có thể hỏi về:\n` +
    `• Cách đặt xe\n• Chính sách hủy chuyến\n• Tính giá cước\n• Xe tiện chuyến`
  );
}

/**
 * Kịch bản trả lời cho Tài xế
 */
function handleDriverQuery(query, context) {
  const q = query.toLowerCase();

  // 1. Kiểm tra an toàn trước ca
  if (q.includes("an toàn") || q.includes("kiểm tra") || q.includes("ca")) {
    return formatAIResponse("success",
      `${BRAND_NAME} - Checklist an toàn trước ca:\n` +
      `🛞 Lốp xe: áp suất đủ, không mòn vẹt\n` +
      `🛑 Phanh: thử phanh ở tốc độ thấp\n` +
      `📄 Giấy tờ: GPLX, đăng kiểm, bảo hiểm (còn hạn)\n` +
      `⛽ Nhiên liệu/Pin: tối thiểu 50%\n` +
      `💡 Đèn, còi, gương: hoạt động tốt\n` +
      `✅ Xác nhận "ĐÃ KIỂM TRA" trên app để bắt đầu nhận khách`
    );
  }

  // 2. Quy định sân bay (Nội Bài)
  if (q.includes("sân bay") || q.includes("nội bài")) {
    return formatAIResponse("success",
      `${BRAND_NAME} - Quy định đón khách tại sân bay Nội Bài:\n` +
      `📍 Điểm đón: Tầng 1, cột số 5-6 (Ga T1) / cột 10-11 (Ga T2)\n` +
      `🚫 KHÔNG đón/trả khách tại làn đường cấm\n` +
      `⏱️ Thời gian chờ miễn phí: 15 phút đầu\n` +
      `💰 Phụ phí sân bay: 10.000đ (thu tự động)\n` +
      `📞 Liên hệ khách qua app, KHÔNG gọi trực tiếp khi chưa có mã`
    );
  }

  // 3. Cập nhật trạng thái
  if (q.includes("trạng thái") || q.includes("status")) {
    return formatAIResponse("success",
      `${BRAND_NAME} - Trạng thái hiện tại của bạn:\n` +
      `🟢 Online: Đang nhận chuyến\n` +
      `🟡 Busy: Đang chở khách (tự động)\n` +
      `🔴 Offline: Tạm dừng nhận chuyến\n` +
      `💡 Chuyển trạng thái bằng nút ở màn hình chính`
    );
  }

  return formatAIResponse("success",
    `${BRAND_NAME} hỗ trợ tài xế:\n` +
    `• Kiểm tra an toàn trước ca\n• Quy định sân bay\n• Cập nhật trạng thái`
  );
}

module.exports = async function handler(req, res) {
  try {
    // 1. Bảo mật: xác thực + rate limit
    const auth = await authMiddleware(req);
    if (!auth.valid) {
      return res.status(401).json(formatAIResponse("error", auth.message));
    }

    await rateLimiter(req, res, auth.userId, 30); // 30 req/phút

    // 2. Validate & clean input (chống XSS/Injection)
    const rawQuery = req.body?.query || "";
    const role = req.body?.role || "customer"; // 'customer' | 'driver'
    const context = req.body?.context || {};

    if (!rawQuery || typeof rawQuery !== "string") {
      return res.status(400).json(
        formatAIResponse("error", "Thiếu trường 'query' hoặc định dạng không hợp lệ.")
      );
    }

    const query = cleanText(rawQuery); // sanitize
    if (query.length > 500) {
      return res.status(400).json(
        formatAIResponse("error", "Câu hỏi quá dài (tối đa 500 ký tự).")
      );
    }

    // 3. Dispatch theo role
    let response;
    if (role === "driver") {
      response = handleDriverQuery(query, context);
    } else {
      response = handleCustomerQuery(query, context);
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("[Assistant Error]", err);
    return res.status(500).json(
      formatAIResponse("error", "Hệ thống đang bận, vui lòng thử lại sau.")
    );
  }
};