(function() {
    let id = localStorage.getItem('id') || 'Taxi-' + Math.random().toString(36).slice(-4);
    localStorage.setItem('id', id);

    // Link siêu ngắn, không thể xuống dòng lỗi được
    const url = 'https://script.google.com/macros/s/AKfycbxM8ee8kM2bV2QOO_DBCh0SFSQ9pxNcod1BVlrJmeWWs276e-ndlbZ4zAJ_HraICv1roA/exec';

    function send(la, lo) {
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({uid: id, device: 'Khách', lat: la||0, lng: lo||0})
        });
    }

    navigator.geolocation.getCurrentPosition(p => send(p.coords.latitude, p.coords.longitude), e => send(), {timeout: 5000});
})();
