export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { role, question } = req.body || {};
    
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "success",
      data: {
        role: role || "customer",
        response: `Đã tiếp nhận yêu cầu: "${question || 'Hỗ trợ chung'}". Trợ lý ProMax AI luôn sẵn sàng phục vụ!`,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    return res.status(200).json({
      brand: "Trợ lý ProMax AI",
      status: "fallback",
      message: "Hệ thống đang hoạt động ở chế độ dự phòng an toàn."
    });
  }
}
