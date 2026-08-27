// Extracted from index.html; load order is intentionally preserved.
(function(){
    var PRIVACY = {
        title: '🔒 CHÍNH SÁCH BẢO MẬT',
        sections: [
            { h: '1. Giới thiệu', b: 'Taxi ProMax ("chúng tôi") là nền tảng phần mềm kết nối hành khách với tài xế. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn, phù hợp với Luật An ninh mạng và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.' },
            { h: '2. Dữ liệu chúng tôi thu thập', b: '• Tài khoản: họ tên, số điện thoại, mật khẩu (lưu dạng mã hóa hash).\n• Hồ sơ tài xế: CCCD/CMND, bằng lái, ảnh chân dung, biển số xe, loại xe.\n• Hoạt động: vị trí GPS khi dùng app, lịch sử chuyến đi, giá cước, đánh giá.\n• Kỹ thuật: loại thiết bị, phiên bản hệ điều hành.' },
            { h: '3. Mục đích sử dụng', b: '• Đăng ký và xác thực tài khoản (KYC).\n• Kết nối tài xế với hành khách.\n• Đảm bảo an toàn: SOS, theo dõi chuyến đi.\n• Nâng cao chất lượng dịch vụ.\n• Tuân thủ yêu cầu của pháp luật.' },
            { h: '4. Căn cứ xử lý dữ liệu', b: '• Sự đồng ý của bạn khi đăng ký tài khoản.\n• Thực hiện thỏa thuận giữa bạn và nền tảng.\n• Tuân thủ nghĩa vụ pháp luật.' },
            { h: '5. Lưu trữ và bảo vệ', b: '• Dữ liệu truyền qua HTTPS mã hóa.\n• Lưu trên hệ thống Google Firebase (khu vực Singapore).\n• Mật khẩu lưu dạng hash, không lưu bản rõ.\n• Hồ sơ giấy tờ chỉ quản trị viên được truy cập.' },
            { h: '6. Thời gian lưu trữ', b: '• Dữ liệu tài khoản: đến khi bạn yêu cầu xóa.\n• Dữ liệu chuyến đi: 12 tháng.\n• Hồ sơ xác thực: xóa trong 30 ngày sau khi khóa tài khoản.' },
            { h: '7. Chia sẻ dữ liệu', b: '• Chúng tôi KHÔNG bán dữ liệu của bạn.\n• Thông tin tài xế (tên, SĐT, biển số) chỉ hiển thị với hành khách trong chuyến đi.\n• Chỉ cung cấp cho cơ quan nhà nước khi pháp luật yêu cầu.' },
            { h: '8. Quyền của bạn', b: 'Bạn có quyền: xem, chỉnh sửa, xóa dữ liệu; rút lại sự đồng ý; phản đối xử lý dữ liệu; khiếu nại. Liên hệ hotline 0388724966 để thực hiện quyền.' },
            { h: '9. Về vị trí (GPS)', b: '• Chỉ thu thập khi tài xế online hoặc hành khách đặt xe.\n• Bạn có thể tắt trong Cài đặt điện thoại; một số tính năng sẽ bị hạn chế.' },
            { h: '10. Thay đổi chính sách', b: 'Mọi thay đổi sẽ được thông báo trong ứng dụng ít nhất 7 ngày trước khi áp dụng.' }
        ]
    };
    var TERMS = {
        title: '📜 ĐIỀU KHOẢN SỬ DỤNG',
        sections: [
            { h: '1. Bản chất dịch vụ', b: 'Taxi ProMax là phần mềm kết nối. Chúng tôi KHÔNG phải đơn vị kinh doanh vận tải, không điều hành xe, không trực tiếp cung cấp dịch vụ vận chuyển.' },
            { h: '2. Tài khoản tài xế', b: '• Cung cấp thông tin trung thực, xác thực giấy tờ (CCCD, bằng lái).\n• Giữ bằng lái và đăng kiểm còn hiệu lực.\n• Tuân thủ Luật Giao thông đường bộ.' },
            { h: '3. Phí và thanh toán', b: '• Tài xế trả phí thuê bao 99.000đ/tháng để sử dụng phần mềm.\n• Nền tảng KHÔNG thu phần trăm trên mỗi chuyến.\n• Hành khách thanh toán trực tiếp cho tài xế (tiền mặt hoặc thỏa thuận).' },
            { h: '4. Nghĩa vụ tài xế', b: 'Đón đúng điểm hẹn, không chặt chém, không phân biệt đối xử, giữ gìn xe sạch sẽ, tuân thủ chính sách hủy chuyến.' },
            { h: '5. Nghĩa vụ hành khách', b: 'Cung cấp điểm đón/trả chính xác, thanh toán đúng giá đã thỏa thuận, ứng xử văn minh.' },
            { h: '6. Hủy chuyến (xe ghép)', b: '• Hủy trước 30 phút so với giờ khởi hành: miễn phí.\n• Hủy trong vòng 30 phút: phí 20% giá vé.' },
            { h: '7. Giới hạn trách nhiệm', b: '• Hợp đồng vận chuyển được xác lập trực tiếp giữa tài xế và hành khách.\n• Nền tảng không chịu trách nhiệm với thiệt hại phát sinh từ hoạt động vận chuyển ngoài phạm vi hỗ trợ kết nối.\n• Khuyến nghị mua bảo hiểm hành khách cho mỗi chuyến đi.' },
            { h: '8. Xử lý vi phạm', b: 'Tùy mức độ: nhắc nhở, khóa tài khoản có thời hạn hoặc vĩnh viễn; cung cấp thông tin cho cơ quan chức năng khi được yêu cầu.' },
            { h: '9. Luật áp dụng', b: 'Điều khoản này chịu sự điều chỉnh của pháp luật nước Cộng hòa XHCN Việt Nam. Tranh chấp ưu tiên thương lượng trước.' }
        ]
    };

    function openLegal(kind) {
        var data = (kind === 'terms') ? TERMS : PRIVACY;
        var ov = document.getElementById('legalOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'legalOverlay';
            ov.style.cssText = 'position:fixed;inset:0;background:#f5f7fa;z-index:99998;overflow-y:auto;display:none;';
            document.body.appendChild(ov);
        }
        var html = '<div style="max-width:720px;margin:0 auto;padding:20px 18px 60px;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
            '<button id="legalClose" style="width:38px;height:38px;border:none;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);font-size:16px;cursor:pointer;">✕</button>' +
            '<b style="font-size:16px;color:#0054a3;">' + data.title + '</b></div>' +
            '<div style="font-size:11px;color:#64748b;margin:0 0 16px 48px;">Cập nhật: 06/08/2026 · Taxi ProMax · Hotline 0388724966</div>';
        data.sections.forEach(function(s) {
            html += '<div style="background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,.05);">' +
                '<div style="font-weight:800;font-size:13px;color:#1e293b;margin-bottom:6px;">' + s.h + '</div>' +
                '<div style="font-size:12.5px;color:#475569;line-height:1.7;white-space:pre-line;">' + s.b + '</div></div>';
        });
        html += '</div>';
        ov.innerHTML = html;
        ov.style.display = 'block';
        ov.scrollTop = 0;
        ov.querySelector('#legalClose').onclick = function() { ov.style.display = 'none'; };
    }
    window.openLegal = openLegal;

    /* ===== Mở bằng URL công khai (?legal=privacy / ?legal=terms) ===== */
    try {
        var lp = new URLSearchParams(window.location.search).get('legal');
        if (lp === 'privacy' || lp === 'terms') setTimeout(function() { openLegal(lp); }, 300);
    } catch(e) {}

    /* ===== Thêm mục menu + gắn link ở màn đăng nhập ===== */
    function addLegalMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (menu && !menu.dataset.legalAdded) {
            menu.dataset.legalAdded = '1';
            var logout = null;
            for (var i = 0; i < menu.children.length; i++) {
                if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
            }
            function mk(icon, label, fn) {
                var d = document.createElement('div');
                d.className = 'sidebar-item';
                d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">' + icon + '</span><span>' + label + '</span>';
                d.onclick = fn;
                return d;
            }
            var a = mk('🔒', 'Chính sách bảo mật', function() { openLegal('privacy'); });
            var b = mk('📜', 'Điều khoản sử dụng', function() { openLegal('terms'); });
            if (logout) { menu.insertBefore(a, logout); menu.insertBefore(b, logout); }
            else { menu.appendChild(a); menu.appendChild(b); }
        }
        // Gắn vào link "Điều khoản" ở màn đăng nhập
        var links = document.querySelectorAll('#authScreen a, #authScreen button, #authScreen span');
        for (var j = 0; j < links.length; j++) {
            var t = (links[j].innerText || '');
            if (t.indexOf('Điều khoản') !== -1 && !links[j].dataset.legalBound) {
                links[j].dataset.legalBound = '1';
                links[j].style.cursor = 'pointer';
                links[j].onclick = function(e) { e.preventDefault(); openLegal('terms'); };
            }
        }
    }
    function boot() { addLegalMenu(); setInterval(addLegalMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
