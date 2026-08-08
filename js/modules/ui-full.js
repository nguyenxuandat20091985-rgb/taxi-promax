/* ========== 🖥️ UI FULL v1 - giữ panel chuyến đi đầy đủ như bản cũ ========== */
(function(){
    var userToggled = false;

    /* Nếu anh TỰ bấm thu gọn/mở rộng thì tôn trọng ý anh */
    document.addEventListener('click', function(e){
        if (e.target && e.target.classList && e.target.classList.contains('cp-handle')) userToggled = true;
    }, true);

    /* Bỏ chế độ TỰ thu gọn: panel luôn đầy đủ (khách · lộ trình · giá) */
    setInterval(function(){
        var p = document.getElementById('tripInfoPanel');
        if (!p) return;
        if (!userToggled && p.classList.contains('compact')) {
            p.classList.remove('compact');
            var h = p.querySelector('.cp-handle');
            if (h) h.innerHTML = '▼ Thu gọn';
            try { if (typeof map !== 'undefined' && map) map.invalidateSize(); } catch(e){}
        }
    }, 600);
    console.log('✅ UI FULL v1 loaded');
})();