/**
 * 🛰️ PROMAX LOCATION CORE v1
 * Module định vị lõi DÙNG CHUNG 3 app: Tài xế / Khách hàng / Xe ghép
 * Nguyên tắc: thuần logic, KHÔNG đụng UI, API rõ ràng, chú thích tiếng Việt
 */
(function(){
'use strict';
var M = { version: '1.0' };

/* ===== 1) Toán học địa lý: khoảng cách 2 tọa độ (km) ===== */
M.haversine = function(a,b,c,d){
    var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,
        s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);
    return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
};

/* ===== 2) Bộ lọc chống trôi GPS (Weighted Moving Average) ===== */
var buf=[];
M.smooth = function(lat,lng,acc){
    buf.push({lat:lat,lng:lng,acc:acc}); if(buf.length>5)buf.shift();
    if(buf.length<3)return{lat:lat,lng:lng,acc:acc};
    var tw=0,sl=0,sg=0;
    for(var i=0;i<buf.length;i++){var w=1/Math.max(buf[i].acc,1); sl+=buf[i].lat*w; sg+=buf[i].lng*w; tw+=w;}
    return {lat:sl/tw, lng:sg/tw, acc:acc};
};

/* ===== 3) Anti-teleport: bỏ qua điểm nhảy >2km/5s hoặc >180km/h ===== */
var last=null;
M.checkTeleport = function(lat,lng,ts){
    if(!last)return false;
    var dt=(ts-last.t)/1000, d=M.haversine(last.lat,last.lng,lat,lng);
    if(dt<5&&d>2)return true;
    if(dt>0&&(d/dt*3600)>180)return true;
    return false;
};
M.setLast = function(lat,lng,ts){ last={lat:lat,lng:lng,t:ts}; };
M.getLast = function(){ return last; };

/* ===== 4) Xin quyền vị trí (dùng chung cả 2 mode) ===== */
M.ensurePermission = function(){
    return new Promise(function(res){
        if(!navigator.geolocation)return res(false);
        navigator.geolocation.getCurrentPosition(function(){res(true);},function(){res(false);});
    });
};

/* ===== 5) DRIVER MODE (Tài xế & Xe ghép): GPS thích ứng + callback =====
   opts.onFix(fix)  → app tự quyết đẩy lên Firebase/WebSocket (không nhét UI vào đây) */
var drvTimer=null, speed=0;
M.startDriver = function(opts){
    opts=opts||{};
    function interval(){ return speed>80?500:(speed>20?1000:1500); } // Tối ưu pin - thay đổi theo yêu cầu
    (function loop(){
        drvTimer=setTimeout(function(){
            navigator.geolocation.getCurrentPosition(function(p){
                var ts=p.timestamp||Date.now(), acc=p.coords.accuracy||999;
                if(p.coords.speed&&p.coords.speed>0)speed=Math.round(p.coords.speed*3.6);
                if(!M.checkTeleport(p.coords.latitude,p.coords.longitude,ts)){
                    var s=M.smooth(p.coords.latitude,p.coords.longitude,acc);
                    M.setLast(s.lat,s.lng,ts);
                    if(opts.onFix)opts.onFix({lat:s.lat,lng:s.lng,acc:acc,speed:speed,ts:ts});
                }
                loop();
            },function(){loop();},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
        },interval());
    })();
};
M.stopDriver = function(){ if(drvTimer)clearTimeout(drvTimer); drvTimer=null; };

/* ===== 6) CUSTOMER MODE (Khách hàng): nghe vị trí tài xế realtime =====
   Trả về hàm "unsub" để tắt listener khi kết thúc chuyến */
M.watchDriver = function(db, uid, cb){
    if(!db||!uid)return function(){};
    var ref=db.ref('tai_xe_online/'+uid);
    var fn=function(s){ var v=s.val(); if(v&&v.lat)cb({lat:v.lat,lng:v.lng,name:v.name,ts:v.timestamp}); };
    ref.on('value',fn);
    return function(){ ref.off('value',fn); };
};

/* ===== 7) Khoảng cách khách ↔ xe (km, làm tròn 1 chữ số) ===== */
M.distanceTo = function(lat,lng){
    if(!last)return null;
    return Math.round(M.haversine(last.lat,last.lng,lat,lng)*10)/10;
};

/* ===== 8) Mở Google Maps dẫn đường (Deep Link) =====
   @param {number} lat - Vĩ độ điểm đến
   @param {number} lng - Kinh độ điểm đến */
M.moGoogleMaps = function(lat, lng) {
    var url = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng + "&travelmode=driving";
    window.open(url, '_blank');
};

window.ProMaxLocation = M;
console.log('🛰️ ProMaxLocation Core v1 ready');
})();