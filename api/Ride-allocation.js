// /api/ride-allocation.js
// Module 2: Smart Ride Allocation - Ghép chuyến & phân bổ tài xế

const {
  authMiddleware,
  cleanText,
  rateLimiter,
} = require("../lib/api-security");
const ProMaxLocation = require("../lib/promax-location");
const {
  formatAIResponse,
  haversineDistance,
  estimateETA,
  calculateFare,
} = require("../lib/promax-ai-core");

/**
 * Tìm tài xế gần nhất trong bán kính cho phép
 */
async function findNearestDrivers(pickup, radiusKm = 5, limit = 5) {
  const onlineDrivers = await ProMaxLocation.getOnlineDrivers();

  const candidates = onlineDrivers
    .map((d) => {
      const distance = haversineDistance(
        pickup.lat, pickup.lon,
        d.location.lat, d.location.lon
      );
      return { ...d, distance };
    })
    .filter((d) => d.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return candidates;
}

/**
 * Thuật toán ghép xe tiện chuyến (Shared Ride Matching)
 * Tiêu chí: điểm đi/đến nằm trên cùng tuyến đường, lệch <= 1.5km
 */
async function findSharedRideMatches(request, existingTrips) {
  const DEVIATION_THRESHOLD_KM = 1.5; // Lệch tối đa 1.5km
  const matches = [];

  for (const trip of existingTrips) {
    // Kiểm tra điểm đi của request có gần đường đi của trip không
    const detourFrom = haversineDistance(
      request.from.lat, request.from.lon,
      trip.from.lat, trip.from.lon
    );
    const detourTo = haversineDistance(
      request.to.lat, request.to.lon,
      trip.to.lat, trip.to.lon
    );

    // Điểm đi/đến phải nằm trong "hành lang" tuyến
    if (detourFrom <= DEVIATION_THRESHOLD_KM && detourTo <= DEVIATION_THRESHOLD_KM) {
      // Tính điểm phù hợp (càng gần càng tốt)
      const score = 100 - (detourFrom + detourTo) * 10;
      matches.push({
        tripId: trip.id,
        driverId: trip.driverId,
        score: Math.max(0, score),
        detourFrom,
        detourTo,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Scoring tổng hợp để chọn tài xế tối ưu
 */
function scoreDriver(driver, request) {
  let score = 100;

  // Khoảng cách (trọng số 50%)
  score -= driver.distance * 5;

  // Rating (trọng số 30%)
  score += (driver.rating || 4.5) * 3;

  // Số chuyến hoàn thành (trọng số 20%)
  const completedTrips = driver.completedTrips || 0;
  score += Math.min(completedTrips / 10, 10);

  return Math.max(0, score);
}

module.exports = async function handler(req, res) {
  try {
    // 1. Bảo mật
    const auth = await authMiddleware(req);
    if (!auth.valid) {
      return res.status(401).json(formatAIResponse("error", auth.message));
    }
    await rateLimiter(req, res, auth.userId, 20);

    // 2. Validate input
    const { from, to, sharedRide = false } = req.body || {};

    if (!from?.lat || !from?.lon || !to?.lat || !to?.lon) {
      return res.status(400).json(
        formatAIResponse("error", "Thiếu tọa độ điểm đi (from) hoặc điểm đến (to).")
      );
    }

    // Clean & validate tọa độ (chống injection tọa độ giả)
    const pickup = {
      lat: parseFloat(from.lat),
      lon: parseFloat(from.lon),
    };
    const destination = {
      lat: parseFloat(to.lat),
      lon: parseFloat(to.lon),
    };

    if (
      isNaN(pickup.lat) || isNaN(pickup.lon) ||
      isNaN(destination.lat) || isNaN(destination.lon)
    ) {
      return res.status(400).json(
        formatAIResponse("error", "Tọa độ không hợp lệ.")
      );
    }

    // 3. Tính khoảng đường & giá
    const distance = haversineDistance(
      pickup.lat, pickup.lon,
      destination.lat, destination.lon
    );
    const baseFare = calculateFare(distance);

    // 4. Nếu là tiện chuyến => tìm chuyến trùng tuyến
    if (sharedRide) {
      const existingTrips = await ProMaxLocation.getActiveSharedTrips();
      const matches = await findSharedRideMatches(
        { from: pickup, to: destination },
        existingTrips
      );

      if (matches.length > 0) {
        const best = matches[0];
        const sharedFare = Math.round(baseFare * 0.7); // Giảm 30%
        return res.status(200).json(
          formatAIResponse("success",
            `🎉 ${require("../lib/promax-ai-core").BRAND_NAME} tìm thấy xe tiện chuyến!\n` +
            `💰 Giá tiết kiệm 30%: ${sharedFare.toLocaleString("vi-VN")}đ\n` +
            `⏱️ Thời gian chờ thêm: ~5-10 phút`,
            {
              mode: "shared",
              matchedTripId: best.tripId,
              score: best.score,
              fare: sharedFare,
              baseFare,
            }
          )
        );
      }
    }

    // 5. Tìm tài xế gần nhất (chế độ thường)
    const drivers = await findNearestDrivers(pickup, 5, 5);

    if (drivers.length === 0) {
      return res.status(200).json(
        formatAIResponse("warning",
          "Hiện không có tài xế nào ở gần. Vui lòng thử lại sau ít phút.",
          { distance, baseFare }
        )
      );
    }

    // 6. Chấm điểm & chọn tài xế tối ưu
    const scored = drivers.map((d) => ({
      ...d,
      score: scoreDriver(d, { pickup, destination }),
      eta: estimateETA(d.distance),
    }));
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    return res.status(200).json(
      formatAIResponse("success",
        `✅ ${require("../lib/promax-ai-core").BRAND_NAME} đã tìm thấy tài xế!`,
        {
          mode: sharedRide ? "shared" : "standard",
          distance: distance.toFixed(2),
          fare: baseFare,
          driver: {
            id: best.id,
            name: best.name,
            phone: best.phone,
            plateNumber: best.plateNumber,
            rating: best.rating,
            distance: best.distance.toFixed(2),
            eta: best.eta,
          },
          alternatives: scored.slice(1, 3).map((d) => ({
            id: d.id,
            name: d.name,
            eta: d.eta,
            score: d.score,
          })),
        }
      )
    );
  } catch (err) {
    console.error("[RideAllocation Error]", err);
    return res.status(500).json(
      formatAIResponse("error", "Không thể phân bổ chuyến. Vui lòng thử lại.")
    );
  }
};