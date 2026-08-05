# TAXI PROMAX DATABASE SCHEMA
**Cập nhật: 06/08/2026 — Phản ánh 100% code thực tế**

## DATABASE

Firebase Realtime Database  
URL: `https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app`

---

# ROOT NODES

```
/drivers/          → Hồ sơ tài xế
/customers/        → Hồ sơ khách hàng
/datxe/            → Đơn đặt xe (KHÔNG dùng /orders/)
/trips/            → Lịch sử chuyến đi của tài xế
/receipts/         → Hóa đơn điện tử
/ratings/          → Đánh giá sau chuyến
/sos/              → Báo động SOS tài xế
/emergencies/      → Báo động SOS khách hàng
/shared_rides/     → Chuyến xe ghép (tài xế đăng)
/shared_ride_bookings/ → Đặt ghế xe ghép (khách đặt)
/chat/             → Chat driver ↔ customer
/chat_xg/          → Chat xe ghép
/tai_xe_online/    → Vị trí realtime tài xế
/customer_requests/ → Yêu cầu đặt xe từ khách
/promos/           → Mã giảm giá
```

---

# DRIVERS

```
drivers/{driverId}/
├── uid: string                    (VD: "DRV_XRBXRM")
├── name: string                   (VD: "NGUYỄN XUÂN ĐẠT")
├── phone: string                  (VD: "0388724966")
├── cccd: string                   (VD: "022085004794")
├── plate: string                  (VD: "14H 06321")
├── carModel: string               (VD: "Toyota Vios")
├── fuelType: "xang" | "dien"
├── carClass: "4_seats" | "7_seats"
├── carType: "4_seats" | "7_seats" (legacy)
├── passwordHash: string           (hash Java-style)
├── status: "online" | "offline"
├── rating: number                 (0-5)
├── totalRides: number
├── totalRevenue: number
├── coins: number
├── createdAt: number              (Unix timestamp ms)
│
├── tp_expiry: number              (Unix timestamp — hết hạn gói)
├── active_plan: string            ("TRIAL 7D" | "PROMAX")
│
├── documents/                     (KYC)
│   ├── front: base64              (CCCD mặt trước)
│   ├── back: base64               (CCCD mặt sau)
│   ├── license: base64            (bằng lái)
│   ├── selfie: base64             (ảnh chân dung)
│   ├── status: "pending" | "approved" | "rejected"
│   ├── submittedAt: number
│   ├── decidedAt: number
│   └── rejectReason: string?
│
├── wallet/
│   └── transactions/{txId}/
│       ├── id: string
│       ├── type: "payment"
│       ├── plan: "m1" | "m3" | "m12"
│       ├── planName: string
│       ├── amount: number         (99000 / 249000 / 799000)
│       ├── code: string           (VD: "PROMAX 0388724966")
│       ├── status: "pending" | "paid" | "rejected"
│       ├── createdAt: number
│       ├── approvedAt: number?
│       └── rejectedAt: number?
│
└── battery/                       (EV module)
    ├── level: number              (0-100)
    └── updatedAt: number
```

---

# CUSTOMERS

```
customers/{customerId}/
├── uid: string                    (VD: "KH_ABC123")
├── name: string
├── phone: string
├── passwordHash: string
├── createdAt: number
└── statistics/
    ├── totalTrips: number
    └── cancelledTrips: number
```

---

# DATXE (ĐẶT XE) — Node chính

```
datxe/{orderId}/
├── status: ORDER_STATUS           (xem enum bên dưới)
├── phone: string                  (SĐT khách)
├── clientName: string
├── customerPhone: string
├── customerId: string
├── pickup: string                 (địa chỉ text)
├── dropoff: string                (địa chỉ text)
├── pickupLat: number
├── pickupLng: number
├── dropoffLat: number?
├── dropoffLng: number?
├── carType: "4_seats" | "7_seats" | "both"
├── estimateKm: number
├── estimatePrice: number
├── paymentMethod: "cash"
├── notes: string?
├── timestamp: number              (Unix timestamp)
│
├── driverId: string?              (khi tài xế nhận)
├── driverName: string?
├── driverPhone: string?
├── driverPlate: string?
├── driverRating: number?
├── acceptedAt: number?
│
├── completedAt: number?
├── actualKm: number?
├── actualPrice: number?
│
├── cancelledBy: "customer" | "driver"?
├── cancelAt: number?
└── cancelReason: string?
```

---

# TRIPS (Lịch sử chuyến của tài xế)

```
trips/{driverUid}/{tripId}/
├── km: number                     (VD: 5.2)
├── cost: number                   (VD: 78000)
├── costLabel: string              (VD: "78,000")
├── time: string                   (VD: "06/08/2026, 21:30:00")
├── timestamp: number
├── rate: number                   (15000)
├── driverId: string
└── tripType: "STREET_HAIL" | "APP_BOOKING"
```

---

# RECEIPTS (Hóa đơn điện tử)

```
receipts/{code}/                   (VD: "HDABC123")
├── code: string
├── createdAt: number
├── orderId: string?
├── driverName: string
├── driverPhone: string
├── plate: string
├── customerName: string
├── pickup: string
├── dropoff: string
├── km: number
├── price: number
└── tripType: "STREET_HAIL" | "APP_BOOKING"
```

**URL công khai:** `/?receipt={code}`

---

# RATINGS

```
ratings/{orderId}/
├── orderId: string
├── driverId: string
├── customerId: string
├── overall: number                (1-5)
├── comment: string?
├── tip: number?                   (0 / 10000 / 20000 / 50000)
└── timestamp: number
```

---

# SOS (Tài xế)

```
sos/{code}/                        (VD: "SOSABC123")
├── code: string
├── driverUid: string
├── driverName: string
├── phone: string
├── plate: string
├── lat: number
├── lng: number
├── createdAt: number
├── status: SOS_STATUS
├── lastUpdate: number             (live location mỗi 5s)
├── audio: base64?                 (ghi âm 2 phút, MediaRecorder)
├── audioType: string?             ("audio/webm")
├── audioSavedAt: number?
├── cancelledAt: number?
├── safeAt: number?
└── endedAt: number?
```

---

# EMERGENCIES (Khách hàng)

```
emergencies/{code}/
├── code: string
├── customerId: string?
├── customerPhone: string?
├── customerName: string?
├── orderId: string?
├── lat: number
├── lng: number
├── timestamp: number
├── status: SOS_STATUS
├── source: "xeghep" | "khachhang"
├── audio: base64?                 (ghi âm 30s)
├── audioSavedAt: number?
├── lastUpdate: number
└── endedAt: number?
```

---

# SHARED RIDES (Xe ghép — tài xế đăng)

```
shared_rides/{rideId}/
├── driverId: string
├── driverName: string
├── phone: string
├── pickup: string
├── dropoff: string
├── route: string                  (VD: "Hà Nội → Hải Phòng")
├── departureTime: string          (VD: "2026-08-07 08:00:00")
├── vehicle: string                ("4-xang" | "7-xang" | "4-dien" | "7-dien")
├── price: number                  (giá/ghế)
├── seats: number                  (ghế trống)
├── status: "active" | "full" | "completed" | "cancelled"
├── timestamp: number
└── source: "taxi_promax"
```

---

# SHARED RIDE BOOKINGS (Đặt ghế xe ghép)

```
shared_ride_bookings/{bookingId}/
├── rideId: string
├── customerId: string
├── customerName: string
├── customerPhone: string
├── driverId: string
├── driverName: string
├── driverPhone: string
├── route: string
├── departureTime: string
├── seats: number
├── price: number
├── totalPrice: number
├── bookingCode: string            (VD: "XE123456")
├── status: BOOKING_STATUS
├── timestamp: number
├── paymentMethod: "cash" | "wallet"
├── paymentStatus: "pending" | "paid"
├── pickupLat: number?
├── pickupLng: number?
├── dropoffLat: number?
├── dropoffLng: number?
├── cancelledAt: number?
├── cancellationFee: number?
└── rating/
    ├── score: number (1-5)
    ├── comment: string?
    └── timestamp: number
```

---

# CHAT

```
chat/{orderId}/{messageId}/
├── sender: "driver" | "customer"
├── from: "driver" | "customer"
├── senderName: string
├── text: string
└── timestamp: number

chat/{orderId}_typing/
├── driver: boolean
└── customer: boolean
```

---

# CHAT XE GHÉP

```
chat_xg/{bookingId}/{messageId}/
├── sender: "driver" | "customer"
├── senderName: string
├── text: string
└── timestamp: number

chat_xg/{bookingId}_typing/
├── driver: boolean
└── customer: boolean
```

---

# TÀI XẾ ONLINE (Realtime)

```
tai_xe_online/{driverUid}/
├── lat: number
├── lng: number
├── heading: number?
├── speed: number?
├── accuracy: number?
├── timestamp: number
├── online: boolean
└── name: string?
```

---

# CUSTOMER REQUESTS

```
customer_requests/{requestId}/
├── customerId: string
├── customerName: string
├── customerPhone: string
├── pickup: string
├── dropoff: string
├── route: string
├── departureTime: string
├── seats: number
├── price: number
├── estimatedPrice: number
├── status: "waiting" | "accepted" | "cancelled"
├── timestamp: number
├── source: "customer_request"
├── pickupLatitude: number?
├── pickupLongitude: number?
├── dropoffLatitude: number?
├── dropoffLongitude: number?
└── promoCode: string?
```

---

# PROMOS

```
promos/{code}/                     (VD: "WELCOME20")
├── code: string
├── discount: number               (phần trăm)
├── active: boolean
├── expiresAt: number?             (Unix timestamp)
└── createdAt: number
```

---

# ENUMS

## ORDER_STATUS (datxe)
```
waiting       → Chờ tài xế nhận
driving       → Tài xế đang đến đón
picked_up     → Đã đón khách
in_progress   → Đang chạy
completed     → Hoàn thành
cancelled     → Đã hủy
```

## DRIVER_STATUS
```
offline       → Ngoại tuyến
online        → Sẵn sàng nhận đơn
busy          → Đang có chuyến
suspended     → Bị khóa
```

## SOS_STATUS
```
active        → Đang báo động (live)
safe          → Admin đánh dấu an toàn
cancelled     → Báo động giả
ended         → Kết thúc (hết thời gian)
```

## BOOKING_STATUS (xe ghép)
```
waiting       → Chờ tài xế xác nhận
accepted      → Tài xế đã nhận
on_the_way    → Tài xế đang đến
arrived       → Đã đến điểm đón
in_progress   → Đang di chuyển
completed     → Hoàn thành
cancelled     → Đã hủy
```

## KYC_STATUS
```
pending       → Chờ duyệt
approved      → Đã duyệt (badge ✅)
rejected      → Từ chối
```

## PAYMENT_STATUS (wallet/transactions)
```
pending       → Chờ admin xác nhận
paid          → Đã xác nhận → gia hạn gói
rejected      → Từ chối
```

---

# QUY TẮC DATABASE

1. **Không đổi tên node gốc** — đặc biệt `datxe/` (không phải `orders/`)
2. **Không tạo dữ liệu ngoài schema** — thêm node phải update file này
3. **Mọi tính năng mới phải mở rộng từ schema** — không phá cấu trúc cũ
4. **Không lưu dữ liệu trùng lặp** — dùng reference ID
5. **Không lưu mật khẩu bản rõ** — chỉ `passwordHash`
6. **Ảnh base64** nén tối đa (JPEG 0.7, max 800px) để tránh tốn storage
7. **Mọi truy vấn tối ưu cho Firebase** — dùng `orderByChild` + index
8. **Ưu tiên Realtime Listener** thay vì polling
9. **Mọi timestamp dùng Unix ms** — `Date.now()`
10. **Mọi ID**:
    - Driver: `DRV_` + base36 timestamp
    - Customer: `KH_` + base36 timestamp
    - Order: Firebase push key (`-O...`)
    - Receipt: `HD` + base36 timestamp
    - SOS: `SOS` + base36 timestamp
    - Booking: `XE` + base36 timestamp
11. **Mọi thay đổi schema phải ghi vào CHANGELOG.md**
12. **Backup Firebase mỗi tuần** trước khi migrate schema

---

# INDEXES FIREBASE (cần add trong Firebase Console)

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "datxe": {
      ".indexOn": ["status", "timestamp", "driverId"]
    },
    "trips": {
      "$uid": {
        ".indexOn": ["timestamp"]
      }
    },
    "receipts": {
      ".indexOn": ["customerPhone", "driverPhone", "createdAt"]
    },
    "shared_rides": {
      ".indexOn": ["timestamp", "status"]
    },
    "shared_ride_bookings": {
      ".indexOn": ["customerId", "driverId", "timestamp", "status"]
    },
    "sos": {
      ".indexOn": ["createdAt", "status"]
    },
    "emergencies": {
      ".indexOn": ["createdAt", "status"]
    },
    "drivers": {
      ".indexOn": ["phone"]
    },
    "customers": {
      ".indexOn": ["phone"]
    }
  }
}
```

---

# THỐNG KÊ SCHEMA (06/08/2026)

| Node | Số node con chính | Module sử dụng |
|---|---|---|
| `drivers/` | 5 (profile, documents, wallet, battery, statistics) | App tài xế, Admin |
| `customers/` | 2 (profile, statistics) | App khách, Xe ghép |
| `datxe/` | 20+ fields | App khách → App tài xế |
| `trips/` | 8 fields | App tài xế (lịch sử) |
| `receipts/` | 11 fields | App tài xế, App khách |
| `ratings/` | 6 fields | App khách → App tài xế |
| `sos/` | 12 fields | App tài xế, Admin |
| `emergencies/` | 11 fields | App khách, Admin |
| `shared_rides/` | 10 fields | App xe ghép (tài xế) |
| `shared_ride_bookings/` | 20+ fields | App xe ghép (khách) |
| `chat/` | 5 fields + typing | App tài xế ↔ App khách |
| `chat_xg/` | 5 fields + typing | Xe ghép |
| `tai_xe_online/` | 7 fields | App tài xế (push), App khách (track) |
| `customer_requests/` | 15 fields | App khách → App tài xế |
| `promos/` | 5 fields | Xe ghép |

**Tổng: 15 nodes, 150+ fields, 6 enums**

---

*Schema cập nhật lần cuối: 06/08/2026 — NGUYỄN XUÂN ĐẠT*