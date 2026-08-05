# TAXI PROMAX — SYSTEM ARCHITECTURE V2.0
**Cập nhật: 06/08/2026 — Phản ánh 100% kiến trúc thực tế**

---

## 1. TỔNG QUAN KIẾN TRÚC

### Mô hình: Client-Side Heavy Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE (Browser/PWA)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ App Tài Xế   │  │ App Khách    │  │ App Xe Ghép  │       │
│  │ index.html   │  │ khachhang    │  │ xeghep.html  │       │
│  │              │  │ .html        │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Admin        │  │ Service      │  │ Manifest     │       │
│  │ admin.html   │  │ Worker v4.0  │  │ .json        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              FIREBASE REALTIME DATABASE                       │
├─────────────────────────────────────────────────────────────┤
│  drivers/  customers/  datxe/  trips/  receipts/  ratings/  │
│  sos/  emergencies/  shared_rides/  chat/  tai_xe_online/   │
└─────────────────────────────────────────────────────────────┘
```

### Đặc điểm kiến trúc
- **NO Backend Server**: Không có Cloud Functions, không có Vercel Functions
- **Client-Side Heavy**: Tất cả logic xử lý trên browser
- **Realtime Listener**: Firebase `on('child_added')` thay vì polling
- **PWA Native**: Service Worker + Manifest + Offline fallback

---

## 2. COMPONENTS CHÍNH

### 2.1 Frontend Apps (Single-file HTML)

| App | File | Chức năng chính |
|---|---|---|
| **App Tài Xế** | `index.html` | Nhận đơn, GPS, SOS, KYC, Wallet, Receipt |
| **App Khách Hàng** | `khachhang.html` | Đặt xe, theo dõi, chat, SOS, đánh giá |
| **App Xe Ghép** | `xeghep.html` | Đăng/tìm chuyến, đặt ghế, QR vé |
| **Admin Dashboard** | `admin.html` | Quản lý tài xế, duyệt KYC/TT, giám sát SOS |

### 2.2 Firebase Database Nodes (15 nodes)

```
Firebase Realtime Database
│
├── drivers/                    → Hồ sơ tài xế + KYC + wallet
│   └── {driverUid}/
│       ├── profile (name, phone, plate...)
│       ├── documents/ (KYC: CCCD, bằng lái, selfie)
│       ├── wallet/transactions/ (gói cước)
│       └── battery/ (EV module)
│
├── customers/                  → Hồ sơ khách hàng
│   └── {customerUid}/
│       └── profile (name, phone)
│
├── datxe/                      → Đơn đặt xe (KHÔNG dùng /orders/)
│   └── {orderId}/
│       ├── status: 'waiting' | 'driving' | 'completed'
│       ├── pickup/dropoff (lat, lng, address)
│       ├── driverId, driverName, driverPhone
│       └── estimateKm, estimatePrice
│
├── trips/                      → Lịch sử chuyến của tài xế
│   └── {driverUid}/{tripId}/
│       └── km, cost, timestamp, tripType
│
├── receipts/                   → Hóa đơn điện tử
│   └── {code}/ (VD: "HDABC123")
│       └── driverName, customerName, km, price
│
├── ratings/                    → Đánh giá sau chuyến
│   └── {orderId}/
│       └── overall (1-5), comment, tip
│
├── sos/                        → Báo động SOS tài xế
│   └── {code}/
│       ├── status: 'active' | 'safe' | 'ended'
│       ├── lat, lng (live mỗi 5s)
│       └── audio (base64 ghi âm 2 phút)
│
├── emergencies/                → Báo động SOS khách
│   └── {code}/
│       └── tương tự sos/ nhưng 30s ghi âm
│
├── shared_rides/               → Chuyến xe ghép (tài xế đăng)
│   └── {rideId}/
│       └── route, seats, price, departureTime
│
├── shared_ride_bookings/       → Đặt ghế xe ghép
│   └── {bookingId}/
│       └── rideId, customerId, status, bookingCode
│
├── chat/                       → Chat driver ↔ customer
│   └── {orderId}/
│       └── {messageId}/ (sender, text, timestamp)
│
├── chat_xg/                    → Chat xe ghép
│   └── {bookingId}/
│       └── tương tự chat/
│
├── tai_xe_online/              → Vị trí realtime tài xế
│   └── {driverUid}/
│       └── lat, lng, timestamp (update mỗi 5-10s)
│
├── customer_requests/          → Yêu cầu đặt xe từ khách
│   └── {requestId}/
│       └── pickup, dropoff, seats, status
│
└── promos/                     → Mã giảm giá
    └── {code}/
        └── discount, active, expiresAt
```

### 2.3 Module System (15 modules)

```
MODULE A: FULL AUTH v1
├── hashPassword() → Java-style hash
├── doLogin() → quét drivers/ theo phone
├── doRegister() → tạo DRV_ + base36
└── doForgotPassword() → xác minh CCCD/biển số

MODULE B: I18N v1
├── Từ điển VI→EN (50+ pairs)
├── MutationObserver dịch DOM
└── localStorage: promax_lang

MODULE C: CLEAN FIX v4
├── fixGpsTick() → LUÔN vẽ marker
├── toggleFollow() → bật/tắt panTo
└── AI Heatmap → HOTSPOTS HN/HCM

MODULE D: KYC v1
├── openKYC() → 4 ô chụp ảnh
├── compressImage() → canvas max 800px
└── openKYCAdmin() → duyệt hồ sơ

MODULE E: LEGAL v1
├── openLegal('privacy'|'terms')
└── URL: ?legal=privacy / ?legal=terms

MODULE F: EV v1
├── findStations() → Overpass API
├── evSaveBatt() → lưu Firebase
└── startEco() → trừ điểm phanh gấp

MODULE G: WALLET v1
├── openWallet() → 3 gói SaaS
├── confirmPaid() → tạo transaction
└── wmApprove() → admin duyệt + gia hạn

MODULE H: RECEIPT v1
├── createReceipt() → monkey-patch completeTrip
├── showReceipt() → giấy biên lai
└── URL: ?receipt={code}

MODULE I: SOS v1
├── triggerSOS() → ghi âm 2 phút + live 10 phút
├── openSOSAdmin() → giám sát
└── playSOSAudio() → nghe lại

MODULE J-K: ENHANCEMENTS
├── Customer App: Auth + Legal + Receipt + SOS
└── Xe Ghép App: PWA + Legal + SOS + Receipt + i18n

UTILITY MODULES:
├── PREMIUM UI v1 → Tab xịn + hộp thoại đẹp
├── PWA BOOT v1 → Register Service Worker
├── MENU MOVE v2 → Đưa nút vào sidebar
└── MENU RESTYLE v1 → Khôi phục menu đẹp
```

---

## 3. DATA FLOWS CHI TIẾT

### 3.1 Flow: Khách đặt xe → Tài xế nhận đơn

```
┌─────────────┐
│ App Khách   │
│ khachhang   │
│ .html       │
└──────┬──────┘
       │ 1. bookRide()
       │    - Thu thập: pickup, dropoff, carType
       │    - Tính giá: OSRM API → estimateKm × rate
       │
       │ 2. Firebase push
       │    db.ref('datxe').push(orderData)
       │
       ▼
┌─────────────────────────────────────┐
│ Firebase: datxe/{orderId}           │
│ status: 'waiting'                   │
│ pickup: {lat, lng, address}         │
│ dropoff: {lat, lng, address}        │
│ carType: '4_seats'                  │
│ estimateKm: 5.2                     │
│ estimatePrice: 78000                │
│ timestamp: 1723048800000            │
└──────────────────┬──────────────────┘
                   │
                   │ 3. Realtime listener
                   │    db.ref('datxe')
                   │      .on('child_added')
                   │
                   ▼
┌─────────────────────────────────────┐
│ App Tài Xế (nhiều người)            │
│ index.html                          │
│                                     │
│ startOrderListener()                │
│   - Filter: carType match           │
│   - Filter: radius < 10km           │
│   - Filter: chưa xử lý              │
│                                     │
│ showOrderModal(orderId)             │
│   - Hiện modal với thông tin        │
│   - Countdown 15 giây               │
│   - Nút "Nhận" / "Bỏ qua"           │
└──────────┬──────────────────────────┘
           │
           │ 4. Tài xế bấm "Nhận"
           │    acceptOrder()
           │
           │ 5. Firebase update
           │    db.ref('datxe/{orderId}').update({
           │      status: 'driving',
           │      driverId: 'DRV_ABC',
           │      driverName: 'Nguyễn Văn A',
           │      driverPhone: '0388724966',
           │      driverPlate: '14H 06321',
           │      acceptedAt: Date.now()
           │    })
           │
           ▼
┌─────────────────────────────────────┐
│ Firebase: datxe/{orderId}           │
│ status: 'driving'                   │
│ driverId: 'DRV_ABC'                 │
│ driverName: 'Nguyễn Văn A'          │
│ driverPhone: '0388724966'           │
│ driverPlate: '14H 06321'            │
│ acceptedAt: 1723048860000           │
└──────────────────┬──────────────────┘
                   │
                   │ 6. Realtime listener (App Khách)
                   │    db.ref('datxe/{orderId}')
                   │      .on('value')
                   │
                   ▼
┌─────────────────────────────────────┐
│ App Khách                           │
│                                     │
│ listenToOrder(orderId)              │
│   - Phát hiện status = 'driving'    │
│   - Hiện thông tin tài xế           │
│   - trackDriverLocation()           │
│   - Vẽ marker tài xế trên map       │
│                                     │
│ showBookingScreen('screenDriving')  │
└─────────────────────────────────────┘
```

### 3.2 Flow: Tài xế hoàn thành chuyến → Hóa đơn + Đánh giá

```
┌─────────────┐
│ App Tài Xế  │
│ index.html  │
└──────┬──────┘
       │
       │ 1. Tài xế bấm "Kết thúc chuyến"
       │    completeTrip()
       │
       │ 2. Tính toán
       │    finalKm = totalKm
       │    finalCost = finalKm × currentRate
       │
       │ 3. Firebase update
       │    db.ref('datxe/{orderId}').update({
       │      status: 'completed',
       │      completedAt: Date.now(),
       │      actualKm: 5.2,
       │      actualPrice: 78000
       │    })
       │
       │ 4. Lưu lịch sử
       │    db.ref('trips/{driverUid}/{tripId}').set({
       │      km: 5.2,
       │      cost: 78000,
       │      timestamp: Date.now(),
       │      tripType: 'APP_BOOKING'
       │    })
       │
       │ 5. Monkey-patch: createReceipt()
       │    code = 'HD' + base36(Date.now())
       │    db.ref('receipts/' + code).set({
       │      code: code,
       │      driverName: 'Nguyễn Văn A',
       │      customerName: 'Trần Thị B',
       │      pickup: 'Hà Nội',
       │      dropoff: 'Hải Phòng',
       │      km: 5.2,
       │      price: 78000,
       │      createdAt: Date.now()
       │    })
       │
       │ 6. Hiện modal đánh giá (App Khách)
       │    showRatingModal()
       │
       ▼
┌─────────────────────────────────────┐
│ App Khách                           │
│                                     │
│ ratingModal mở                      │
│   - 5 sao rating                    │
│   - Comment text                    │
│   - Tip (10k/20k/50k)               │
│                                     │
│ submitRating()                      │
│   db.ref('ratings/{orderId}').set({ │
│     overall: 5,                     │
│     comment: 'Tài xế rất tốt',      │
│     tip: 20000,                     │
│     timestamp: Date.now()           │
│   })                                │
└─────────────────────────────────────┘
```

### 3.3 Flow: SOS khẩn cấp (tài xế)

```
┌─────────────┐
│ App Tài Xế  │
│ index.html  │
└──────┬──────┘
       │
       │ 1. Tài xế bấm "SOS cứu hộ"
       │    triggerSOS()
       │
       │ 2. Tạo SOS record
       │    code = 'SOS' + base36(Date.now())
       │    db.ref('sos/' + code).set({
       │      code: code,
       │      driverUid: 'DRV_ABC',
       │      driverName: 'Nguyễn Văn A',
       │      phone: '0388724966',
       │      lat: currentLat,
       │      lng: currentLng,
       │      status: 'active',
       │      createdAt: Date.now()
       │    })
       │
       │ 3. Ghi âm 2 phút
       │    navigator.mediaDevices.getUserMedia({audio: true})
       │    new MediaRecorder(stream, {audioBitsPerSecond: 16000})
       │    setTimeout(stop, 120000)
       │    → Lưu base64 vào sos/{code}/audio
       │
       │ 4. Live location mỗi 5s trong 10 phút
       │    setInterval(() => {
       │      db.ref('sos/' + code).update({
       │        lat: currentLat,
       │        lng: currentLng,
       │        lastUpdate: Date.now()
       │      })
       │    }, 5000)
       │    setTimeout(clearInterval, 600000)
       │
       │ 5. Auto call 113 sau 1.5s
       │    setTimeout(() => {
       │      window.location.href = 'tel:113'
       │    }, 1500)
       │
       ▼
┌─────────────────────────────────────┐
│ Admin Dashboard                     │
│ admin.html                          │
│                                     │
│ openSOSAdmin()                      │
│   - Load danh sách SOS              │
│   - Hiển thị:                       │
│     • Tên tài xế                    │
│     • SĐT                           │
│     • Link Google Maps              │
│     • Nút nghe ghi âm               │
│     • Nút đánh dấu an toàn          │
│                                     │
│ playSOSAudio(i)                     │
│   - Phát audio base64               │
│                                     │
│ markSOSSafe(i)                      │
│   db.ref('sos/{code}').update({     │
│     status: 'safe',                 │
│     safeAt: Date.now()              │
│   })                                │
└─────────────────────────────────────┘
```

### 3.4 Flow: Thanh toán gói cước SaaS

```
┌─────────────┐
│ App Tài Xế  │
│ index.html  │
└──────┬──────┘
       │
       │ 1. Tài xế mở "Ví tiền & Gói cước"
       │    openWallet()
       │
       │ 2. Chọn gói
       │    - m1: 99k/30 ngày
       │    - m3: 249k/90 ngày
       │    - m12: 799k/365 ngày
       │
       │ 3. Quét QR chuyển khoản
       │    QR code: api.qrserver.com
       │    Nội dung: "PROMAX {phone}"
       │    Ngân hàng: MB Bank 0388724966
       │
       │ 4. Bấm "Đã chuyển khoản"
       │    confirmPaid()
       │    tid = 'tx_' + Date.now()
       │    db.ref('drivers/{uid}/wallet/transactions/' + tid).set({
       │      plan: 'm3',
       │      planName: '3 tháng',
       │      amount: 249000,
       │      code: 'PROMAX 0388724966',
       │      status: 'pending',
       │      createdAt: Date.now()
       │    })
       │
       ▼
┌─────────────────────────────────────┐
│ Admin Dashboard                     │
│ admin.html                          │
│                                     │
│ loadWallet()                        │
│   - Load transactions pending       │
│   - Hiển thị:                       │
│     • Tên tài xế                    │
│     • Gói đã chọn                   │
│     • Số tiền                       │
│     • Mã giao dịch                  │
│                                     │
│ Admin kiểm tra ngân hàng            │
│   - Mở app MB Bank                  │
│   - Tìm giao dịch với mã            │
│   - Xác nhận đã nhận tiền           │
│                                     │
│ approveWallet(uid, tid)             │
│   db.ref('drivers/' + uid).update({ │
│     'wallet/transactions/' + tid    │
│       + '/status': 'paid',          │
│     'wallet/transactions/' + tid    │
│       + '/approvedAt': Date.now(),  │
│     tp_expiry: Date.now() +         │
│       90*86400000,                  │
│     active_plan: 'PROMAX'           │
│   })                                │
└──────────────────┬──────────────────┘
                   │
                   │ 5. Realtime listener (App Tài Xế)
                   │    db.ref('drivers/{uid}/tp_expiry')
                   │      .on('value')
                   │
                   ▼
┌─────────────────────────────────────┐
│ App Tài Xế                          │
│                                     │
│ initCountdown()                     │
│   - Phát hiện tp_expiry mới         │
│   - Cập nhật UI:                    │
│     • "Gói PROMAX - còn 89 ngày"    │
│     • Unlock nhận đơn               │
│   - Countdown timer                 │
│                                     │
│ Tài xế có thể nhận đơn bình thường │
└─────────────────────────────────────┘
```

---

## 4. KIẾN TRÚC KỸ THUẬT

### 4.1 Tech Stack

```
┌─────────────────────────────────────────┐
│ FRONTEND                                │
├─────────────────────────────────────────┤
│ HTML5 + CSS3 + JavaScript ES6+          │
│ Leaflet.js (maps)                       │
│ Font Awesome 6.4.0 (icons)              │
│ Inter + Plus Jakarta Sans (fonts)       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ PWA LAYER                               │
├─────────────────────────────────────────┤
│ Service Worker v4.0                     │
│   - Network First strategy              │
│   - Cache CDN (OSM, Leaflet, FA)        │
│   - Offline fallback                    │
│                                         │
│ Manifest.json                           │
│   - Icons (192x192, 512x512)            │
│   - Shortcuts (3 apps)                  │
│   - Categories: travel, navigation      │
└─────────────────────────────────────────┘
                    ↕ HTTPS
┌─────────────────────────────────────────┐
│ DATABASE                                │
├─────────────────────────────────────────┤
│ Firebase Realtime Database              │
│   - 15 root nodes                       │
│   - Realtime listeners                  │
│   - Client-side queries                 │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ EXTERNAL APIs                           │
├─────────────────────────────────────────┤
│ Nominatim (geocoding)                   │
│ OSRM (routing)                          │
│ Open-Meteo (weather)                    │
│ Overpass (POI search)                   │
│ api.qrserver.com (QR codes)             │
└─────────────────────────────────────────┘
```

### 4.2 Security Architecture

```
┌─────────────────────────────────────────┐
│ AUTHENTICATION                          │
├─────────────────────────────────────────┤
│ Custom Auth (KHÔNG Firebase Auth)       │
│                                         │
│ hashPassword(str):                      │
│   h = 0                                 │
│   for each char: h = (h<<5) - h + char  │
│   return 'h' + base36(abs(h)) + '_' +   │
│          str.length                     │
│                                         │
│ Login:                                  │
│   - Quét drivers/ theo phone            │
│   - So hash(password + phone)           │
│   - Hoặc hash(password)                 │
│                                         │
│ Session:                                │
│   - localStorage: driverInfo            │
│   - localStorage: customerInfo          │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ DATA PROTECTION                         │
├─────────────────────────────────────────┤
│ Password: hash (không plaintext)        │
│ KYC images: base64 + nén JPEG 0.7       │
│ SOS audio: base64 + nén 16kbps          │
│ Secrets: không hardcode (dùng const)    │
│                                         │
│ Firebase Rules:                         │
│   .read: true                           │
│   .write: true                          │
│   (cần cải thiện trong tương lai)       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ COMPLIANCE                              │
├─────────────────────────────────────────┤
│ NĐ 13/2023/NĐ-CP (bảo vệ dữ liệu)      │
│   - Chính sách bảo mật                  │
│   - Điều khoản sử dụng                  │
│   - Link: ?legal=privacy / ?legal=terms │
│                                         │
│ CH Play Data Safety                     │
│   - Khai báo dữ liệu thu thập           │
│   - Mã hóa khi truyền (HTTPS)           │
│   - Cho phép xóa dữ liệu                │
└─────────────────────────────────────────┘
```

---

## 5. DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────┐
│ DEVELOPMENT                             │
├─────────────────────────────────────────┤
│ Local Machine                           │
│   - Edit HTML files                     │
│   - Test trên localhost                 │
│   - Git commit                          │
└──────────────────┬──────────────────────┘
                   │
                   │ git push
                   │
                   ▼
┌─────────────────────────────────────────┐
│ GITHUB                                  │
├─────────────────────────────────────────┤
│ Repository:                             │
│   nguyenxuandat20091985-rgb/            │
│     taxi-promax                         │
│                                         │
│ Branches:                               │
│   - main (production)                   │
│   - feature/* (development)             │
└──────────────────┬──────────────────────┘
                   │
                   │ Webhook
                   │
                   ▼
┌─────────────────────────────────────────┐
│ VERCEL                                  │
├─────────────────────────────────────────┤
│ Auto-deploy từ GitHub                   │
│                                         │
│ Build:                                  │
│   - Static HTML files                   │
│   - No build process                    │
│                                         │
│ CDN:                                    │
│   - Global edge network                 │
│   - HTTPS enabled                       │
│                                         │
│ Domain:                                 │
│   taxi-promax.vercel.app                │
└──────────────────┬──────────────────────┘
                   │
                   │ Firebase SDK
                   │
                   ▼
┌─────────────────────────────────────────┐
│ FIREBASE                                │
├─────────────────────────────────────────┤
│ Project: taxipromax-new                 │
│ Region: asia-southeast1                 │
│                                         │
│ Database:                               │
│   taxipromax-new-default-rtdb.          │
│     asia-southeast1.firebasedatabase    │
│     .app                                │
│                                         │
│ Realtime sync                           │
│ Client-side queries                     │
└─────────────────────────────────────────┘
```

---

## 6. PERFORMANCE ARCHITECTURE

### 6.1 Firebase Optimization

```
┌─────────────────────────────────────────┐
│ REALTIME LISTENERS                      │
├─────────────────────────────────────────┤
│ ✅ Dùng:                                │
│   db.ref('datxe').on('child_added')     │
│   db.ref('tai_xe_online/{uid}')         │
│     .on('value')                        │
│                                         │
│ ❌ KHÔNG dùng:                          │
│   setInterval(fetch)                    │
│   Polling                               │
│   Geo queries phức tạp                  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ INDEXES                                 │
├─────────────────────────────────────────┤
│ datxe/ → status, timestamp, driverId    │
│ trips/{uid}/ → timestamp                │
│ receipts/ → customerPhone, createdAt    │
│ shared_rides/ → timestamp, status       │
│ sos/ → createdAt, status                │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ LIMIT QUERIES                           │
├─────────────────────────────────────────┤
│ .limitToLast(50) cho history            │
│ .limitToLast(30) cho receipts           │
│ .limitToLast(20) cho SOS                │
└─────────────────────────────────────────┘
```

### 6.2 Client-Side Optimization

```
┌─────────────────────────────────────────┐
│ SERVICE WORKER CACHE                    │
├─────────────────────────────────────────┤
│ Cache CDN:                              │
│   - OSM tiles                           │
│   - Leaflet.js                          │
│   - Font Awesome                        │
│   - Google Fonts                        │
│                                         │
│ Cache App:                              │
│   - index.html                          │
│   - khachhang.html                      │
│   - xeghep.html                         │
│   - admin.html                          │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ LOCALSTORAGE                            │
├─────────────────────────────────────────┤
│ Session:                                │
│   - driverInfo                          │
│   - customerInfo                        │
│                                         │
│ Cache:                                  │
│   - promax_lang (i18n)                  │
│   - promax_battery (EV)                 │
│   - promax_eco (EV score)               │
│   - trip_history                        │
│   - driver_ratings                      │
└─────────────────────────────────────────┘
```

---

## 7. SCALABILITY ARCHITECTURE

### 7.1 Current Limits

```
┌─────────────────────────────────────────┐
│ FIREBASE SPARK PLAN (Free)              │
├─────────────────────────────────────────┤
│ 100 simultaneous connections            │
│ 1 GB storage                            │
│ 10 GB/month transfer                    │
│                                         │
│ Ước tính:                               │
│   100 tài xế online                     │
│   500 khách hàng online                 │
└─────────────────────────────────────────┘
```

### 7.2 Future Scaling (Q3/2026+)

```
┌─────────────────────────────────────────┐
│ FIREBASE BLAZE PLAN (Pay-as-you-go)     │
├─────────────────────────────────────────┤
│ Unlimited connections                   │
│ Unlimited storage                       │
│ Unlimited transfer                      │
│                                         │
│ Mục tiêu:                               │
│   1000 tài xế online                    │
│   5000 khách hàng online                │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ CLOUD FUNCTIONS (tương lai)             │
├─────────────────────────────────────────┤
│ Auto Dispatch:                          │
│   - Server-side matching                │
│   - Tìm tài xế gần nhất                 │
│   - Auto assign đơn                     │
│                                         │
│ Webhook Processing:                     │
│   - PayOS payment confirmation          │
│   - Auto approve transactions           │
│                                         │
│ Background Jobs:                        │
│   - Cleanup old data                    │
│   - Send scheduled notifications        │
└─────────────────────────────────────────┘
```

---

## 8. MODULE DEPENDENCIES

```
┌─────────────────────────────────────────┐
│ CORE MODULES (bắt buộc)                 │
├─────────────────────────────────────────┤
│ A: FULL AUTH v1                         │
│   └── Dùng bởi: tất cả apps            │
│                                         │
│ C: CLEAN FIX v4                         │
│   └── Dùng bởi: index.html             │
│                                         │
│ PWA BOOT v1                             │
│   └── Dùng bởi: tất cả apps            │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ FEATURE MODULES (tùy chọn)              │
├─────────────────────────────────────────┤
│ D: KYC v1                               │
│   └── Dùng bởi: index.html + admin     │
│                                         │
│ G: WALLET v1                            │
│   └── Dùng bởi: index.html + admin     │
│                                         │
│ H: RECEIPT v1                           │
│   └── Dùng bởi: index.html + khachhang │
│                                         │
│ I: SOS v1                               │
│   └── Dùng bởi: tất cả apps + admin    │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ ENHANCEMENT MODULES (app-specific)      │
├─────────────────────────────────────────┤
│ J: CUSTOMER ENHANCEMENTS                │
│   └── Dùng bởi: khachhang.html         │
│                                         │
│ K: XE GHEP ENHANCEMENTS                 │
│   └── Dùng bởi: xeghep.html            │
└─────────────────────────────────────────┘
```

---

## 9. TESTING ARCHITECTURE

### 9.1 Manual Testing Checklist

```
┌─────────────────────────────────────────┐
│ APP TÀI XẾ                              │
├─────────────────────────────────────────┤
│ □ Đăng nhập/đăng ký                     │
│ □ GPS cập nhật vị trí                   │
│ □ Nhận đơn realtime                     │
│ □ Bắt đầu/kết thúc chuyến               │
│ □ Chat với khách                        │
│ □ SOS ghi âm + live location            │
│ □ KYC upload ảnh                        │
│ □ Thanh toán gói + admin duyệt          │
│ □ Hóa đơn điện tử                       │
│ □ Trạm sạc EV                           │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ APP KHÁCH HÀNG                          │
├─────────────────────────────────────────┤
│ □ Đăng nhập/đăng ký                     │
│ □ Đặt xe + tính giá                     │
│ □ Theo dõi tài xế realtime              │
│ □ Chat với tài xế                       │
│ □ Đánh giá sau chuyến                   │
│ □ SOS ghi âm + live location            │
│ □ Xem hóa đơn điện tử                   │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ ADMIN DASHBOARD                         │
├─────────────────────────────────────────┤
│ □ Đăng nhập admin                       │
│ □ Dashboard 8 stat cards                │
│ □ Duyệt KYC (xem ảnh 4 mặt)             │
│ □ Duyệt thanh toán                      │
│ □ Giám sát SOS (bản đồ + nghe ghi âm)   │
│ □ Quản lý tài xế/khách                  │
│ □ Realtime map tài xế online            │
└─────────────────────────────────────────┘
```

### 9.2 Future Testing (Q4/2026+)

```
┌─────────────────────────────────────────┐
│ UNIT TESTS (Jest/Mocha)                 │
├─────────────────────────────────────────┤
│ □ hashPassword()                        │
│ □ calculateDistance()                   │
│ □ compressImage()                       │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ E2E TESTS (Cypress/Playwright)          │
├─────────────────────────────────────────┤
│ □ Flow: đặt xe → nhận đơn → hoàn thành  │
│ □ Flow: thanh toán gói → admin duyệt    │
│ □ Flow: SOS → admin giám sát            │
└─────────────────────────────────────────┘
```

---

## 10. FUTURE ARCHITECTURE (2027+)

```
┌─────────────────────────────────────────┐
│ MICROSERVICES (tương lai xa)            │
├─────────────────────────────────────────┤
│ Auth Service                            │
│   - JWT authentication                  │
│   - OAuth2 integration                  │
│                                         │
│ Order Service                           │
│   - Server-side matching                │
│   - Auto dispatch                       │
│                                         │
│ Payment Service                         │
│   - PayOS integration                   │
│   - MoMo integration                    │
│                                         │
│ Notification Service                    │
│   - FCM push                            │
│   - Email/SMS                           │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│ CLOUD INFRASTRUCTURE                    │
├─────────────────────────────────────────┤
│ Google Cloud Run                        │
│   - Containerized services              │
│   - Auto-scaling                        │
│                                         │
│ Cloud SQL (PostgreSQL)                  │
│   - Relational data                     │
│   - Complex queries                     │
│                                         │
│ Cloud Storage                           │
│   - KYC images                          │
│   - SOS audio recordings                │
│                                         │
│ Cloud CDN                               │
│   - Static assets                       │
│   - Media files                         │
└─────────────────────────────────────────┘
```

---

*System Architecture cập nhật lần cuối: 06/08/2026 — NGUYỄN XUÂN ĐẠT*
