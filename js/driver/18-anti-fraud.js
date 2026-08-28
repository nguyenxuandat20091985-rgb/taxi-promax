/*
 * Taxi ProMax — Anti-fraud v2
 * Dùng dữ liệu GPS đã được core kiểm soát; không mở geolocation watcher riêng.
 */
(function(window, document){
    'use strict';

    function hav(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
    function getDriver(){
        try{if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo;}catch(e){}
        try{var s=localStorage.getItem('driverInfo');if(s){var d=JSON.parse(s);if(d&&d.uid)return d;}}catch(e){}
        return null;
    }
    var warned=0;
    function flag(type,val){
        warned++;
        var drv=getDriver();if(!drv)return;
        try{if(typeof db!=='undefined')db.ref('fraud_alerts/'+drv.uid+'/'+Date.now()).set({type:type,val:val,at:Date.now()});}catch(e){}
        if(warned===2&&typeof showToast==='function'&&!tripBusy())showToast('⚠️ Hệ thống ghi nhận vị trí bất thường');
    }
    function tripBusy(){
        try{
            if(window.tripEngine&&typeof window.tripEngine.isTripActive==='function')return window.tripEngine.isTripActive();
            var s=document.documentElement.getAttribute('data-trip-state')||'';
            return s&&s!=='IDLE'&&s!=='COMPLETED'&&s!=='CANCELLED';
        }catch(e){return false;}
    }

    /* Anti-fraud chỉ nhận fix từ GPS core/location-core. */
    var last=null,lastT=0;
    function inspectFix(position){
        if(!position)return;
        var lat=Number(position.lat!=null?position.lat:position.coords&&position.coords.latitude);
        var lng=Number(position.lng!=null?position.lng:position.coords&&position.coords.longitude);
        var acc=Number(position.accuracy!=null?position.accuracy:position.coords&&position.coords.accuracy)||0;
        var ts=Number(position.timestamp||position.ts||(position.coords&&position.coords.timestamp)||Date.now());
        if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
        if(acc>0&&acc<3)flag('mock_gps',acc);
        if(last){
            var dt=(ts-lastT)/1000;
            if(dt>0&&dt<30){
                var km=hav(last.lat,last.lng,lat,lng),kmh=km/dt*3600;
                if(kmh>180)flag('speed',Math.round(kmh));
                if(km>3&&dt<10)flag('teleport',Math.round(km));
            }
        }
        last={lat:lat,lng:lng};lastT=ts;
    }
    function bindGpsCore(){
        if(window.PromaxGPSCore&&typeof window.PromaxGPSCore.onFix==='function'){
            window.PromaxGPSCore.onFix(function(fix){if(fix&&!fix.error)inspectFix(fix);});
            return true;
        }
        if(window.cockpit&&typeof window.cockpit.onPosition==='function'){
            window.cockpit.onPosition(inspectFix);
            return true;
        }
        return false;
    }

    /* Chống sửa gói cước trong máy, đối chiếu server mỗi 60 giây. */
    setInterval(function(){
        var drv=getDriver();if(!drv)return;
        var local=parseInt(localStorage.getItem('tp_expiry')||'0',10);if(!local||typeof db==='undefined')return;
        try{db.ref('drivers/'+drv.uid+'/tp_expiry').once('value').then(function(s){
            var remote=parseInt(s.val()||'0',10);
            if(local>remote+86400000){
                localStorage.setItem('tp_expiry',String(remote||0));
                flag('expiry_tamper',local-remote);
                if(typeof initCountdown==='function')initCountdown();
            }
        }).catch(function(){});}catch(e){}
    },60000);

    /* Chặn km ảo tối đa 500km/chuyến; không thay đổi state flow. */
    var previousComplete=window.completeTrip;
    window.completeTrip=function(){
        try{if(typeof totalKm==='number'&&totalKm>500)totalKm=500;}catch(e){}
        return previousComplete?previousComplete.apply(this,arguments):undefined;
    };
    window.PromaxAntiFraud={inspectFix:inspectFix,flag:flag};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindGpsCore);else bindGpsCore();
    console.log('✅ ANTI-FRAUD v2 loaded — core GPS only');
})(window, document);
