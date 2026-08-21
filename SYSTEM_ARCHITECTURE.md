# TAXI PROMAX — SYSTEM ARCHITECTURE
**Cập nhật: 06/08/2026 — Phản ánh 100% kiến trúc thực tế**

---

## 1. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  index.html  │khachhang.html│ xeghep.html  │   admin.html      │
│  (Tài xế)    │  (Khách)     │ (Xe ghép)    │   (Admin)         │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PWA LAYER (Service Worker v4.0)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Cache     │  │   Offline   │  │    Push     │             │
│  │  Strategy   │  │  Fallback   │  │Notification │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Realtime Database (15 nodes)                │   │
│  │  drivers/  customers/  datxe/  trips/  receipts/        │   │
│  │  ratings/  sos/  emergencies/  shared_rides/            │   │
│  │  shared_ride_bookings/  chat/  chat_xg/                 │   │
│  │  tai_xe_online/  customer_requests/  promos/            │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs LAYER                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Nominatim │ │  OSRM    │ │Open-Meteo│ │ Overpass │          │
│  │(Geocode) │ │(Routing) │ │(Weather) │ │  (POI)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐                                     │
│  │QR Server │ │placehold │                                     │
│  │  (QR)    │ │ (Icons)  │                                     │
│  └──────────┘ └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. CLIENT APPS

### 2.1 App Tài Xế (`index.html`)
**Vai trò:** Nhận đơn, chạy chuyến, quản lý profile
**Users:** Tài xế (đã KYC)

**Features:**
- Auth (đăng nhập/đăng ký/quên MK)
- GPS realtime + bản đồ Leaflet
- Nhận đơn từ `datxe/` (realtime listener)
- Đồng hồ tính cước (km × rate)
- Chat với khách
- SOS ghi âm 2 phút + live location
- KYC (CCCD + bằng lái + selfie)
- Ví tiền + Gói cước SaaS
- Hóa đơn điện tử
- Trạm sạc EV + Báo pin + Eco score
- AI Heatmap (gợi ý điểm đón)
- Menu sidebar đầy đủ

**Firebase nodes accessed:**
- `drivers/{uid}` (read/write profile, KYC, wallet)
- `datxe/` (read orders, write status updates)
- `tai_xe_online/{uid}` (write location)
- `chat/{orderId}` (read/write messages)
- `trips/{uid}` (write trip history)
- `receipts/` (write receipts)
- `sos/{code}` (write SOS data)
- `ratings/{orderId}` (read ratings)

**External APIs:**
- Leaflet + OSM tiles (map)
- Nominatim (geocoding)
- OSRM (routing)
- Open-Meteo (weather)
- Overpass API (EV charging stations)
- api.qrserver.com (QR codes)

---

### 2.2 App Khách Hàng (`khachhang.html`)
**Vai trò:** Đặt xe, theo dõi tài xế, thanh toán
**Users:** Khách hàng (đã đăng ký)

**Features:**
- Auth (đăng nhập/đăng ký/quên MK)
- Đặt xe (chọn điểm đón/đến, loại xe)
- Tính giá OSRM (km × rate)
- Theo dõi tài xế realtime
- Chat với tài xế
- Đánh giá + tip sau chuyến
- SOS ghi âm 30s + live location
- Hóa đơn điện tử
- Legal links (Chính sách bảo mật, Điều khoản)

**Firebase nodes accessed:**
- `customers/{uid}` (read/write profile)
- `datxe/` (write orders, read status)
- `tai_xe_online/{driverId}` (read location)
- `chat/{orderId}` (read/write messages)
- `ratings/{orderId}` (write ratings)
- `receipts/` (read receipts)
- `emergencies/{code}` (write SOS data)

**External APIs:**
- Leaflet + OSM tiles (map)
- Nominatim (geocoding)
- OSRM (routing)

---

### 2.3 App Xe Ghép (`xeghep.html`)
**Vai trò:** Đăng chuyến (tài xế) + Đặt ghế (khách)
**Users:** Tài xế + Khách hàng

**Features:**
- Auth (đăng nhập/đăng ký/quên MK)
- **Tài xế:**
  - Đăng chuyến (pickup, dropoff, time, price, seats)
  - Quản lý chuyến của mình
  - Chat với khách đặt ghế
- **Khách:**
  - Tìm chuyến (filter pickup/dropoff)
  - AI Match (chấm điểm chuyến phù hợp)
  - Smart Suggestions (gợi ý theo giờ)
  - Đặt ghế + QR code vé
  - Timeline 6 bước
  - Tracking realtime
  - Chat với tài xế (typing indicator)
  - Rating sau chuyến
  - Cancellation policy (phí 20% sát giờ)
  - Promo codes
  - Weather API
  - Driver profile

**Firebase nodes accessed:**
- `customers/{uid}` (read/write profile)
- `shared_rides/` (read/write rides)
- `shared_ride_bookings/` (read/write bookings)
- `chat_xg/{bookingId}` (read/write messages)
- `tai_xe_online/{driverId}` (read location)
- `ratings/{bookingId}` (write ratings)
- `promos/` (read promo codes)

**External APIs:**
- Leaflet + OSM tiles (map)
- Nominatim (geocoding)
- OSRM (routing)
- Open-Meteo (weather)
- qrcodejs (QR codes)

---

### 2.4 Admin Dashboard (`admin.html`)
**Vai trò:** Quản lý hệ thống, duyệt KYC/thanh toán, giám sát SOS
**Users:** Admin đã xác thực bằng Firebase Authentication hoặc backend session có role/claim `admin`; credential không lưu trong repository public.

**Features:**
- **8 tabs:**
  1. 📊 Dashboard — 8 stat cards + recent activity
  2. 🔐 Duyệt KYC — danh sách chờ + ảnh 4 mặt + Duyệt/Từ chối
  3. 💰 Thanh toán — giao dịch pending + nút duyệt (tự gia hạn gói)
  4. 🚨 SOS — danh sách SOS + bản đồ + nghe ghi âm + đánh dấu an toàn
  5. 🚕 Tài xế — danh sách + search + KYC status
  6. 👥 Khách hàng — danh sách khách
  7. 🚐 Xe Ghép — danh sách chuyến
  8. 🗺 Bản đồ — realtime tài xế online (Leaflet circle markers)
- Auto refresh 30s
- Badge realtime (đếm pending KYC/TT/SOS)

**Firebase nodes accessed:**
- `drivers/` (read all, write KYC status, wallet status)
- `customers/` (read all)
- `datxe/` (read all)
- `trips/` (read all)
- `receipts/` (read all)
- `sos/` (read all, write status)
- `emergencies/` (read all)
- `shared_rides/` (read all)
- `tai_xe_online/` (read all)

**External APIs:**
- Leaflet + OSM tiles (map)

---

## 3. FIREBASE DATABASE SCHEMA

### 3.1 Root Nodes (15 nodes)

```
drivers/{uid}/
├── profile (name, phone, cccd, plate, carModel, fuelType, carClass)
├── passwordHash (Java-style hash)
├── status (online/offline)
├── rating, totalRides, totalRevenue
├── tp_expiry (Unix timestamp — hết hạn gói)
├── active_plan (TRIAL 7D / PROMAX)
├── documents/ (KYC: front, back, license, selfie, status)
├── wallet/transactions/{tid} (plan, amount, status, code)
└── battery/ (level, updatedAt)

customers/{uid}/
├── profile (name, phone)
├── passwordHash
└── statistics (totalTrips, cancelledTrips)

datxe/{orderId}/
├── status (waiting/driving/completed/cancelled)
├── customer info (phone, name, customerId)
├── pickup/dropoff (address, lat, lng)
├── carType, estimateKm, estimatePrice
├── driver info (driverId, name, phone, plate)
├── timestamps (createdAt, acceptedAt, completedAt)
└── cancellation info (cancelledBy, cancelAt, cancelReason)

trips/{driverUid}/{tripId}/
├── km, cost, costLabel, time, timestamp
├── rate, driverId
└── tripType (STREET_HAIL / APP_BOOKING)

receipts/{code}/
├── code, createdAt, orderId
├── driver info (name, phone, plate)
├── customerName, pickup, dropoff
├── km, price
└── tripType

ratings/{orderId}/
├── orderId, driverId, customerId
├── overall (1-5), comment, tip
└── timestamp

sos/{code}/
├── code, driverUid, driverName, phone, plate
├── lat, lng, createdAt, status
├── lastUpdate (live location)
├── audio (base64, 2 phút)
└── timestamps (cancelledAt, safeAt, endedAt)

emergencies/{code}/
├── code, customerId, customerPhone, customerName
├── orderId, lat, lng, timestamp, status
├── source (xeghep / khachhang)
├── audio (base64, 30s)
└── timestamps (lastUpdate, endedAt)

shared_rides/{rideId}/
├── driverId, driverName, phone
├── pickup, dropoff, route, departureTime
├── vehicle, price, seats, status
└── timestamp, source

shared_ride_bookings/{bookingId}/
├── rideId, customerId, customerName, customerPhone
├── driverId, driverName, driverPhone
├── route, departureTime, seats, price, totalPrice
├── bookingCode, status, timestamp
├── paymentMethod, paymentStatus
├── pickup/dropoff (lat, lng)
├── cancelledAt, cancellationFee
└── rating/ (score, comment, timestamp)

chat/{orderId}/{messageId}/
├── sender, from, senderName, text
└── timestamp

chat/{orderId}_typing/
├── driver (boolean)
└── customer (boolean)

chat_xg/{bookingId}/{messageId}/
├── sender, senderName, text
└── timestamp

chat_xg/{bookingId}_typing/
├── driver (boolean)
└── customer (boolean)

tai_xe_online/{driverUid}/
├── lat, lng, heading, speed, accuracy
├── timestamp, online, name

customer_requests/{requestId}/
├── customerId, customerName, customerPhone
├── pickup, dropoff, route, departureTime
├── seats, price, estimatedPrice, status
├── timestamp, source
├── pickup/dropoff (lat, lng)
└── promoCode

promos/{code}/
├── code, discount, active
├── expiresAt, createdAt
```

### 3.2 Database Rules (hiện tại)
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ Chưa có security rules** — cần implement Firebase Rules với authentication checks.

---

## 4. MODULE SYSTEM

### 4.1 Danh sách Modules (13 modules)

| Module | Tên | Chức năng | Firebase nodes |
|---|---|---|---|
| A | FULL AUTH v1 | Đăng nhập/đăng ký/quên MK + passwordHash | `drivers/`, `customers/` |
| B | I18N v1 | Đa ngôn ngữ VI/EN + MutationObserver | - |
| C | CLEAN FIX v4 | GPS + Menu + AI Heatmap | `tai_xe_online/` |
| D | KYC v1 | Xác thực CCCD + bằng lái + selfie | `drivers/{uid}/documents/` |
| E | LEGAL v1 | Chính sách bảo mật + Điều khoản | - |
| F | EV v1 | Trạm sạc + Báo pin + Eco score | `drivers/{uid}/battery/` |
| G | WALLET v1 | Ví tiền + Gói cước SaaS | `drivers/{uid}/wallet/transactions/` |
| H | RECEIPT v1 | Hóa đơn điện tử link công khai | `receipts/` |
| I | SOS v1 | Ghi âm + Live location + Admin giám sát | `sos/`, `emergencies/` |
| J | CUSTOMER ENHANCEMENTS | Auth + Legal + Receipt + SOS cho khách | `customers/`, `emergencies/`, `receipts/` |
| K | XE GHEP ENHANCEMENTS | PWA + Legal + SOS + Receipt + i18n cho xe ghép | `shared_rides/`, `shared_ride_bookings/` |
| - | PREMIUM UI v1 | Tab xịn + Hộp thoại đẹp | - |
| - | PWA BOOT v1 | Service Worker registration | - |

### 4.2 Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    index.html (App Tài Xế)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Code gốc (nhận đơn, tính cước, chat, rating...)     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MODULE A: FULL AUTH v1 (IIFE)                       │  │
│  │  - hashPassword(), doLogin(), doRegister()           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MODULE B: I18N v1 (IIFE)                            │  │
│  │  - Từ điển VI/EN, MutationObserver                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MODULE C: CLEAN FIX v4 (IIFE)                       │  │
│  │  - GPS fix, menu fix, AI heatmap                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ... (các module D-K) ...                                   │
│                                                              │
│  </body>                                                     │
└─────────────────────────────────────────────────────────────┘
```

**Quy tắc:**
- Mỗi module là 1 IIFE (Immediately Invoked Function Expression)
- Dán TRƯỚC `</body>` — KHÔNG sửa code gốc
- Defensive coding: kiểm tra `typeof` trước khi gọi hàm global
- Chống trùng lặp: kiểm tra `dataset` hoặc `id` trước khi tạo
- Override an toàn: monkey-patch `window.xxx` khi cần

---

## 5. DATA FLOWS

### 5.1 Booking Flow (Đặt xe thường)

```
┌──────────┐
│  Khách   │
└────┬─────┘
     │ 1. Chọn điểm đón/đến
     │ 2. Chọn loại xe
     │ 3. Bấm "Đặt xe"
     ▼
┌──────────────────┐
│  khachhang.html  │
│  - Tính giá OSRM │
│  - Tạo order     │
└────┬─────────────┘
     │ 4. Write to datxe/{orderId}
     │    status: 'waiting'
     ▼
┌──────────────────┐
│ Firebase datxe/  │
│  (realtime)      │
└────┬─────────────┘
     │ 5. child_added event
     ▼
┌──────────────────┐
│   index.html     │
│ (App Tài Xế)     │
│ - Filter: radius │
│ - Show modal     │
└────┬─────────────┘
     │ 6. Tài xế bấm "Nhận"
     │ 7. Update status: 'driving'
     │    + driverId/name/phone
     ▼
┌──────────────────┐
│ Firebase datxe/  │
│  (realtime)      │
└────┬─────────────┘
     │ 8. value event
     ▼
┌──────────────────┐
│  khachhang.html  │
│ - Hiện info tài  │
│   xế             │
│ - Track location │
└────┬─────────────┘
     │ 9. Tài xế đón khách
     │ 10. Update status: 'picked_up'
     │ 11. Chạy chuyến (GPS tracking)
     │ 12. Update status: 'in_progress'
     ▼
┌──────────────────┐
│   index.html     │
│ - Bấm "Kết thúc" │
│ - Update status: │
│   'completed'    │
│ - Tạo receipt    │
└────┬─────────────┘
     │ 13. value event
     ▼
┌──────────────────┐
│  khachhang.html  │
│ - Hiện "Hoàn     │
│   thành"         │
│ - Rating modal   │
└──────────────────┘
```

---

### 5.2 Xe Ghép Flow

```
┌──────────┐
│ Tài xế   │
└────┬─────┘
     │ 1. Đăng chuyến
     │    (pickup, dropoff, time, price, seats)
     ▼
┌──────────────────┐
│   index.html     │
│ (openXeGhepModule│
│  publishXGRide)  │
└────┬─────────────┘
     │ 2. Write to shared_rides/{rideId}
     │    status: 'active'
     ▼
┌──────────────────┐
│Firebase          │
│shared_rides/     │
└────┬─────────────┘
     │ 3. Khách tìm chuyến
     │    (filter pickup/dropoff)
     │ 4. AI Match (chấm điểm)
     ▼
┌──────────────────┐
│  xeghep.html     │
│ - Hiện danh sách │
│ - Khách bấm      │
│   "Đặt ghế"      │
└────┬─────────────┘
     │ 5. Write to shared_ride_bookings/{bookingId}
     │    status: 'waiting'
     ▼
┌──────────────────┐
│Firebase          │
│shared_ride_      │
│bookings/         │
└────┬─────────────┘
     │ 6. Tài xế nhận booking
     │ 7. Update status: 'accepted'
     ▼
┌──────────────────┐
│  xeghep.html     │
│ - Chat           │
│ - Timeline       │
│ - QR code vé     │
│ - Tracking       │
└────┬─────────────┘
     │ 8. Chuyến hoàn thành
     │ 9. Update status: 'completed'
     ▼
┌──────────────────┐
│  xeghep.html     │
│ - Rating modal   │
└──────────────────┘
```

---

### 5.3 SOS Flow (Tài xế)

```
┌──────────┐
│ Tài xế   │
└────┬─────┘
     │ 1. Bấm SOS
     ▼
┌──────────────────┐
│   index.html     │
│ (triggerSOS)     │
└────┬─────────────┘
     │ 2. Write to sos/{code}
     │    status: 'active'
     │ 3. Start MediaRecorder (2 phút)
     │ 4. Start live location (5s/10 phút)
     ▼
┌──────────────────┐
│ Firebase sos/    │
│  (realtime)      │
└────┬─────────────┘
     │ 5. Admin nhận notification
     ▼
┌──────────────────┐
│   admin.html     │
│ - Hiện SOS       │
│ - Xem bản đồ     │
│ - Nghe ghi âm    │
│ - Gọi tài xế     │
└────┬─────────────┘
     │ 6. Admin bấm "Đánh dấu an toàn"
     │ 7. Update status: 'safe'
     ▼
┌──────────────────┐
│ Firebase sos/    │
│  (realtime)      │
└────┬─────────────┘
     │ 8. value event
     ▼
┌──────────────────┐
│   index.html     │
│ - Hiện "An toàn" │
└──────────────────┘
```

---

### 5.4 Payment Flow (SaaS)

```
┌──────────┐
│ Tài xế   │
└────┬─────┘
     │ 1. Chọn gói (99k/249k/799k)
     ▼
┌──────────────────┐
│   index.html     │
│ (openWallet)     │
│ - Hiện QR code   │
│ - Thông tin bank │
└────┬─────────────┘
     │ 2. Quét QR + chuyển khoản
     │ 3. Bấm "Đã chuyển khoản"
     ▼
┌──────────────────┐
│   index.html     │
│ - Write to       │
│   drivers/{uid}/ │
│   wallet/        │
│   transactions/  │
│   {tid}          │
│   status:'pending│
└────┬─────────────┘
     │ 4. value event
     ▼
┌──────────────────┐
│   admin.html     │
│ - Hiện giao dịch │
│   pending        │
└────┬─────────────┘
     │ 5. Admin kiểm tra bank
     │ 6. Bấm "Duyệt"
     │ 7. Update status: 'paid'
     │ 8. Update tp_expiry
     │    (+30/90/365 ngày)
     ▼
┌──────────────────┐
│ Firebase         │
│ drivers/{uid}/   │
│  wallet/         │
│  transactions/   │
└────┬─────────────┘
     │ 9. value event
     ▼
┌──────────────────┐
│   index.html     │
│ - Hiện "Đã duyệt│
│ - Gia hạn gói    │
└──────────────────┘
```

---

## 6. EXTERNAL APIs

### 6.1 Map & Location

| API | Purpose | Endpoint | Rate Limit |
|---|---|---|---|
| **Leaflet** | Map rendering | CDN | Unlimited |
| **OpenStreetMap tiles** | Map tiles | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | 2 req/sec |
| **Nominatim** | Geocoding (address → lat/lng) | `https://nominatim.openstreetmap.org/search` | 1 req/sec |
| **OSRM** | Routing (tính đường đi) | `https://router.project-osrm.org/route/v1/driving/` | Unlimited |
| **CartoDB tiles** | Map tiles (alternative) | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png` | Unlimited |

### 6.2 Weather & POI

| API | Purpose | Endpoint | Rate Limit |
|---|---|---|---|
| **Open-Meteo** | Weather data | `https://api.open-meteo.com/v1/forecast` | Unlimited |
| **Overpass API** | POI query (EV charging stations) | `https://overpass-api.de/api/interpreter` | 10 req/min |

### 6.3 QR & Icons

| API | Purpose | Endpoint | Rate Limit |
|---|---|---|---|
| **api.qrserver.com** | QR code generation | `https://api.qrserver.com/v1/create-qr-code/` | Unlimited |
| **placehold.co** | Placeholder icons | `https://placehold.co/` | Unlimited |
| **Font Awesome** | Icons | CDN | Unlimited |
| **Google Fonts** | Fonts (Inter, Plus Jakarta Sans) | CDN | Unlimited |

---

## 7. PWA ARCHITECTURE

### 7.1 Service Worker v4.0

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Worker v4.0                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  INSTALL                                                │ │
│  │  - Cache core assets (4 HTML files, manifest, SDK)     │ │
│  │  - Cache CDN resources (Leaflet, Font Awesome, fonts)  │ │
│  │  - skipWaiting()                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ACTIVATE                                               │ │
│  │  - Delete old caches (taxi-promax-v1, v2, v3)         │ │
│  │  - clients.claim()                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FETCH (Network First Strategy)                         │ │
│  │  - Try network first                                   │ │
│  │  - If success: update cache + return response          │ │
│  │  - If fail: return from cache                          │ │
│  │  - Exclude: Firebase, PayOS, QR API, Nominatim, OSRM  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PUSH NOTIFICATION                                      │ │
│  │  - Handle push events                                  │ │
│  │  - Show notifications                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  BACKGROUND SYNC                                        │ │
│  │  - Sync pending trips when back online                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Manifest.json

```json
{
  "name": "TAXI PROMAX ĐIỀU HÀNH",
  "short_name": "Taxi ProMax",
  "description": "Nền tảng gọi xe chuyên nghiệp",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#040a08",
  "theme_color": "#00bfa5",
  "icons": [
    { "src": "assets/logo.png", "sizes": "192x192", "purpose": "any" },
    { "src": "assets/logo.png", "sizes": "512x512", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "App Tài Xế", "url": "/index.html" },
    { "name": "App Khách Hàng", "url": "/khachhang.html" },
    { "name": "Xe Ghép", "url": "/xeghep.html" }
  ],
  "categories": ["travel", "navigation", "transportation"],
  "lang": "vi"
}
```

---

## 8. SECURITY & COMPLIANCE

### 8.1 Authentication

**Custom auth (KHÔNG Firebase Auth):**
```javascript
function hashPassword(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return 'h' + Math.abs(h).toString(36) + '_' + str.length;
}
```

**Flow:**
1. Register: tạo `drivers/{uid}` hoặc `customers/{uid}` với `passwordHash`
2. Login: quét theo phone, so hash(password + phone) hoặc hash(password)
3. Session: lưu `driverInfo` hoặc `customerInfo` vào localStorage
4. Logout: xóa localStorage + reload

**⚠️ Chưa có:**
- JWT authentication
- 2FA (two-factor authentication)
- Rate limiting
- Firebase Rules (hiện tại `.read: true, .write: true`)

---

### 8.2 KYC (Know Your Customer)

**Flow:**
1. Tài xế chụp CCCD (trước/sau) + bằng lái + selfie
2. Nén ảnh canvas (max 800px, JPEG 0.7)
3. Upload base64 vào `drivers/{uid}/documents/`
4. Admin duyệt → badge ✅

**Firebase node:**
```
drivers/{uid}/documents/
├── front: base64
├── back: base64
├── license: base64
├── selfie: base64
├── status: "pending" | "approved" | "rejected"
├── submittedAt: timestamp
├── decidedAt: timestamp
└── rejectReason: string?
```

---

### 8.3 Legal Compliance

**Bắt buộc cho CH Play:**
- ✅ Chính sách bảo mật (theo NĐ 13/2023/NĐ-CP)
- ✅ Điều khoản sử dụng
- ✅ Link công khai: `?legal=privacy`, `?legal=terms`
- ✅ Data Safety form (khai báo dữ liệu thu thập)
- ✅ Demo account cho Google review

**Mô hình SaaS (lá chắn pháp lý):**
- App là **phần mềm kết nối**, không phải vận tải
- Không thu % chuyến đi
- Không thu tiền từ khách
- Chỉ thu phí thuê bao từ tài xế (99k/tháng)

---

## 9. DEPLOYMENT ARCHITECTURE

### 9.1 Production Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│  https://github.com/nguyenxuandat20091985-rgb/taxi-promax   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Git push
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  - Auto-deploy từ GitHub                                    │
│  - CDN toàn cầu                                             │
│  - HTTPS                                                    │
│  - URL: https://taxi-promax.vercel.app                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Realtime DB                      │
│  - Region: asia-southeast1 (Singapore)                      │
│  - URL: https://taxipromax-new-default-rtdb.asia-          │
│         southeast1.firebasedatabase.app                     │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 CI/CD Pipeline

```
Developer push code
       ↓
GitHub Actions (future)
       ↓
Vercel auto-deploy
       ↓
Production live (30s)
```

---

## 10. FUTURE ARCHITECTURE (Q3/2026+)

### 10.1 Cloud Functions Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Functions Layer                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  autoDispatch()                                         │ │
│  │  - Trigger: datxe/ child_added                          │ │
│  │  - Logic: tìm tài xế gần nhất (geo query)              │ │
│  │  - Assign: update driverId                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  paymentWebhook()                                       │ │
│  │  - Trigger: PayOS webhook                               │ │
│  │  - Logic: verify signature, update transaction          │ │
│  │  - Extend: tp_expiry                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  sendPushNotification()                                 │ │
│  │  - Trigger: datxe/ child_changed                        │ │
│  │  - Logic: FCM push to driver/customer                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  fakeGpsDetection()                                     │ │
│  │  - Trigger: tai_xe_online/ child_changed                │ │
│  │  - Logic: validate speed, distance, accuracy            │ │
│  │  - Action: flag suspicious drivers                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Firebase Rules (Security)

```json
{
  "rules": {
    "drivers": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('admin').val() === auth.uid",
        ".write": "auth.uid === $uid || root.child('admin').val() === auth.uid",
        "documents": {
          ".read": "auth.uid === $uid || root.child('admin').val() === auth.uid",
          ".write": "auth.uid === $uid"
        },
        "wallet": {
          "transactions": {
            "$tid": {
              ".read": "auth.uid === $uid || root.child('admin').val() === auth.uid",
              ".write": "auth.uid === $uid"
            }
          }
        }
      }
    },
    "datxe": {
      "$orderId": {
        ".read": true,
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['status', 'pickup', 'dropoff'])"
      }
    },
    "sos": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 11. PERFORMANCE OPTIMIZATION

### 11.1 Current Optimizations

| Optimization | Implementation | Impact |
|---|---|---|
| **Realtime listener** | `on('child_added')` thay vì polling | Giảm Firebase reads 90% |
| **Client-side filter** | Radius, carType filter trước khi show modal | Giảm UI lag |
| **Processed orders Set** | Tránh duplicate processing | Giảm CPU usage |
| **Image compression** | Canvas max 800px, JPEG 0.7 | Giảm storage 70% |
| **Service Worker cache** | Network First strategy | Offline support, giảm latency |
| **localStorage cache** | Cache dữ liệu ít thay đổi | Giảm Firebase reads |

### 11.2 Future Optimizations

| Optimization | Implementation | Expected Impact |
|---|---|---|
| **Cloud Functions** | Server-side matching | Giảm client CPU 50% |
| **Firebase indexes** | Add indexes trên `status`, `timestamp` | Tăng query speed 10x |
| **CDN** | Cloudflare cho static assets | Giảm latency 60% |
| **Image CDN** | Cloudinary cho ảnh KYC | Giảm storage 80% |
| **Queue processing** | BullMQ cho background jobs | Tăng throughput 5x |

---

## 12. MONITORING & LOGGING

### 12.1 Current Monitoring

**Client-side:**
- `console.log()` cho debugging
- `console.error()` cho errors
- Toast notifications cho user feedback

**Firebase:**
- Firebase Console → Database → Realtime viewer
- Firebase Console → Analytics (basic)

### 12.2 Future Monitoring

**Server-side (Cloud Functions):**
```javascript
// Error logging
functions.logger.error('Error in autoDispatch', error);

// Performance logging
functions.logger.info('autoDispatch latency', { latency: Date.now() - start });

// Security logging
functions.logger.warn('Suspicious GPS pattern', { driverId, speed, accuracy });
```

**External tools:**
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Firebase Crashlytics**: Crash reporting
- **Google Analytics**: User behavior

---

## 13. SCALABILITY ROADMAP

### 13.1 Current Limits

| Resource | Current Limit | Bottleneck |
|---|---|---|
| **Firebase RTDB** | 200k concurrent connections | Database size |
| **Vercel** | 100GB bandwidth/month | CDN |
| **Client-side matching** | 1000 drivers online | CPU usage |
| **Image storage** | 10GB Firebase storage | KYC images |

### 13.2 Scaling Strategy

**Phase 1 (Q3/2026): 1000 drivers**
- ✅ Client-side matching (hiện tại)
- ✅ Firebase RTDB (hiện tại)
- ✅ Vercel CDN (hiện tại)

**Phase 2 (Q4/2026): 5000 drivers**
- ⏳ Cloud Functions (server-side matching)
- ⏳ Firebase indexes
- ⏳ Image CDN (Cloudinary)

**Phase 3 (2027): 10000 drivers**
- ⏳ Firestore (thay RTDB)
- ⏳ Multi-region deployment
- ⏳ Queue processing (BullMQ)
- ⏳ Kubernetes (nếu cần)

---

## 14. DISASTER RECOVERY

### 14.1 Backup Strategy

**Firebase Database:**
- **Daily backup**: Firebase Console → Database → Export
- **Weekly backup**: Automated script → Google Cloud Storage
- **Monthly backup**: Download + store offline

**Code:**
- **GitHub**: Version control (đã có)
- **Local backup**: Clone repo weekly

**Images (KYC):**
- **Firebase Storage**: Primary storage
- **Google Cloud Storage**: Backup (future)

### 14.2 Recovery Plan

**Scenario 1: Firebase data corruption**
1. Stop all writes
2. Restore từ daily backup
3. Replay transactions từ logs
4. Verify data integrity

**Scenario 2: Vercel downtime**
1. Switch to backup hosting (Netlify)
2. Update DNS
3. Monitor recovery

**Scenario 3: Code bug**
1. Revert to previous commit
2. Deploy hotfix
3. Notify users

---

## 15. CONCLUSION

### 15.1 Architecture Strengths

- ✅ **Simple**: Single-file HTML, không có backend phức tạp
- ✅ **Realtime**: Firebase RTDB cho sync tức thì
- ✅ **PWA**: Offline support, installable
- ✅ **Modular**: 13 modules độc lập, dễ maintain
- ✅ **Scalable**: Có thể scale đến 1000 drivers với kiến trúc hiện tại

### 15.2 Architecture Weaknesses

- ⚠️ **Security**: Firebase Rules chưa implement
- ⚠️ **Authentication**: Custom auth, không có JWT/2FA
- ⚠️ **Matching**: Client-side, không tối ưu cho scale lớn
- ⚠️ **Monitoring**: Thiếu centralized logging
- ⚠️ **Testing**: Không có unit/integration tests

### 15.3 Next Steps

**Q3/2026:**
1. Implement Firebase Rules
2. Add Cloud Functions cho auto dispatch
3. Integrate PayOS webhook
4. Setup Sentry cho error tracking

**Q4/2026:**
1. Migrate to Firestore (nếu cần)
2. Add fake GPS detection
3. Implement withdrawal feature
4. Expand i18n (Trung/Hàn/Nhật)

**2027:**
1. Multi-city expansion
2. Advanced analytics dashboard
3. Unit/E2E tests
4. CDN optimization

---

*System Architecture cập nhật lần cuối: 06/08/2026 — NGUYỄN XUÂN ĐẠT*
```

