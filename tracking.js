(function() {
    // 1. Tạo UID duy nhất cho mỗi máy khách
    let uid = localStorage.getItem('taxi_uid') || 'ID-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('taxi_uid', uid);

    // 2. Hàm gửi dữ liệu về Google Sheets của anh
    function sendToGoogle(lat, lng) {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxM8ee8kM2bV2QOO_DBCh0SFSQ9pxNcod1BVlrJmeWWs276e-ndlbZ4zAJ_HraICv1roA/exec';
        
        fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors', // Quan trọng để tránh lỗi bảo mật trình duyệt
            cache: 'no-cache',
            body: JSON.stringify({
                uid: uid,
                device: navigator.userAgent.split(') ')[0].split(' (')[1] || "Thiết bị ẩn",
                lat: lat || "Không có",
                lng: lng || "Không có"
            })
        });
    }

    // 3. Lấy vị trí và tự động gửi khi mở App
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            p => sendToGoogle(p.coords.latitude, p.coords.longitude),
            e => sendToGoogle(), // Nếu khách từ chối vị trí vẫn gửi thông tin máy
            { timeout: 5000 }
        );
    } else {
        sendToGoogle();
    }
})();
