export default function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { pickup, destination } = req.body || {};
    
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "success",
      allocation: {
        ride_id: "PROMAX-RIDE-" + Math.floor(Math.random() * 10000),
        driver_assigned: "PROMAX-DRV-88",
        estimated_eta: "4 phút",
        status: "allocated"
      },
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "fallback",
      message: "Ride allocation fallback active."
    });
  }
}
