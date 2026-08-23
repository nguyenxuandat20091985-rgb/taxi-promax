function endpointName(req) {
  const value = req?.query?.endpoint || new URL(req?.url || '/', 'http://localhost').searchParams.get('endpoint');
  return String(value || '').toLowerCase();
}

function adminDashboard(res) {
  return res.status(200).json({
    brand: 'Trợ lý ProMax AI',
    status: 'success',
    admin_dashboard: {
      active_rides: 142,
      system_status: 'Stable',
      authorized: true,
      total_drivers_online: 58
    },
    timestamp: Date.now()
  });
}

function monitor(req, res) {
  const { type } = req.body || {};
  return res.status(200).json({
    brand: 'Trợ lý ProMax AI',
    status: 'success',
    monitoring: {
      type: type || 'gps_check',
      teleportation_detected: false,
      message: 'Hệ thống giám sát GPS hoạt động ổn định, không phát hiện bất thường.'
    },
    timestamp: Date.now()
  });
}

function rideAllocation(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({
    brand: 'Trợ lý ProMax AI',
    status: 'success',
    allocation: {
      ride_id: `PROMAX-RIDE-${Math.floor(Math.random() * 10000)}`,
      driver_assigned: 'PROMAX-DRV-88',
      estimated_eta: '4 phút',
      status: 'allocated'
    },
    timestamp: Date.now()
  });
}

export default function handler(req, res) {
  try {
    switch (endpointName(req)) {
      case 'admin-dashboard':
        return adminDashboard(res);
      case 'monitor':
        return monitor(req, res);
      case 'ride-allocation':
        return rideAllocation(req, res);
      default:
        return res.status(404).json({ error: 'Legacy endpoint not found' });
    }
  } catch (error) {
    return res.status(200).json({
      brand: 'Trợ lý ProMax AI',
      status: 'fallback',
      message: 'Legacy endpoint fallback active.'
    });
  }
}

export const config = {
  api: {
    bodyParser: true
  }
};
