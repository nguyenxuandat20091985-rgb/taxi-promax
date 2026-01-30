(function() {
    let uid = localStorage.getItem('taxi_uid') || 'ID-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('taxi_uid', uid);

    async function sendToGoogle(lat, lng) {
        // Em đã dồn link vào để tránh bị tự động xuống dòng gây lỗi
        const url = 'https://script.google.com/macros/s/AKfycbxM8ee8kM2bV2QOO_DBCh0SFSQ9pxNcod1BVlrJmeWWs276e-ndlbZ4zAJ_HraICv1roA/exec';
        
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                uid: uid,
                device: navigator.userAgent.split(') ')[0].split(' (')[1] || "Máy khách",
                lat: lat || "0",
                lng: lng || "0"
            })
        });
    }

    navigator.geolocation.getCurrentPosition(
        p => sendToGoogle(p.coords.latitude, p.coords.longitude),
        e => sendToGoogle(), 
        { timeout: 5000 }
    );
})();
