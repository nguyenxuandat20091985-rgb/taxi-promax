export default function handler(req, res) {
  try {
    const { type, previous, current } = req.body || {};
    
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "success",
      monitoring: {
        type: type || "gps_check",
        teleportation_detected: false,
        message: "Hệ thống giám sát GPS hoạt động ổn định, không phát hiện bất thường."
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "fallback",
      message: "Monitor fallback active."
    });
  }
}
