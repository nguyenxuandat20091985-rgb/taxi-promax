# TAXI PROMAX — ROADMAP (Cập nhật 06/08/2026)

## 🎯 TẦM NHÌN

Nền tảng gọi xe PWA Việt Nam theo mô hình **SaaS (phần mềm kết nối)**:
- **KHÔNG** phải đơn vị vận tải → giảm rủi ro pháp lý
- **KHÔNG** thu % chuyến đi → chỉ thu phí thuê bao từ tài xế
- Hỗ trợ cả xe xăng + xe điện
- Sẵn sàng lên **CH Play**

**Mô hình kinh doanh:**
- Khách trả tiền mặt cho tài xế (không qua app)
- Tài xế trả **99.000đ/tháng** thuê bao phần mềm
- App là nền tảng kết nối, không điều hành vận tải

---

## ✅ PHASE 1 — NỀN TẢNG CỐT LÕI (HOÀN THÀNH)

### App Khách Hàng (`khachhang.html`)
- [x] Đăng nhập / Đăng ký / Quên mật khẩu (passwordHash)
- [x] Định vị GPS chính xác
- [x] Autocomplete điểm đón/đến (Nominatim)
- [x] Chọn loại xe (4 chỗ / 7 chỗ / điện)
- [x] Tính giá OSRM (km × rate)
- [x] Chat với tài xế
- [x] Theo dõi tài xế realtime (Leaflet + Firebase)
- [x] Đánh giá + tip sau chuyến
- [x] SOS ghi âm + live location
- [x] Chia sẻ link theo dõi chuyến
- [x] Hóa đơn điện tử (link công khai)
- [x] PWA Service Worker

### App Tài Xế (`index.html`)
- [x] Đăng nhập / Đăng ký / Quên mật khẩu
- [x] Bật online/offline
- [x] GPS realtime + bản đồ Leaflet
- [x] Nhận đơn từ Firebase
- [x] Bắt đầu / Kết thúc chuyến
- [x] Đồng hồ tính cước (km × rate)
- [x] Chat với khách
- [x] SOS ghi âm 2 phút + live location 10 phút
- [x] Menu sidebar đầy đủ

### App Xe Ghép (`xeghep.html`)
- [x] Auth đầy đủ
- [x] AI Match (chấm điểm chuyến phù hợp)
- [x] Smart Suggestions (gợi ý theo giờ)
- [x] Chat với typing indicator
- [x] Timeline 6 bước chuyến đi
- [x] QR code vé
- [x] Tracking + route line animated
- [x] Promo codes
- [x] Weather API
- [x] Driver profile
- [x] Cancellation policy (phí 20% sát giờ)

### Admin Dashboard (`admin.html`)
- [x] Đăng nhập admin
- [x] Dashboard 8 chỉ số realtime
- [x] Duyệt KYC (xem ảnh 4 mặt)
- [x] Duyệt thanh toán gói
- [x] Giám sát SOS (bản đồ + nghe ghi âm)
- [x] Quản lý tài xế / khách hàng / xe ghép
- [x] Bản đồ realtime tài xế online
- [x] Auto refresh 30s

---

## ✅ PHASE 2 — TỐI ƯU GHÉP ĐƠN (HOÀN THÀNH)

### Xe Ghép Module
- [x] Đăng chuyến (tài xế)
- [x] Tìm chuyến (khách)
- [x] Đặt ghế + QR vé
- [x] Chat driver-customer
- [x] Timeline realtime
- [x] Rating sau chuyến
- [x] Cancellation policy

### Driver Matching (cơ bản)
- [x] Geo Query (radius filter 10km)
- [x] AI Heatmap (HOTSPOTS HN/HCM theo giờ + thời tiết)
- [ ] Auto Dispatch (tự động gán đơn gần nhất) — **chưa làm**
- [ ] Auto Reassign (tự gán lại khi tài xế từ chối) — **chưa làm**

---

## ⏳ PHASE 3 — THANH TOÁN (ĐANG THỰC HIỆN)

### Đã hoàn thành
- [x] Ví tài xế (localStorage + Firebase)
- [x] 3 gói SaaS (1/3/12 tháng)
- [x] QR chuyển khoản (api.qrserver.com)
- [x] Admin duyệt thanh toán → tự gia hạn gói
- [x] Hóa đơn điện tử link công khai

### Chưa làm
- [ ] PayOS tích hợp (auto webhook)
- [ ] MoMo QR chính thức
- [ ] Rút tiền về ngân hàng
- [ ] Báo cáo thuế tự động

---

## ⏳ PHASE 4 — HỆ THỐNG GPS NÂNG CAO (ĐANG THỰC HIỆN)

### Đã hoàn thành
- [x] GPS Smoothing (watchPosition + maximumAge)
- [x] Accuracy Filter (cảnh báo khi sai số >150m)
- [x] Live location SOS (mỗi 5s trong 10 phút)
- [x] Nút 🎯 theo dõi vị trí

### Chưa làm
- [ ] Fake GPS Detection (phát hiện GPS giả)
- [ ] Distance Validation (loại bỏ điểm bất thường)
- [ ] Speed Validation (phát hiện vận tốc phi lý)
- [ ] Dead reckoning (khi mất GPS)

---

## ⏳ PHASE 5 — PUSH NOTIFICATION (CƠ BẢN)

### Đã hoàn thành
- [x] Service Worker v4.0 với push handler
- [x] Push event listener + showNotification
- [x] Notification click → focus/open tab

### Chưa làm
- [ ] Firebase Cloud Messaging (FCM) setup
- [ ] Server-side push trigger
- [ ] Topic subscriptions (theo tỉnh thành)
- [ ] Scheduled push (nhắc gia hạn gói)

---

## ✅ PHASE 6 — ĐÁNH GIÁ (HOÀN THÀNH)

### Rating System
- [x] Đánh giá 1-5 sao (khách → tài xế)
- [x] Comment text
- [x] Tip (10k/20k/50k)
- [x] Lưu vào `ratings/{orderId}`
- [x] Hiển thị rating trung bình trong hồ sơ

---

## ✅ PHASE 7 — GÓI CƯỚC (HOÀN THÀNH)

### Subscription SaaS
- [x] Gói 1 tháng: 99.000đ
- [x] Gói 3 tháng: 249.000đ (tiết kiệm 15%)
- [x] Gói 12 tháng: 799.000đ (tiết kiệm 200k)
- [x] Countdown thời hạn
- [x] Auto-lock khi hết hạn
- [x] Admin duyệt → tự gia hạn

---

## ✅ PHASE 8 — PHÂN TÍCH DỮ LIỆU (HOÀN THÀNH)

### Admin Analytics
- [x] Số tài xế / khách hàng
- [x] Số chuyến hôm nay
- [x] Doanh thu gói (paid transactions)
- [x] Pending KYC / Pending TT / SOS active
- [x] Recent activity feed
- [x] Realtime 30s refresh

---

## ✅ PHASE 9 — PHÁP LÝ & AN TOÀN (HOÀN THÀNH)

### Pháp lý (bắt buộc cho CH Play)
- [x] Chính sách bảo mật (theo NĐ 13/2023/NĐ-CP)
- [x] Điều khoản sử dụng
- [x] Link công khai `?legal=privacy` / `?legal=terms`
- [x] Data Safety form sẵn sàng
- [x] Mô hình SaaS (không thu % chuyến)

### An toàn
- [x] KYC tài xế (CCCD + bằng lái + selfie)
- [x] Admin duyệt hồ sơ
- [x] Badge ✅ cho tài xế đã xác thực
- [x] SOS ghi âm + live location (khách + tài xế)
- [x] Admin giám sát SOS (bản đồ + nghe ghi âm + đánh dấu an toàn)

---

## ✅ PHASE 10 — XE ĐIỆN (HOÀN THÀNH)

### EV Module
- [x] Tìm trạm sạc gần nhất (Overpass API + fallback VinFast)
- [x] Khoảng cách haversine
- [x] Nút dẫn đường Google Maps
- [x] Chấm ⚡ trên bản đồ
- [x] Báo pin (kéo slider + lưu Firebase)
- [x] Cảnh báo pin thấp (<30%) + giọng nói
- [x] Eco-driving score (trừ điểm khi phanh gấp/tăng tốc)

---

## ✅ PHASE 11 — ĐA NGÔN NGỮ (HOÀN THÀNH)

### i18n Module
- [x] Từ điển VI → EN
- [x] MutationObserver dịch nội dung động
- [x] localStorage key `promax_lang`
- [x] Nút 🌐 chuyển đổi trong menu
- [ ] Mở rộng: Trung / Hàn / Nhật — **tương lai**

---

## ✅ PHASE 12 — PWA & CH PLAY (HOÀN THÀNH)

### PWA
- [x] manifest.json chuẩn (icons, shortcuts, categories)
- [x] sw.js v4.0 (Network First + Cache CDN)
- [x] Register Service Worker tự động
- [x] Offline fallback

### CH Play
- [x] PWABuilder compatible
- [x] Privacy policy URL sẵn sàng
- [x] Data Safety form đầy đủ
- [x] Demo account cho Google review

---

## 📊 TRẠNG THÁI TỔNG THỂ (06/08/2026)

| Phase | Mô tả | Status |
|---|---|---|
| 1 | Nền tảng cốt lõi | ✅ 100% |
| 2 | Tối ưu ghép đơn | 🟡 70% (thiếu Auto Dispatch) |
| 3 | Thanh toán | 🟡 60% (thiếu PayOS auto) |
| 4 | GPS nâng cao | 🟡 50% (thiếu Fake GPS detection) |
| 5 | Push Notification | 🟡 40% (thiếu FCM) |
| 6 | Đánh giá | ✅ 100% |
| 7 | Gói cước | ✅ 100% |
| 8 | Phân tích | ✅ 100% |
| 9 | Pháp lý & An toàn | ✅ 100% |
| 10 | Xe điện | ✅ 100% |
| 11 | Đa ngôn ngữ | 🟡 70% (mở rộng) |
| 12 | PWA & CH Play | ✅ 100% |

**Tiến độ tổng thể: ~85%**

---

## 🎯 ƯU TIÊN TIẾP THEO (Q3/2026)

### Must-have (lên CH Play)
1. **Auto Dispatch** — tự động gán đơn cho tài xế gần nhất
2. **PayOS integration** — webhook tự động xác nhận thanh toán
3. **FCM Push** — thông báo đơn mới / sắp đến / hoàn thành

### Nice-to-have
4. **Fake GPS Detection** — chống gian lận
5. **Rút tiền** — về ngân hàng/MoMo
6. **i18n mở rộng** — Trung/Hàn/Nhật

### Tương lai (Q4/2026+)
7. **Cloud Functions** — background jobs
8. **Analytics dashboard nâng cao** (charts, trends)
9. **Multi-city expansion** (Đà Nẵng, Hải Phòng...)

---

## 🏗️ KIẾN TRÚC GIAO TIẾP (CẬP NHẬT)