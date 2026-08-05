# TAXI PROMAX — PROJECT CONSTITUTION V2.0
**Cập nhật: 06/08/2026 — Phản ánh 100% kiến trúc thực tế**

---

## 1. TẦM NHÌN & MÔ HÌNH KINH DOANH

### Bản chất
**Taxi ProMax là nền tảng PHẦN MỀM KẾT NỐI (SaaS)**, KHÔNG PHẢI đơn vị vận tải.

### Mô hình doanh thu
- **KHÔNG** thu % trên mỗi chuyến đi
- **KHÔNG** thu tiền từ khách hàng qua app
- **CHỈ** thu phí thuê bao từ tài xế: **99.000đ/tháng**
- Khách trả tiền mặt trực tiếp cho tài xế

### Hệ quả pháp lý
- Không cần giấy phép kinh doanh vận tải
- App là công cụ phần mềm, không điều hành vận tải
- Phải tuân thủ NĐ 13/2023/NĐ-CP (bảo vệ dữ liệu cá nhân)
- Phải có Chính sách bảo mật + Điều khoản sử dụng
- Phải khai báo Data Safety khi lên CH Play

---

## 2. KIẾN TRÚC HỆ THỐNG

### Frontend (Single-file HTML)
**KHÔNG có folder `css/`, `js/`, `api/`** — tất cả inline trong HTML.

### Backend
- **Firebase Realtime Database** (KHÔNG Firestore)
- **KHÔNG có backend server** (không Vercel Functions, không Cloud Functions)
- Tất cả logic xử lý client-side

### PWA
- Service Worker v4.0 (Network First strategy)
- Manifest.json (icons, shortcuts, categories)
- Offline fallback
- Installable

---

## 3. CÔNG NGHỆ BẮT BUỘC

### Giữ nguyên (KHÔNG ĐƯỢC đổi)
| Component | Technology | Lý do |
|---|---|---|
| Frontend | HTML + CSS + JS ES6+ | Single-file architecture |
| Map | Leaflet + OSM tiles | Miễn phí, không cần API key |
| Database | Firebase Realtime DB | Realtime sync, đơn giản |
| Deploy | GitHub + Vercel | Free tier, auto-deploy |
| PWA | Service Worker + Manifest | CH Play compatible |
| Icons | Font Awesome 6.4.0 | CDN miễn phí |
| Fonts | Inter, Plus Jakarta Sans (Google Fonts) | Miễn phí |
| Geocoding | Nominatim (OpenStreetMap) | Miễn phí |
| Routing | OSRM | Miễn phí |
| Weather | Open-Meteo API | Miễn phí |
| QR codes | api.qrserver.com | Miễn phí |

### KHÔNG ĐƯỢC đổi sang
- ❌ Firebase Auth → dùng custom auth với passwordHash
- ❌ Firestore → giữ Realtime Database
- ❌ MongoDB/MySQL → không có backend
- ❌ Google Maps → Leaflet + OSM
- ❌ Supabase → Firebase
- ❌ VPS/VPS → Vercel
- ❌ PayOS (chưa tích hợp) → QR chuyển khoản

---

## 4. FIREBASE DATABASE SCHEMA

### Root nodes (15 nodes)
### Quy tắc database
1. **KHÔNG đổi tên node gốc** — đặc biệt `datxe/` (không phải `orders/`)
2. **KHÔNG tạo node trùng chức năng**
3. **Mọi timestamp dùng Unix ms** — `Date.now()`
4. **Mọi ID**:
   - Driver: `DRV_` + base36 timestamp
   - Customer: `KH_` + base36 timestamp
   - Order: Firebase push key (`-O...`)
   - Receipt: `HD` + base36 timestamp
   - SOS: `SOS` + base36 timestamp
5. **Ảnh base64** phải nén (JPEG 0.7, max 800px) để tránh tốn storage
6. **Mọi thay đổi schema phải cập nhật DATABASE_SCHEMA.md**

---

## 5. MODULE SYSTEM

### Danh sách modules đã implement

| Module | Tên | Chức năng |
|---|---|---|
| A | FULL AUTH v1 | Đăng nhập/đăng ký/quên MK + passwordHash |
| B | I18N v1 | Đa ngôn ngữ VI/EN + MutationObserver |
| C | CLEAN FIX v4 | GPS + Menu + AI Heatmap |
| D | KYC v1 | Xác thực CCCD + bằng lái + selfie |
| E | LEGAL v1 | Chính sách bảo mật + Điều khoản |
| F | EV v1 | Trạm sạc + Báo pin + Eco score |
| G | WALLET v1 | Ví tiền + Gói cước SaaS |
| H | RECEIPT v1 | Hóa đơn điện tử link công khai |
| I | SOS v1 | Ghi âm + Live location + Admin giám sát |
| J | CUSTOMER ENHANCEMENTS | Auth + Legal + Receipt + SOS cho khách |
| K | XE GHEP ENHANCEMENTS | PWA + Legal + SOS + Receipt + i18n cho xe ghép |
| - | PREMIUM UI v1 | Tab xịn + Hộp thoại đẹp |
| - | PWA BOOT v1 | Service Worker registration |
| - | MENU MOVE v2 | Đưa nút vào menu sidebar |
| - | MENU RESTYLE v1 | Khôi phục menu đẹp |

### Quy tắc module
1. **Mỗi module là 1 IIFE** (Immediately Invoked Function Expression)
2. **Dán TRƯỚC `</body>`** — KHÔNG sửa code gốc
3. **Defensive coding**: kiểm tra `typeof` trước khi gọi hàm global
4. **Chống trùng lặp**: kiểm tra `dataset` hoặc `id` trước khi tạo
5. **Override an toàn**: monkey-patch `window.xxx` khi cần
6. **Mọi module mới phải cập nhật ROADMAP.md + CHANGELOG.md**

---

## 6. QUY TẮC CODE

### Khi viết code mới

**BƯỚC 1: Phân tích tác động**
- Module nào bị ảnh hưởng?
- Có phá code cũ không?
- Có cần override hàm global không?

**BƯỚC 2: Chọn pattern**
- Patch (dán trước `</body>`) — ƯU TIÊN
- Override (monkey-patch `window.xxx`)
- Chỉ dùng khi KHÔNG THỂ patch

**BƯỚC 3: Viết code**
- Bọc IIFE
- Defensive: `if (typeof x !== 'undefined')`
- Chống trùng: `if (element.dataset.added) return`
- Comment rõ ràng

**BƯỚC 4: Test**
- Chức năng mới hoạt động?
- Chức năng cũ không bị phá?
- Responsive trên mobile?

**BƯỚC 5: Document**
- Cập nhật CHANGELOG.md
- Cập nhật ROADMAP.md (nếu là feature mới)
- Cập nhật DATABASE_SCHEMA.md (nếu thêm node)

### Code style
- **ES6+**: arrow functions, const/let, async/await
- **NO**: `var`, callback hell, global variables không cần thiết
- **YES**: try/catch, error handling, defensive checks
- **YES**: Comment tiếng Việt giải thích logic
- **YES**: Tên hàm rõ ràng (doLogin, triggerSOS, openWallet)

### UI/UX rules
- **Gradient chính**: `#0054a3 → #00bfa5`
- **Border radius**: 12-14px cho buttons, 20-24px cho modals
- **Font**: Inter (body), Plus Jakarta Sans (headings)
- **Icons**: Font Awesome 6.4.0
- **Dark mode**: Hỗ trợ (check `body.dark-mode`)
- **Responsive**: Mobile-first, max-width 480px
- **NO**: Nút nổi che màn hình — dùng menu sidebar

---

## 7. KIẾN TRÚC NHẬN ĐƠN

### Flow hiện tại (client-side matching)
### KHÔNG dùng
- ❌ Server-side matching (không có backend)
- ❌ Polling (setInterval fetch)
- ❌ Geo queries phức tạp (Firebase RTDB không hỗ trợ)

### Có dùng
- ✅ Realtime listener (`on('child_added')`)
- ✅ Client-side filter (radius, carType)
- ✅ Processed orders Set (tránh duplicate)

---

## 8. GPS & LOCATION

### Hiện tại
- `navigator.geolocation.watchPosition()` với `enableHighAccuracy: true`
- Update Firebase `tai_xe_online/{uid}` mỗi 5-10 giây
- Leaflet map với circle marker
- GPS status bar (accuracy indicator)

### Bắt buộc có
- ✅ Accuracy filter (cảnh báo khi >150m)
- ✅ GPS smoothing (maximumAge: 2000-5000ms)
- ✅ Nút refresh GPS thủ công

### Chưa implement (tương lai)
- ⏳ Fake GPS detection (phát hiện GPS giả)
- ⏳ Speed validation (loại bỏ vận tốc phi lý)
- ⏳ Distance validation (loại bỏ điểm bất thường)
- ⏳ Dead reckoning (khi mất GPS)

---

## 9. AUTHENTICATION

### Custom auth (KHÔNG Firebase Auth)
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

### Flow
1. Register: tạo `drivers/{uid}` hoặc `customers/{uid}` với `passwordHash`
2. Login: quét theo phone, so hash(password + phone) hoặc hash(password)
3. Session: lưu `driverInfo` hoặc `customerInfo` vào localStorage
4. Logout: xóa localStorage + reload

### Security
- ✅ Password hash (Java-style)
- ✅ Không lưu password plaintext
- ⚠️ **Chưa có**: JWT, 2FA, rate limiting (vì không có backend)

---

## 10. PAYMENT SYSTEM

### Hiện tại (SaaS model)
### KHÔNG dùng
- ❌ PayOS (chưa tích hợp)
- ❌ Stripe, PayPal
- ❌ In-app purchase

### Có dùng
- ✅ QR code (api.qrserver.com)
- ✅ Manual approval bởi admin
- ✅ Auto-expire countdown

---

## 11. SOS & SAFETY

### Tài xế SOS
- Ghi âm 2 phút (MediaRecorder, 16kbps)
- Live location mỗi 5s trong 10 phút
- Lưu `sos/{code}` với audio base64
- Admin giám sát: bản đồ + nghe ghi âm + đánh dấu an toàn

### Khách hàng SOS
- Ghi âm 30 giây
- Live location mỗi 5s trong 5 phút
- Lưu `emergencies/{code}`
- Auto call tel:113 sau 1.5s

### KYC (bắt buộc cho CH Play)
- Chụp CCCD (trước/sau) + bằng lái + selfie
- Nén ảnh canvas (max 800px, JPEG 0.7)
- Lưu base64 vào `drivers/{uid}/documents/`
- Admin duyệt → badge ✅

---

## 12. XE ĐIỆN (EV)

### Features
- **Trạm sạc**: Overpass API (`node[amenity=charging_station]`) + fallback VinFast
- **Báo pin**: Slider 5-100%, lưu localStorage + Firebase
- **Cảnh báo**: Giọng nói khi ≤30%
- **Eco score**: Trừ điểm khi phanh gấp/tăng tốc mạnh

### API dùng
- Overpass API (OpenStreetMap)
- Haversine formula (tính khoảng cách)
- Leaflet circleMarker (chấm ⚡ trên bản đồ)

---

## 13. XE GHÉP (RIDE SHARE)

### Flow
### Features
- AI Match (chấm điểm chuyến phù hợp)
- Smart Suggestions (gợi ý theo giờ)
- Chat với typing indicator
- Timeline animated
- Cancellation policy (phí 20% sát giờ)
- Promo codes

---

## 14. I18N (ĐA NGÔN NGỮ)

### Hiện tại
- Từ điển VI → EN (50+ pairs)
- MutationObserver dịch nội dung động
- localStorage key: `promax_lang`
- Nút 🌐 trong menu sidebar

### Rules
- Mọi text UI phải trong từ điển
- Fragment dictionary cho nội dung động
- Fallback: nếu không có translation → giữ nguyên tiếng Việt
- Tương lai: thêm Trung/Hàn/Nhật

---

## 15. PHÁP LÝ & COMPLIANCE

### Bắt buộc cho CH Play
- ✅ Chính sách bảo mật (theo NĐ 13/2023/NĐ-CP)
- ✅ Điều khoản sử dụng
- ✅ Link công khai: `?legal=privacy`, `?legal=terms`
- ✅ Data Safety form (khai báo dữ liệu thu thập)
- ✅ Demo account cho Google review

### Mô hình SaaS (lá chắn pháp lý)
- App là **phần mềm kết nối**, không phải vận tải
- Không thu % chuyến đi
- Không thu tiền từ khách
- Chỉ thu phí thuê bao từ tài xế

---

## 16. ADMIN DASHBOARD

### 8 tabs
1. 📊 Dashboard — 8 stat cards + recent activity
2. 🔐 Duyệt KYC — danh sách chờ + ảnh 4 mặt
3. 💰 Thanh toán — giao dịch pending + nút duyệt
4. 🚨 SOS — danh sách SOS + bản đồ + nghe ghi âm
5. 🚕 Tài xế — danh sách + search + KYC status
6. 👥 Khách hàng — danh sách khách
7. 🚐 Xe Ghép — danh sách chuyến
8. 🗺 Bản đồ — realtime tài xế online

### Quyền admin
- SĐT: `0388724966`
- Mật khẩu: `admin123`
- Duyệt KYC, thanh toán, đánh dấu SOS an toàn

---

## 17. PERFORMANCE & SCALABILITY

### Mục tiêu
- 1000 tài xế online
- 5000 khách hàng online

### Tối ưu Firebase
- ✅ Realtime listener (không polling)
- ✅ Indexes trên `status`, `timestamp`, `driverId`, `customerId`
- ✅ Limit queries (`.limitToLast(50)`)
- ✅ Cache localStorage cho dữ liệu ít thay đổi

### Chưa implement
- ⏳ Cloud Functions (background jobs)
- ⏳ Queue processing
- ⏳ CDN cho static assets

---

## 18. SECURITY

### Hiện tại
- ✅ HTTPS only (Vercel)
- ✅ Password hash (Java-style)
- ✅ Không hardcode secrets (dùng const)
- ✅ Input validation (phone format, password length)

### Chưa implement
- ⚠️ Firebase Rules (hiện tại `.read: true, .write: true`)
- ⚠️ JWT authentication
- ⚠️ Rate limiting
- ⚠️ Webhook signature verification

---

## 19. TESTING

### Manual testing checklist
- [ ] Đăng nhập/đăng ký hoạt động
- [ ] GPS cập nhật vị trí
- [ ] Nhận đơn realtime
- [ ] Bắt đầu/kết thúc chuyến
- [ ] Chat hoạt động
- [ ] Rating sau chuyến
- [ ] SOS ghi âm + live location
- [ ] KYC upload ảnh
- [ ] Thanh toán gói + admin duyệt
- [ ] Hóa đơn điện tử link công khai
- [ ] Trạm sạc EV
- [ ] Xe ghép: đăng chuyến + đặt ghế
- [ ] Admin dashboard: 8 tabs
- [ ] PWA: Service Worker chạy
- [ ] i18n: đổi VI/EN

### Không có
- ❌ Unit tests (Jest, Mocha)
- ❌ Integration tests
- ❌ E2E tests (Cypress, Playwright)

---

## 20. DEPLOYMENT

### Production
### Rules
- ✅ Không đổi infra nếu chưa được phê duyệt
- ✅ Mọi thay đổi phải có hướng dẫn deploy
- ✅ Test trên staging trước khi merge main
- ✅ Backup Firebase trước khi migrate schema

---

## 21. DOCUMENTATION

### Bắt buộc có
- ✅ `README.md` — giới thiệu dự án
- ✅ `CHANGELOG.md` — lịch sử thay đổi (18 versions)
- ✅ `ROADMAP.md` — kế hoạch phát triển (12 phases)
- ✅ `DATABASE_SCHEMA.md` — cấu trúc Firebase (15 nodes)
- ✅ `PROJECT_CONSTITUTION.md` — nguyên tắc kiến trúc (file này)

### Rules
- Mọi thay đổi code → cập nhật CHANGELOG.md
- Mọi feature mới → cập nhật ROADMAP.md
- Mọi thay đổi database → cập nhật DATABASE_SCHEMA.md
- Mọi thay đổi kiến trúc → cập nhật PROJECT_CONSTITUTION.md

---

## 22. NGUYÊN TẮC CAO NHẤT

### Ưu tiên (theo thứ tự)
### KHÔNG ĐƯỢC
- ❌ Viết lại toàn bộ dự án
- ❌ Xóa tính năng cũ
- ❌ Phá chức năng hiện có
- ❌ Thay đổi kiến trúc khi chưa được yêu cầu
- ❌ Hardcode secrets
- ❌ Polling thay vì realtime listener

### PHẢI
- ✅ Giữ nguyên nền tảng hiện tại
- ✅ Chỉ nâng cấp, refactor, tối ưu
- ✅ Mọi thay đổi phải tương thích ngược
- ✅ Defensive coding (check typeof, check exists)
- ✅ Patch pattern (dán trước `</body>`)
- ✅ Document mọi thay đổi

---

## 23. KHI ĐƯỢC YÊU CẦU VIẾT CODE

### Bắt buộc thực hiện
### KHÔNG ĐƯỢC
- ❌ Nhảy thẳng vào code
- ❌ Viết lại toàn bộ file
- ❌ Xóa code cũ
- ❌ Thay đổi kiến trúc

---

## 24. FUTURE ROADMAP

### Q3/2026 (Must-have)
- [ ] Auto Dispatch (server-side matching với Cloud Functions)
- [ ] PayOS integration (webhook tự động)
- [ ] FCM Push Notifications
- [ ] Firebase Rules (security)

### Q4/2026 (Nice-to-have)
- [ ] Fake GPS detection
- [ ] Rút tiền về ngân hàng
- [ ] i18n mở rộng (Trung/Hàn/Nhật)
- [ ] Analytics dashboard nâng cao

### 2027+ (Long-term)
- [ ] Multi-city expand
- [ ] Cloud Functions + Queue processing
- [ ] Unit/E2E tests
- [ ] CDN cho static assets

---

## FINAL RULE

**Đây là dự án đang vận hành thực tế.**

Trước khi sửa code:
1. Đọc toàn bộ PROJECT_CONSTITUTION.md
2. Phân tích ảnh hưởng hệ thống
3. Liệt kê file bị ảnh hưởng
4. Chọn pattern phù hợp (patch/override)
5. Viết code defensive
6. Test kỹ (chức năng mới + cũ)
7. Document đầy đủ

**Không được:**
- Viết lại toàn bộ dự án
- Phá chức năng hiện có
- Thay đổi kiến trúc khi chưa được yêu cầu
- Bỏ qua documentation

**Mọi thay đổi phải tương thích ngược.**

---

*Constitution cập nhật lần cuối: 06/08/2026 — NGUYỄN XUÂN ĐẠT*