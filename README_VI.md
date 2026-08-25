# Bộ mã ProMax đã tách GPS và tính cước

## Cấu trúc bàn giao

```text
Index.html
js/modules/promax-gps-core.js
js/modules/promax-fare-core.js
js/modules/promax-cockpit-ui.js
js/modules/promax-integrity.js
validation_report.txt
```

## Cách đưa vào dự án hiện tại

Giữ nguyên thư mục `js/` hiện có của anh. Chép file `Index.html` vào vị trí file HTML chính và chép bốn file trong `js/modules/` vào đúng thư mục `js/modules/`. Không xóa các file `cockpit.js`, `safety.js`, `trip-engine-v4.js`, `gps-bridge.js`, `smart-dispatch.js`, `fare-sync.js`, `ai-copilot-v4.js` hoặc `init-trip.js`, vì các file đó không có trong gói mã nguồn anh gửi nhưng giao diện hiện tại vẫn đang gọi chúng.

Bản `Index.html` mới đã bỏ các lớp GPS trùng lặp trong HTML: GPS BOOST, GPS DUAL, GPS FINAL, GPS GUIDE và đoạn COCKPIT ULTRA ghi đè tính cước. Bản này vẫn giữ các module không liên quan như ví, PayOS, SOS, lịch sử, xe ghép, AI, hóa đơn và cầu nối định vị nền.

## Luồng mới

`promax-gps-core.js` là nguồn GPS trình duyệt duy nhất. Nó sử dụng một `watchPosition`, nhận thêm location từ `BackgroundGeolocation` qua `processBackgroundLocation`, lọc sai số, chống bước nhảy và cộng quãng đường một lần. Thời tiết, theo dõi vị trí trên bản đồ, Eco và kiểm tra gian lận nhận dữ liệu qua `PromaxGPSCore.onFix()` thay vì tự mở watcher riêng.

`promax-fare-core.js` là nơi duy nhất quy định cách tính cước. Quy tắc hiện tại được giữ nguyên để không làm thay đổi nghiệp vụ: giá tối thiểu là **20.000đ**, vì vậy chuyến `0.00 KM` vẫn có thể hiện 20.000đ nếu đây là giá mở cửa của chuyến vẫy. Module này không tự bịa thêm kilomet khi GPS có sai số lớn.

`promax-cockpit-ui.js` chỉ phụ trách giao diện, đồng hồ, ETA, hệ số hiển thị và các tay nắm thu gọn/mở rộng. Nó không mở GPS và không ghi đè `completeTrip` hoặc `saveHistory`.

`promax-integrity.js` giữ kiểm tra GPS giả, teleport, tốc độ bất thường, giới hạn tối đa mỗi chuyến và đồng bộ `tp_expiry`. Nó không mở thêm GPS watcher và không ghi đè tính cước.

## Đối với hai thông báo trong ảnh

Thông báo `GPS: Rất yếu (±2000m)` là trạng thái thật của thiết bị. Với sai số khoảng 2.000m, hệ thống mới cố ý không cộng kilomet để tránh tính quãng đường ảo. Anh cần cấp quyền vị trí chính xác, bật GPS/Google Location Accuracy và thử ngoài trời. Không nên hạ ngưỡng xuống 2.000m vì sẽ làm sai tiền.

Thông báo `Tổng: 20.000đ` là giá mở cửa tối thiểu đang được giữ nguyên. Nếu anh muốn chuyến 0 km không được lưu hoặc không được tính 20.000đ, đó là thay đổi nghiệp vụ riêng và cần xác nhận trước; bản này không tự thay đổi hành vi cước cũ.

## Kiểm tra đã thực hiện

Bản HTML có 45 cặp thẻ script cân bằng, 24 khối JavaScript nội tuyến qua kiểm tra cú pháp, bốn module mới qua `node --check`, chỉ còn một `watchPosition` trong HTML, đủ bốn icon thanh menu và không còn các khối GPS trùng lặp nêu trên. Các file bên ngoài không được gửi kèm chưa thể kiểm tra nội dung bên trong; vì vậy anh cần giữ chúng nguyên trạng khi chép bản mới.
