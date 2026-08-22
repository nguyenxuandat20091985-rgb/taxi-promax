// /api/admin/dashboard.js
// Endpoint tổng hợp sự cố cho Trợ lý AI Admin trên Dashboard

const { authMiddleware, requireRole } = require("../lib/api-security");
const { formatAIResponse } = require("../lib/promax-ai-core");

module.exports = async function handler(req, res) {
  try {
    const auth = await authMiddleware(req);
    if (!auth.valid) return res.status(401).json(formatAIResponse("error", auth.message));

    // Chỉ Admin mới được truy cập
    const roleCheck = requireRole(auth, "admin");
    if (!roleCheck.allowed) {
      return res.status(403).json(formatAIResponse("error", "Không có quyền truy cập."));
    }

    // TODO: Query từ DB incidents collection
    const incidents = {
      critical: [], // Cần can thiệp ngay
      warning: [],  // Đang theo dõi
      summary: {
        total24h: 0,
        criticalCount: 0,
        warningCount: 0,
        topReasons: [],
      },
    };

    return res.status(200).json(
      formatAIResponse("success", "Dữ liệu giám sát thời gian thực", incidents, {
        dashboard: true,
      })
    );
  } catch (err) {
    console.error("[AdminDashboard Error]", err);
    return res.status(500).json(formatAIResponse("error", "Lỗi tải dashboard."));
  }
};