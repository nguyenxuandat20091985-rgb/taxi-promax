// /services/api-service.js
// Service trung tâm gọi các endpoint backend Taxi ProMax

const BASE_URL = "https://api.taxipromax.com"; // Thay bằng domain thật của anh

class ApiService {
  // Lấy header xác thực (dùng cho mọi request)
  static getHeaders(token) {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  }

  // 1. Gọi Assistant (Khách/Tài xế)
  static async askAssistant(query, role, context, token) {
    const res = await fetch(`${BASE_URL}/api/assistant`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ query, role, context }),
    });
    return res.json();
  }

  // 2. Phân bổ chuyến (Dùng cho Admin hoặc hệ thống tự động)
  static async allocateRide(pickup, vehicleType, nearbyDrivers, token) {
    const res = await fetch(`${BASE_URL}/api/ride-allocation`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ pickup, vehicleType, nearbyDrivers }),
    });
    return res.json();
  }

  // 3. Giám sát GPS (Dùng để gửi tọa độ định kỳ)
  static async monitorGPS(payload, token) {
    const res = await fetch(`${BASE_URL}/api/monitor`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ type: "gps_check", payload }),
    });
    return res.json();
  }

  // 4. Lấy dữ liệu Admin Dashboard
  static async getAdminData(token) {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      method: "GET",
      headers: this.getHeaders(token),
    });
    return res.json();
  }
}

export default ApiService;
