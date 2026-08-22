// /api/monitor.js
// Module 3: Autonomous Error Detection & Admin Supervision
// Quét bất thường, phân tầng WARNING/CRITICAL, đẩy alert về AI Admin Dashboard

const {
  authMiddleware,
  cleanText,
  rateLimiter,
} = require("../lib/api-security");
const {
  formatAIResponse,
  detectGPSSpoofing,
} = require("../lib/promax-ai-core");

// Severity levels
const SEVERITY = {
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
};

/**
 * Lưu log sự cố (ghi vào DB / log storage)
 * - AI Admin Dashboard sẽ đọc từ đây để tổng hợp
 */
async function logIncident(incident) {
  // TODO: Ghi vào DB (MongoDB/PostgreSQL) hoặc log service
  // Ví dụ: await db.collection('incidents').insertOne(incident);
  console.log(`[INCIDENT:${incident.severity}]`, JSON.stringify(incident));
  return { logged: true, incidentId: `INC_${Date.now()}` };
}

/**
 * Đẩy Push Alert khẩn cấp lên Dashboard Admin
 */
async function pushAdminAlert(alert) {
  // TODO: Gửi qua WebSocket / SSE / Push Service
  // Ví dụ: await adminPushService.broadcast(alert);
  console.log(`[ADMIN_ALERT:${alert.severity}]`, JSON.stringify(alert));
  return { pushed: true };
}

/**
 * Khóa tạm thời luồng thiết bị vi phạm (CRITICAL)
 */
async function suspendDevice(deviceId, reason, durationMinutes = 30) {
  // TODO: Cập nhật DB, đánh dấu device bị suspend
  console.log(`[SUSPEND] Device ${deviceId} - ${reason} - ${durationMinutes}min`);
  return { suspended: true, deviceId, until: Date.now() + durationMinutes * 60000 };
}

/**
 * Kiểm tra tín hiệu thiết bị mất kết nối
 */
function checkConnectionHealth(device) {
  const now = Date.now();
  const lastSeen = device.lastSeen || 0;
  const offlineSec = (now - lastSeen) / 1000;

  if (offlineSec > 300) {
    // Mất kết nối > 5 phút
    return {
      healthy: false,
      severity: SEVERITY.WARNING,
      reason: "DEVICE_OFFLINE_LONG",
      offlineSec,
    };
  }
  if (offlineSec > 60) {
    return {
      healthy: false,
      severity: SEVERITY.WARNING,
      reason: "DEVICE_OFFLINE_SHORT",
      offlineSec,
    };
  }
  return { healthy: true };
}

/**
 * Kiểm tra giao dịch bất thường
 */
function checkTransactionAnomaly(tx) {
  // Ví dụ: giao dịch > 5 triệu trong 1 phút => bất thường
  if (tx.amount > 5000000 && tx.timeWindowSec < 60) {
    return {
      anomaly: true,
      severity: SEVERITY.CRITICAL,
      reason: "HIGH_VALUE_RAPID_TX",
    };
  }
  // Giao dịch âm hoặc 0
  if (tx.amount <= 0) {
    return {
      anomaly: true,
      severity: SEVERITY.CRITICAL,
      reason: "INVALID_TX_AMOUNT",
    };
  }
  return { anomaly: false };
}

module.exports = async function handler(req, res) {
  try {
    // 1. Bảo mật - chỉ Admin/Driver app mới được gọi
    const auth = await authMiddleware(req);
    if (!auth.valid) {
      return res.status(401).json(formatAIResponse("error", auth.message));
    }
    await rateLimiter(req, res, auth.userId, 60);

    const { type, payload } = req.body || {};

    if (!type || !payload) {
      return res.status(400).json(
        formatAIResponse("error", "Thiếu 'type' hoặc 'payload'.")
      );
    }

    let incident = null;

    // 2. Phân tích theo loại sự kiện
    switch (type) {
      case "GPS_REPORT": {
        const { deviceId, current, previous } = payload;
        const spoofCheck = detectGPSSpoofing(previous, current);

        if (spoofCheck.spoofed) {
          incident = {
            severity: SEVERITY.CRITICAL,
            type: "GPS_SPOOFING",
            deviceId,
            reason: spoofCheck.reason,
            detail: spoofCheck,
            timestamp: Date.now(),
          };

          // CRITICAL => khóa thiết bị + alert admin
          await suspendDevice(deviceId, spoofCheck.reason);
          await pushAdminAlert({
            severity: SEVERITY.CRITICAL,
            title: "🚨 Gian lận tọa độ phát hiện",
            message: `Thiết bị ${deviceId} bị khóa do ${spoofCheck.reason}`,
            deviceId,
          });
        }
        break;
      }

      case "HEARTBEAT": {
        const health = checkConnectionHealth(payload);
        if (!health.healthy) {
          incident = {
            severity: health.severity,
            type: "CONNECTION_LOST",
            deviceId: payload.deviceId,
            reason: health.reason,
            offlineSec: health.offlineSec,
            timestamp: Date.now(),
          };

          // WARNING => chỉ log, AI Admin Dashboard sẽ tự tổng hợp
          await logIncident(incident);
        }
        break;
      }

      case "TRANSACTION": {
        const txCheck = checkTransactionAnomaly(payload);
        if (txCheck.anomaly) {
          incident = {
            severity: txCheck.severity,
            type: "TX_ANOMALY",
            reason: txCheck.reason,
            detail: payload,
            timestamp: Date.now(),
          };

          if (txCheck.severity === SEVERITY.CRITICAL) {
            await suspendDevice(payload.deviceId, txCheck.reason);
            await pushAdminAlert({
              severity: SEVERITY.CRITICAL,
              title: "💸 Giao dịch bất thường",
              message: `Giao dịch ${payload.amount}đ bị chặn - ${txCheck.reason}`,
              deviceId: payload.deviceId,
            });
          } else {
            await logIncident(incident);
          }
        }
        break;
      }

      default:
        return res.status(400).json(
          formatAIResponse("error", `Loại sự kiện '${type}' không được hỗ trợ.`)
        );
    }

    // 3. Trả kết quả
    if (incident) {
      return res.status(200).json(
        formatAIResponse(
          incident.severity === SEVERITY.CRITICAL ? "critical" : "warning",
          `Đã phát hiện sự cố ${incident.type}. ` +
          (incident.severity === SEVERITY.CRITICAL
            ? "Thiết bị đã bị khóa tạm thời và Admin đã được thông báo."
            : "Sự cố đã được ghi log để AI Admin tổng hợp."),
          { incident }
        )
      );
    }

    return res.status(200).json(
      formatAIResponse("success", "Không phát hiện bất thường.", { type })
    );
  } catch (err) {
    console.error("[Monitor Error]", err);
    return res.status(500).json(
      formatAIResponse("error", "Lỗi hệ thống giám sát. Vui lòng thử lại.")
    );
  }
};