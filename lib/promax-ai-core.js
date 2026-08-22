// /lib/promax-ai-core.js
// Core engine dùng chung cho các module AI của ProMax

const BRAND_NAME = "Trợ lý ProMax AI";

/**
 * Chuẩn hóa phản hồi theo định danh thương hiệu bắt buộc
 */
function formatAIResponse(status, message, data = null, meta = {}) {
  return {
    brand: BRAND_NAME,
    timestamp: new Date().toISOString(),
    status, // 'success' | 'warning' | 'critical' | 'error'
    message,
    data,
    meta: {
      version: "1.0.0",
      sessionId: meta.sessionId || null,
      ...meta,
    },
  };
}

/**
 * Tính khoảng cách Haversine (km) giữa 2 tọa độ
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ước tính ETA (phút) dựa trên khoảng cách và vận tốc trung bình
 */
function estimateETA(distanceKm, avgSpeedKmh = 30) {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Tính giá cước minh bạch theo quãng đường thực tế
 * - Dưới 1km: giá mở cửa
 * - Từ 1-30km: giá/km tiêu chuẩn
 * - Trên 30km: giảm 10% (khuyến khích đi xa)
 */
function calculateFare(distanceKm, options = {}) {
  const baseFare = options.baseFare || 12000;       // 12k mở cửa
  const perKmRate = options.perKmRate || 13000;     // 13k/km
  const longTripDiscount = options.longTripDiscount || 0.1;
  const longTripThreshold = options.longTripThreshold || 30;

  let total = baseFare;
  if (distanceKm > 1) {
    const billableKm = distanceKm - 1;
    let rate = perKmRate;
    if (billableKm > longTripThreshold) {
      rate = perKmRate * (1 - longTripDiscount);
    }
    total += billableKm * rate;
  }
  return Math.round(total);
}

/**
 * Phát hiện GPS Spoofing dựa trên heuristic vật lý
 */
function detectGPSSpoofing(prevPoint, currentPoint) {
  if (!prevPoint || !currentPoint) return { spoofed: false, reason: null };

  const distance = haversineDistance(
    prevPoint.lat, prevPoint.lon,
    currentPoint.lat, currentPoint.lon
  );
  const timeDeltaSec = (currentPoint.ts - prevPoint.ts) / 1000;

  if (timeDeltaSec <= 0) {
    return { spoofed: true, reason: "TIMESTAMP_INVALID" };
  }

  // Vận tốc tức thời (km/h)
  const speed = (distance / timeDeltaSec) * 3600;

  // Ngưỡng vật lý: xe không thể > 200km/h trong đô thị
  if (speed > 200) {
    return { spoofed: true, reason: "SPEED_ANOMALY", speed };
  }

  // Nhảy tọa độ: > 5km trong < 10s => bất thường
  if (distance > 5 && timeDeltaSec < 10) {
    return { spoofed: true, reason: "COORDINATE_JUMP", distance };
  }

  return { spoofed: false, speed };
}

module.exports = {
  BRAND_NAME,
  formatAIResponse,
  haversineDistance,
  estimateETA,
  calculateFare,
  detectGPSSpoofing,
};