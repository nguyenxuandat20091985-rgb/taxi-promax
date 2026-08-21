# Closed-Loop Autonomous Intelligence Engine

## Nguyên tắc

Engine này là lớp quyết định deterministic của Taxi ProMax, không gọi Groq, OpenAI, Gemini hoặc bất kỳ API AI bên ngoài nào. Knowledge base là dữ liệu cấu hình có version; autonomous engine tính toán bằng quy luật và feedback loop có biên. API chỉ ghi log hoạt động, không tự sửa code, tự đổi bảng giá hoặc tự triển khai.

## Endpoint

```text
POST /api/autonomous-core
```

Request cần có `operation`; `role` nhận `customer`, `driver`, `admin` hoặc `system`. Request body được giới hạn kích thước và các field số được kiểm tra trước khi tính toán.

### Tra cứu tri thức

```json
{
  "operation": "knowledge_query",
  "role": "driver",
  "query": "xử lý sai lệch thanh toán",
  "category": "incidentGuides",
  "limit": 5
}
```

### Báo giá

```json
{
  "operation": "fare_quote",
  "role": "customer",
  "region": "Hà Nội",
  "service": "taxi_standard",
  "distanceKm": 8.4,
  "durationMinutes": 24,
  "surge": 1,
  "zoneWeight": 1,
  "compensation": 1
}
```

### Chấm điểm phân bổ

```json
{
  "operation": "allocation_score",
  "role": "system",
  "pickup": { "lat": 21.028, "lng": 105.854 },
  "hotspotWeight": 1.15,
  "drivers": [
    { "id": "driver_1", "online": true, "rating": 4.8, "completionRate": 0.96, "acceptanceRate": 0.9, "safetyScore": 0.95, "location": { "lat": 21.03, "lng": 105.856, "timestamp": 1720000000000 } }
  ]
}
```

### Kiểm tra GPS

```json
{
  "operation": "gps_check",
  "role": "driver",
  "previous": { "lat": 21.0, "lng": 105.8, "timestamp": 1720000000000 },
  "current": { "lat": 21.001, "lng": 105.801, "timestamp": 1720000060000 },
  "history": []
}
```

### Feedback loop giá

`pricing_optimize` nhận danh sách chuyến đã ẩn danh gồm `distanceKm`, `waitMinutes`, `status` hoặc `cancelled`. Nếu `loadFromFirebase: true`, API đọc tối đa 200 chuyến gần nhất từ `datxe`. Kết quả là đề xuất hệ số, chưa tự ghi đè bảng giá. Chỉ service backend có quyền transaction mới được áp dụng hệ số sau khi kiểm tra biên và audit.

## Firebase

Đặt `FIREBASE_DATABASE_URL` trên Vercel. Log được ghi best-effort vào `autonomous_logs`. Cần thêm Firebase Rules giới hạn quyền ghi node log cho backend/service account hoặc chuyển log sang endpoint backend có xác thực; không để client tự ghi log quản trị.

## Vercel

Không cần dependency mới. API dùng Fetch và AbortSignal có sẵn trên Node 20.x. Sau deploy cần kiểm tra POST thật với các operation ở trên và xác nhận response JSON, latency, Firebase Rules và transaction trước khi bật pricing feedback production.
