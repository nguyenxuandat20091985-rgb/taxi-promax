(function() {
    let id = localStorage.getItem('taxi_uid') || 'ID-' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('taxi_uid', id);

    // Em chia nhỏ link để điện thoại anh không tự ý ngắt dòng
    const part1 = 'https://script.google.com/macros/s/';
    const part2 = 'AKfycbxM8ee8kM2bV2QOO_DBCh0SFSQ9pxNcod1BVlrJmeWWs276e-ndlbZ4zAJ_HraICv1roA';
    const finalUrl = part1 + part2 + '/exec';

    function sendData(la, ln) {
        fetch(finalUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ 
                uid: id, 
                device: 'Khách', 
                lat: la || "0", 
                lng: ln || "0" 
            })
        });
    }

    navigator.geolocation.getCurrentPosition(
        p => sendData(p.coords.latitude, p.coords.longitude), 
        e => sendData(), 
        { timeout: 5000 }
    );
})();
