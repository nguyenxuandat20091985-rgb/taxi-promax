const GPS = {
    start: function(callback) {
        if (navigator.geolocation) {
            // Ép điện thoại phải tìm vị trí ngay lập tức
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Hiện số tọa độ ra màn hình cho anh thấy
                    document.getElementById('coordinates').innerText = lat.toFixed(5) + ", " + lng.toFixed(5);
                    document.getElementById('current-location').innerText = "Đã tìm thấy vị trí!";
                    
                    // Báo cho bản đồ hiện lên
                    if (typeof MapModule !== 'undefined') {
                        MapModule.init(lat, lng);
                    }
                    if (callback) callback(lat, lng);
                },
                (error) => {
                    alert("Lỗi: Anh hãy bật GPS điện thoại và chọn 'Cho phép' khi trình duyệt hỏi nhé!");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Điện thoại của anh không hỗ trợ GPS.");
        }
    }
};
