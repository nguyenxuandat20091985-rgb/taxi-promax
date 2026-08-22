export default function handler(req, res) {
  try {
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "success",
      admin_dashboard: {
        active_rides: 142,
        system_status: "Stable",
        authorized: true,
        total_drivers_online: 58
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "fallback",
      message: "Admin dashboard fallback active."
    });
  }
}
