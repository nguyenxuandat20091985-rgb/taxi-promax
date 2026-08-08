/* ========== 📊 REVENUE v1 - xóa "ví ảo", thay bằng doanh thu thật ========== */
(function(){
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try { var s = localStorage.getItem('driverInfo'); if (s) { var d = JSON.parse(s); if (d && d.uid) return d; } } catch(e){}
        return null;
    }
    function fmt(n){ return (n || 0).toLocaleString('vi-VN') + 'đ'; }

    window._revNumEl = null;

    function patchWallet(){
        if (window._revNumEl) return; // đã vá rồi
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        var target = null;
        while (walker.nextNode()) {
            if ((walker.currentNode.nodeValue || '').trim() === 'Số dư khả dụng') { target = walker.currentNode; break; }
        }
        if (!target) return;

        var labelEl = target.parentElement;
        var card = labelEl.closest('.profile-card') || labelEl.parentElement;

        // 1) Đổi tiêu đề thẻ
        var titleEl = card.querySelector('.profile-card-title');
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-chart-line"></i> Doanh thu tiền mặt';

        // 2) Đổi ý nghĩa dòng chữ (bỏ chữ "số dư khả dụng")
        target.nodeValue = 'Tổng thu nhập bạn đã thu từ khách';

        // 3) Tìm ô số tiền lớn
        card.querySelectorAll('div,span,b,strong').forEach(function(el){
            if (window._revNumEl) return;
            var txt = (el.textContent || '').trim();
            if (/^[\d\.]+đ$/.test(txt) && el.children.length === 0) window._revNumEl = el;
        });

        // 4) Chèn ô Hôm nay / Tuần / Tháng
        var box = document.createElement('div');
        box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;';
        box.innerHTML =
            '<div style="background:#f0f7ff;border-radius:10px;padding:8px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#64748b;">HÔM NAY</div><div id="revToday" style="font-size:12px;font-weight:900;color:#0054a3;">0đ</div></div>' +
            '<div style="background:#f0fdf4;border-radius:10px;padding:8px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#64748b;">TUẦN NÀY</div><div id="revWeek" style="font-size:12px;font-weight:900;color:#15803d;">0đ</div></div>' +
            '<div style="background:#fff7ed;border-radius:10px;padding:8px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#64748b;">THÁNG NÀY</div><div id="revMonth" style="font-size:12px;font-weight:900;color:#c2410c;">0đ</div></div>';
        labelEl.parentElement.insertBefore(box, labelEl.nextSibling);

        // 5) Chú thích pháp lý
        var note = document.createElement('div');
        note.style.cssText = 'margin-top:10px;font-size:10px;color:#64748b;line-height:1.5;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:8px 10px;';
        note.innerHTML = 'ℹ️ Đây là <b>số liệu thống kê</b> tiền mặt bạn đã thu trực tiếp từ khách. <b>ProMax không giữ tiền</b> — tiền luôn thuộc về bạn.';
        box.parentElement.insertBefore(note, box.nextSibling);

        refreshRevenue();
    }

    function refreshRevenue(){
        var drv = getDriver();
        if (!drv) return;
        var now = new Date();
        var startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        var startWeek = startDay - ((now.getDay() + 6) % 7) * 86400000;
        var startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        function apply(trips){
            var total = 0, day = 0, week = 0, month = 0;
            (trips || []).forEach(function(h){
                var c = (typeof h.cost === 'number') ? h.cost : 0;
                var ts = h.timestamp || 0;
                total += c; if (ts >= startDay) day += c; if (ts >= startWeek) week += c; if (ts >= startMonth) month += c;
            });
            if (window._revNumEl) window._revNumEl.textContent = fmt(total);
            var e1 = document.getElementById('revToday'); if (e1) e1.textContent = fmt(day);
            var e2 = document.getElementById('revWeek');  if (e2) e2.textContent = fmt(week);
            var e3 = document.getElementById('revMonth'); if (e3) e3.textContent = fmt(month);
        }
        function local(){ apply(JSON.parse(localStorage.getItem('trip_history') || '[]')); }

        try {
            db.ref('trips/' + drv.uid).orderByChild('timestamp').limitToLast(500).once('value')
                .then(function(s){ var d = s.val(); apply(d ? Object.values(d) : []); })
                .catch(local);
        } catch(e){ local(); }
    }

    // Mở tab "Tôi" là tự làm mới số liệu
    var _showTab = window.showTab;
    window.showTab = function(tab, btn){
        try { _showTab && _showTab(tab, btn); } catch(e){}
        if (tab === 'toi') setTimeout(function(){ patchWallet(); refreshRevenue(); }, 300);
    };

    function boot(){ setTimeout(patchWallet, 800); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();