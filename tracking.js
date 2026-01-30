(function() {
    let id = localStorage.getItem('taxi_uid') || 'ID-' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('taxi_uid', id);

    // Em đã nối link kiểu này để điện thoại anh không tự ngắt dòng được
    const k = 'https://script.google.com/macros/s/';
    const v = 'AKfycbxM8ee8kM2bV2QOO_DBCh0SFSQ9pxNcod1BVlrJmeWWs276e-ndlbZ4zAJ_HraICv1roA';
    const url = k + v + '/exec';

    function send(la, ln) {
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ uid: id, device: 'Máy khách', lat: la || "0", lng: ln || "0" })
        });
    }

    navigator.geolocation.getCurrentPosition(p => send(p.coords.latitude, p.coords.longitude), e => send(), { timeout: 5000 });
})();
