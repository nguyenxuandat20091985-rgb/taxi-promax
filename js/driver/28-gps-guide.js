/*
 * Taxi ProMax — GPS guide v2
 * GPS core là owner duy nhất. Module này chỉ cung cấp trạng thái đọc được,
 * không gọi getCurrentPosition/watchPosition và không tự tạo popup.
 */
(function(window, document){
    'use strict';

    function readState(){
        var text='';
        try{
            var el=document.getElementById('gpsStatusText');
            text=el&&el.textContent?el.textContent.trim():'';
        }catch(e){}
        var raw=text.toLowerCase();
        if(/từ chối|không có quyền|denied/.test(raw))return{state:'denied',label:'GPS bị từ chối'};
        if(/timeout|đang xin|đang tìm|đang lấy|thử lại/.test(raw))return{state:'waiting',label:'Đang chờ GPS'};
        if(/không có tín hiệu|không hỗ trợ|tắt/.test(raw))return{state:'bad',label:'GPS không khả dụng'};
        var m=text.match(/[±+]\s*(\d+(?:\.\d+)?)\s*m/i);
        return{state:m&&Number(m[1])<=100?'good':'weak',label:m?'GPS ±'+Math.round(Number(m[1]))+'m':'Chưa có dữ liệu'};
    }
    window.PromaxGpsGuide={readState:readState};
    console.log('✅ GPS GUIDE v2 loaded — read-only, single GPS owner');
})(window, document);
