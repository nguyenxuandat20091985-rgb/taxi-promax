# TAXI PROMAX CHANGELOG

Tất cả thay đổi của dự án được ghi lại tại đây theo thứ tự thời gian ngược.

---

# VERSION 1.12.0 — XE GHEP ENHANCEMENTS
**Ngày: 06/08/2026**

## Mục tiêu
Nâng cấp app Xe Ghép với các tính năng còn thiếu so với app tài xế và khách

## File sửa
- `xeghep.html`

## Thay đổi
### Đã thêm
- **PWA Boot**: Register Service Worker v4
- **Legal Links**: Footer auth card → link Chính sách bảo mật & Điều khoản
- **Enhanced SOS**: `triggerCustomerSOS()` với ghi âm 30s MediaRecorder + live location 5 phút + gọi tel:113
- **SOS Button**: Thêm nút 🚨 vào `#trackPanel` khi đang theo dõi chuyến
- **Receipt Link**: Tự động hiển thị link "🧾 Xem hóa đơn điện tử" trong `#rideDetailsContent` nếu có hóa đơn tương ứng
- **I18N nhẹ**: Từ điển VI/EN + MutationObserver dịch nội dung động
- **Nút 🌐**: Chuyển ngôn ngữ trong `.app-header`

### Module liên quan
- MODULE K — XE GHEP ENHANCEMENTS

### Tương thích ngược
YES — chỉ thêm patch, không sửa code gốc

---

# VERSION 1.11.0 — ADMIN DASHBOARD REWRITE
**Ngày: 06/08/2026**

## Mục tiêu
Viết lại `admin.html` thành Admin Dashboard thực sự (file cũ chỉ là copy của app tài xế)

## File sửa
- `admin.html` (thay toàn bộ)

## Thay đổi
### Đã xóa
- Code app tài xế cũ (nút "BẮT ĐẦU CHUYẾN ĐI", `startOrderListener`...)

### Đã thêm
- **Auth**: Đăng nhập admin (SĐT `0388724966` / mật khẩu `admin123`)
- **8 Tabs**:
  1. 📊 Dashboard — 8 stat cards (tài xế, khách, chuyến, doanh thu, pending KYC/TT, SOS, xe ghép) + recent activity
  2. 🔐 Duyệt KYC — Danh sách chờ + ảnh 4 mặt + nút Duyệt/Từ chối + xem ảnh phóng to
  3. 💰 Thanh toán — Giao dịch pending + nút xác nhận (tự gia hạn gói `tp_expiry`)
  4. 🚨 SOS — Danh sách SOS + link bản đồ + gọi tài xế + nghe ghi âm + đánh dấu an toàn
  5. 🚕 Tài xế — Danh sách + search + trạng thái KYC
  6. 👥 Khách hàng — Danh sách khách
  7. 🚐 Xe Ghép — Danh sách chuyến `shared_rides`
  8. 🗺 Bản đồ — Realtime vị trí tài xế online (Leaflet circle markers)
- **Auto refresh**: 30 giây reload dữ liệu
- **Badge realtime**: Đếm số pending KYC/TT/SOS trên tab

### Tương thích ngược
YES — file độc lập, không ảnh hưởng app khác

---

# VERSION 1.10.0 — CUSTOMER APP ENHANCEMENTS
**Ngày: 06/08/2026**

## Mục tiêu
Bổ sung các tính năng còn thiếu cho app Khách Hàng

## File sửa
- `khachhang.html`

## Thay đổi
### Đã thêm
- **PWA Boot**: Register Service Worker v4
- **Auth Module**: `hashPassword()`, `doLogin()`, `doRegister()`, `doForgot()` → tạo `customers/{uid}` với `passwordHash`
- **Legal Links**: Menu sidebar → mở `?legal=privacy` / `?legal=terms`
- **Receipt View**: `openReceipt()` → `loadCustomerReceipts()` từ `receipts/`
- **Enhanced SOS**: `triggerSOSEnhanced()` → ghi âm 30s MediaRecorder + live location mỗi 5s trong 5 phút → `emergencies/{code}`
- **Menu Items**: "Hóa đơn chuyến đi" + Legal links

### Module liên quan
- MODULE J — CUSTOMER APP ENHANCEMENTS

### Tương thích ngược
YES — chỉ thêm patch, override `window.triggerSOS`

---

# VERSION 1.9.0 — PWA FINALIZATION
**Ngày: 06/08/2026**

## Mục tiêu
Hoàn thiện PWA để sẵn sàng đóng gói CH Play

## File sửa
- `index.html` (thêm PWA Boot)
- `manifest.json` (thay toàn bộ)
- `sw.js` (thay toàn bộ v4.0)

## Thay đổi
### index.html
- Thêm **PWA Boot v1**: Register Service Worker + meta tags (theme-color, mobile-web-app-capable)

### manifest.json
- Sửa icon URLs: `assets/logo.png` (404) → icon online placehold.co
- Giữ nguyên: name, short_name, description, start_url, scope, display, orientation
- Giữ: `background_color: #040a08`, `theme_color: #00bfa5`
- Giữ: categories, lang
- Thêm: shortcut "Xe Ghép" → `/xeghep.html`

### sw.js v4.0
- Bỏ: `./styles.css` (file không tồn tại)
- Thêm: `./xeghep.html` vào cache
- Thêm: Font Awesome CDN, CartoDB tile maps
- Thêm exclude: QR API, Open-Meteo, Overpass API
- Sửa: Push notification dùng manifest icon thay vì `assets/logo.png`
- Nâng version cache: `taxi-promax-v3` → `taxi-promax-v4`

### Tương thích ngược
YES — SW tự xóa cache cũ khi activate

---

# VERSION 1.8.0 — SOS NÂNG CẤP
**Ngày: 06/08/2026**

## Mục tiêu
Nâng cấp tính năng SOS với ghi âm khẩn cấp + vị trí trực tiếp

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **`triggerSOS()`**: Override `openSOS` cũ
  - Tạo `sos/{code}` với `status: 'active'`
  - Ghi âm 2 phút MediaRecorder (16kbps, webm) → lưu base64 vào `sos/{code}/audio`
  - Live location mỗi 5s trong 10 phút
  - Nút gọi tel:113
  - `cancelSOS()` — báo động giả
- **Màn hình SOS**: Overlay đỏ toàn màn + đếm ngược ghi âm
- **Admin giám sát** (SĐT `0388724966`):
  - `openSOSAdmin()` — danh sách SOS
  - Link Google Maps vị trí
  - `playSOSAudio(i)` — nghe lại ghi âm
  - `markSOSSafe(i)` — đánh dấu an toàn
- **Menu**: "🚨 Giám sát SOS" (chỉ admin)

### Node Firebase mới
- `sos/{code}` — 12 fields

### Module liên quan
- MODULE I — SOS v1

### Tương thích ngược
YES — override `openSOS`, không phá code cũ

---

# VERSION 1.7.0 — HÓA ĐƠN ĐIỆN TỬ
**Ngày: 06/08/2026**

## Mục tiêu
Tự động tạo hóa đơn điện tử sau mỗi chuyến đi

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **Monkey-patch `window.completeTrip`**: Tự tạo hóa đơn sau mỗi chuyến
- **Code hóa đơn**: `HD` + base36 timestamp
- **Lưu vào `receipts/{code}`**:
  - Driver info (name, phone, plate)
  - Customer name
  - Pickup/dropoff
  - km, price, tripType
  - createdAt
- **URL công khai**: `/?receipt={code}` — xem không cần đăng nhập
- **Modal xem hóa đơn**: Dạng giấy biên lai với:
  - Logo TAXI PROMAX
  - Mã hóa đơn, thời gian, khách, tài xế, biển số
  - Điểm đón/đến, km, thành tiền
  - Disclaimer pháp lý
- **Nút Chia sẻ / Email / Copy**
- **Menu**: "🧾 Hóa đơn chuyến đi" → danh sách hóa đơn tài xế

### Node Firebase mới
- `receipts/{code}` — 11 fields

### Module liên quan
- MODULE H — RECEIPT v1

### Tương thích ngược
YES — monkey-patch, không sửa `completeTrip` gốc

---

# VERSION 1.6.0 — VÍ TIỀN & GÓI CƯỚC
**Ngày: 06/08/2026**

## Mục tiêu
Triển khai mô hình SaaS: thu phí thuê bao từ tài xế

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **3 gói SaaS**:
  - `m1`: 1 tháng — 99.000đ
  - `m3`: 3 tháng — 249.000đ (tiết kiệm 15%)
  - `m12`: 12 tháng — 799.000đ (tiết kiệm 200k)
- **Thanh toán**:
  - QR chuyển khoản (api.qrserver.com)
  - Thông tin MB Bank: `0388724966` / NGUYEN XUAN DAT
  - MoMo: `0388724966`
  - Nút "📋 Sao chép" nội dung chuyển khoản
- **Workflow**:
  1. Tài xế chọn gói → quét QR → chuyển khoản
  2. Bấm "✅ Đã chuyển khoản" → tạo `wallet/transactions/{tid}` với `status: 'pending'`
  3. Admin (SĐT `0388724966`) bấm "Duyệt" → `wmApprove()`:
     - Update `status: 'paid'`
     - Gia hạn `tp_expiry` (+30/90/365 ngày)
     - Set `active_plan: 'PROMAX'`
- **Lịch sử giao dịch**: Hiển thị trong modal
- **Menu**: Override "Ví tiền & Gói cước" → `openWallet()`

### Node Firebase mới
- `drivers/{uid}/wallet/transactions/{tid}` — 9 fields

### Module liên quan
- MODULE G — WALLET v1

### Tương thích ngược
YES — override menu onclick, không phá code cũ

---

# VERSION 1.5.0 — XE ĐIỆN (EV MODULE)
**Ngày: 06/08/2026**

## Mục tiêu
Hỗ trợ tài xế xe điện với trạm sạc + báo pin + điểm Eco

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **Modal "⚡ Xe điện & Trạm sạc"**: `openEV()`
- **Báo pin**:
  - Slider 5-100%
  - Quick buttons (100%, 80%, 50%, 20%)
  - Lưu `localStorage: promax_battery`
  - Lưu Firebase: `drivers/{uid}/battery/{level, updatedAt}`
  - Cảnh báo giọng nói khi ≤30%
- **Tìm trạm sạc**:
  - Overpass API: `node[amenity=charging_station] around 8km`
  - Fallback: Danh sách tĩnh VinFast HN/HCM
  - Hiển thị khoảng cách (haversine)
  - Nút "🧭 Đến" → Google Maps
  - Chấm ⚡ trên bản đồ (Leaflet circleMarker)
- **Điểm Eco** (`localStorage: promax_eco`):
  - Bắt đầu 100 điểm
  - Trừ 2 điểm khi gia tốc |Δv|/Δt > 3 m/s² (phanh gấp/tăng tốc mạnh)
  - Hiển thị trong modal

### Module liên quan
- MODULE F — EV v1

### Tương thích ngược
YES — module độc lập

---

# VERSION 1.4.0 — PHÁP LÝ
**Ngày: 06/08/2026**

## Mục tiêu
Thêm trang Chính sách bảo mật & Điều khoản sử dụng (bắt buộc cho CH Play)

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **Nội dung**:
  - **Chính sách bảo mật**: 10 mục theo NĐ 13/2023/NĐ-CP
    - Giới thiệu, dữ liệu thu thập, mục đích, căn cứ xử lý
    - Lưu trữ & bảo vệ, thời gian lưu trữ, chia sẻ dữ liệu
    - Quyền của bạn, GPS, thay đổi chính sách
  - **Điều khoản sử dụng**: 9 mục
    - Bản chất dịch vụ (nền tảng kết nối, không phải vận tải)
    - Tài khoản tài xế, phí & thanh toán (SaaS 99k/tháng)
    - Nghĩa vụ tài xế/khách, hủy chuyến
    - Giới hạn trách nhiệm, xử lý vi phạm, luật áp dụng
- **Overlay toàn màn**: Scroll mượt, nút đóng, thiết kế đẹp
- **URL công khai**:
  - `/?legal=privacy` → Chính sách bảo mật
  - `/?legal=terms` → Điều khoản
- **Menu**: "🔒 Chính sách bảo mật" + "📜 Điều khoản sử dụng"
- **Link ở màn đăng nhập**: Chữ "Điều khoản" clickable

### Module liên quan
- MODULE E — LEGAL v1

### Tương thích ngược
YES — module độc lập

---

# VERSION 1.3.0 — KYC (XÁC THỰC TÀI XẾ)
**Ngày: 06/08/2026**

## Mục tiêu
Lá chắn pháp lý số 1: xác thực CCCD + bằng lái + ảnh mặt

## File sửa
- `index.html`

## Thay đổi
### Đã thêm
- **Modal tài xế**: `openKYC()`
  - 4 ô chụp ảnh (CCCD trước/sau, bằng lái, selfie)
  - Nén ảnh canvas (max 800px, JPEG 0.7) → base64
  - Upload Firebase: `drivers/{uid}/documents/{front, back, license, selfie, status, submittedAt}`
  - Hiển thị trạng thái: pending / approved / rejected
- **Modal admin** (SĐT `0388724966`): `openKYCAdmin()`
  - Danh sách hồ sơ pending
  - Thumbnail 4 ảnh → click xem phóng to
  - Nút "✅ Duyệt" / "❌ Từ chối" (có lý do)
  - `kycDecide(uid, approve)` → update status
- **Menu**:
  - "🔐 Xác thực tài xế" (mọi tài xế)
  - "🛡️ Duyệt hồ sơ" (chỉ admin)
- **Badge ✅**: Tự động thêm cạnh tên trong sidebar khi approved

### Node Firebase mới
- `drivers/{uid}/documents/` — 8 fields

### Module liên quan
- MODULE D — KYC v1

### Tương thích ngược
YES — module độc lập

---

# VERSION 1.2.0 — PREMIUM UI
**Ngày: 06/08/2026**

## Mục tiêu
Nâng cấp giao diện tab dưới + hộp thoại cho "xịn sò"

## File sửa
- `index.html`

## Thay đổi
### Tab dưới (footer-panel)
- **Glassmorphism**: `backdrop-filter: blur(24px)`
- **Icon trong viên gradient**: `.nav-ico` width 52px, height 32px, border-radius 18px
- **Active state**: Gradient `#0054a3 → #00bfa5`, shadow, `translateY(-6px)`
- **Press animation**: `scale(0.88)` khi bấm
- **Chấm xanh**: `.nav-lab::after` khi active
- **Dark mode support**: Kiểm tra `body.dark-mode`
- **Font Awesome icons**: Trang chủ (fa-house), Ví tiền (fa-wallet), Lịch sử (fa-chart-line), Tôi (fa-user)

### Hộp thoại
- **Override `window.alert`**: Thay alert trắng thô kệch bằng card đẹp
- **Card**: Border-radius 24px, shadow, animation pop
- **Logo gradient**: 64px × 64px, border-radius 20px
- **Nút OK**: Gradient `#0054a3 → #00bfa5`

### Module liên quan
- PREMIUM UI v1

### Tương thích ngược
YES — override `window.alert`, không phá code cũ

---

# VERSION 1.1.0 — CLEAN FIX v4
**Ngày: 06/08/2026**

## Mục tiêu
Sửa 3 lỗi nghiêm trọng: GPS không cập nhật, menu chồng chữ, thiếu AI

## File sửa
- `index.html`

## Thay đổi
### 1) GPS Fix
- **`fixGpsTick(lat, lng, acc)`**: LUÔN vẽ/di chuyển marker dù GPS yếu
- **`toggleFollow()`**: Bật/tắt `map.panTo`
- **Nút 🎯**: `fixGpsBtn` — toggle follow mode + `forceRefreshGPS()`
- **Cảnh báo**: Toast khi accuracy >150m

### 2) Menu Fix
- **CSS**: `.sidebar` flex column, `.sidebar-menu` flex 1 overflow-y auto
- **Footer**: `position: relative` thay vì absolute (hết đè chữ)
- **Ẩn nút 🌙**: `hideFloatingMoon()` tìm button có icon `.fa-moon, .fa-sun` ở đầu màn hình

### 3) Menu Items
- **Thêm 4 mục** trước "Đăng xuất":
  - 🤖 Bản đồ nhiệt AI → `toggleAI()`
  - 🎯 Theo dõi vị trí → `toggleFollow()`
  - 🌐 Ngôn ngữ → `triggerLang()` (VI/EN)
  - 🌓 Sáng/Tối → `triggerDark()`

### 4) AI Heatmap
- **`toggleAI()`**: Bật/tắt heatmap
- **HOTSPOTS**: 7 điểm Hà Nội + 6 điểm HCM (sân bay, bến xe, văn phòng, trường học, khu ăn uống...)
- **Chấm điểm theo giờ**:
  - Sáng (5-10h): Sân bay 5, văn phòng 4
  - Trưa (10-14h): Khu ăn uống 5
  - Chiều (14-18h): Trường học 5, bến xe 5
  - Tối (18-23h): Giải trí 5, sân bay 4
  - Đêm (23-5h): Sân bay 5
- **Thời tiết Open-Meteo**: Cộng điểm sân bay/giải trí khi mưa
- **Vẽ vòng nhiệt**: Leaflet circle, radius 500 + score × 150m
- **Tooltip**: "🔥 Tên điểm — nhu cầu X/5"
- **Giọng nói**: `speak("AI đề xuất di chuyển về...")`
- **Auto refresh**: Mỗi 10 phút

### Module liên quan
- CLEAN FIX v4 (gộp GPS + Menu + AI)

### Tương thích ngược
YES — chỉ thêm patch

---

# VERSION 1.0.0 — AUTH + I18N + LOGIN FIX
**Ngày: 06/08/2026**

## Mục tiêu
Sửa lỗi không đăng nhập được + thêm đa ngôn ngữ

## File sửa
- `index.html`

## Thay đổi
### Auth Module (MODULE A)
- **`hashPassword(str)`**: Hash Java-style → `'h' + base36 + '_' + length`
- **`doLogin()`**:
  - Quét `drivers/` theo phone hoặc key
  - So `hashPassword(password + phone)` hoặc `hashPassword(password)`
  - Nếu chưa có `passwordHash` → tự tạo (cho tài khoản cũ)
  - Lưu `driverInfo` vào localStorage
  - Ẩn `#authScreen`, gọi `initApp()`
- **`doRegister()`**: Tạo key `DRV_` + base36 timestamp
- **`doForgotPassword()`**: Xác minh bằng CCCD hoặc biển số → đặt mật khẩu mới
- **Auto-bind**: Tự gắn onclick vào nút theo innerText

### I18N Module (MODULE B)
- **Từ điển VI → EN**: 50+ cặp từ (đăng nhập, đăng ký, trang chủ, lịch sử...)
- **Fragment dictionary**: Dịch nội dung động (chuyến đi, đơn hàng...)
- **`translateText(t)`**: Dịch text node
- **MutationObserver**: Tự động dịch khi DOM thay đổi
- **Nút #langSwitcher**: Góc phải trên, toggle VI/EN
- **localStorage**: `promax_lang`

### Tương thích ngược
YES — chỉ thêm patch

---

# VERSION 0.5.0 — NOTIFICATION
**Ngày: (cũ)**

## Thay đổi
- Thêm Push Notification
- Thêm thông báo nhận đơn
- Thêm thông báo hoàn thành chuyến

---

# VERSION 0.4.0 — THANH TOÁN
**Ngày: (cũ)**

## Thay đổi
- Tích hợp PayOS
- Thêm webhook
- Thêm xác nhận giao dịch

---

# VERSION 0.3.0 — ĐƠN HÀNG
**Ngày: (cũ)**

## Thay đổi
- Thêm tạo đơn
- Thêm nhận đơn
- Thêm hủy đơn
- Thêm lịch sử chuyến

---

# VERSION 0.2.0 — GPS
**Ngày: (cũ)**

## Thay đổi
- Thêm GPS Tracking
- Thêm cập nhật vị trí realtime
- Tối ưu sai số GPS

---

# VERSION 0.1.0 — KHỞI TẠO
**Ngày: (cũ)**

## Thay đổi
- Tạo App Tài Xế
- Tạo App Khách Hàng
- Tạo Admin Dashboard
- Tích hợp Firebase
- Tích hợp PayOS
- Cấu hình PWA

---

# MẪU GHI NHẬT KÝ

```markdown
# VERSION X.Y.Z — TÊN TÍNH NĂNG
**Ngày: DD/MM/YYYY**

## Mục tiêu
Mô tả ngắn gọn mục tiêu của version này

## File sửa
- `file1.html`
- `file2.js`

## Thay đổi
### Đã thêm
- Tính năng A
- Tính năng B

### Đã sửa
- Bug X
- Bug Y

### Đã xóa
- Code cũ Z

### Node Firebase mới (nếu có)
- `node/path/` — mô tả fields

### Module liên quan
- MODULE X — tên module

## Ảnh hưởng
- GPS / Payment / Booking / Auth / UI...

## Tương thích ngược
YES / NO — giải thích

## Test
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | ... | ✅ / ❌ |
```

---

# QUY TẮC

1. **Mọi thay đổi phải ghi vào CHANGELOG.md**
2. **Không xóa lịch sử cũ**
3. **Không sửa lịch sử cũ** — chỉ thêm bản ghi mới ở ĐẦU file
4. **Chỉ thêm bản ghi mới**
5. **Mỗi phiên bản phải có**:
   - Version number (semantic versioning: major.minor.patch)
   - Ngày (DD/MM/YYYY)
   - Mục tiêu
   - File thay đổi
   - Mô tả chi tiết thay đổi
   - Module liên quan (nếu có)
   - Tương thích ngược (YES/NO)
6. **Mọi thay đổi Database phải cập nhật DATABASE_SCHEMA.md**
7. **Mọi thay đổi kiến trúc phải cập nhật PROJECT_CONSTITUTION.md**
8. **Mọi tính năng mới phải cập nhật ROADMAP.md**

---

# THỐNG KÊ

| Version | Mô tả | Ngày |
|---|---|---|
| 1.12.0 | Xe Ghép Enhancements | 06/08/2026 |
| 1.11.0 | Admin Dashboard Rewrite | 06/08/2026 |
| 1.10.0 | Customer App Enhancements | 06/08/2026 |
| 1.9.0 | PWA Finalization | 06/08/2026 |
| 1.8.0 | SOS Nâng Cấp | 06/08/2026 |
| 1.7.0 | Hóa Đơn Điện Tử | 06/08/2026 |
| 1.6.0 | Ví Tiền & Gói Cước | 06/08/2026 |
| 1.5.0 | Xe Điện (EV) | 06/08/2026 |
| 1.4.0 | Pháp Lý | 06/08/2026 |
| 1.3.0 | KYC (Xác Thực Tài Xế) | 06/08/2026 |
| 1.2.0 | Premium UI | 06/08/2026 |
| 1.1.0 | Clean Fix v4 | 06/08/2026 |
| 1.0.0 | Auth + I18N + Login Fix | 06/08/2026 |
| 0.5.0 | Notification | (cũ) |
| 0.4.0 | Thanh Toán | (cũ) |
| 0.3.0 | Đơn Hàng | (cũ) |
| 0.2.0 | GPS | (cũ) |
| 0.1.0 | Khởi Tạo | (cũ) |

**Tổng: 18 versions, 13 major updates trong ngày 06/08/2026**

---

*Changelog cập nhật lần cuối: 06/08/2026 — NGUYỄN XUÂN ĐẠT*