/*
 * Taxi ProMax — Subscription activation bridge v2
 * Không để thông báo thanh toán làm gián đoạn chuyến đang chạy.
 */
(function(){
    'use strict';

    function getDriver(){
        try { if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo; } catch(e){}
        try { var s=localStorage.getItem('driverInfo');if(s){var d=JSON.parse(s);if(d&&d.uid)return d;} } catch(e){}
        return null;
    }
    function tripBusy(){
        try{
            if(window.tripEngine&&typeof window.tripEngine.isTripActive==='function')return window.tripEngine.isTripActive();
            var state=document.documentElement.getAttribute('data-trip-state')||document.body.getAttribute('data-trip-state')||'';
            return state&&state!=='IDLE'&&state!=='COMPLETED'&&state!=='CANCELLED';
        }catch(e){return false;}
    }
    function showWhenIdle(message){
        if(tripBusy()){pendingNotice=message;return false;}
        if(typeof showToast==='function')showToast(message);
        return true;
    }

    function unifyMenu(){
        var items=document.querySelectorAll('.sidebar-item');
        for(var i=0;i<items.length;i++){
            var el=items[i];
            if((el.innerText||'').indexOf('Ví tiền')!==-1&&!el.dataset.unified){
                el.dataset.unified='1';
                el.onclick=function(){
                    try{closeSidebar();}catch(e){}
                    try{showTab('vi',null);}catch(e){}
                    try{document.querySelectorAll('.tab-content').forEach(function(x){x.style.display='none';});var tab=document.getElementById('tab-vi');if(tab)tab.style.display='flex';}catch(e){}
                };
            }
        }
        var wm=document.getElementById('wmModal');if(wm)wm.remove();
    }

    var pendingNotice='';
    function flushNotice(){
        if(pendingNotice&&!tripBusy()){
            var message=pendingNotice;pendingNotice='';
            if(typeof showToast==='function')showToast(message);
        }
    }
    function watchActivation(){
        var pending=localStorage.getItem('pending_plan'),drv=getDriver();
        if(!pending||!drv)return;
        var tries=0;
        showWhenIdle('⏳ Đang đối soát thanh toán '+pending+'...');
        var iv=setInterval(function(){
            tries++;
            try{
                if(typeof db==='undefined')throw new Error('db unavailable');
                db.ref('drivers/'+drv.uid).once('value').then(function(s){
                    var d=s.val()||{};
                    if(d.tp_expiry&&parseInt(d.tp_expiry,10)>Date.now()){
                        clearInterval(iv);localStorage.removeItem('pending_plan');
                        showWhenIdle('✅ Gói đã kích hoạt: '+(d.active_plan||pending)+' 🎉');
                        if(typeof initCountdown==='function')initCountdown();
                    }else if(tries>=12){
                        clearInterval(iv);
                        showWhenIdle('ℹ️ Đã chuyển khoản? Hệ thống sẽ kích hoạt sau khi đối soát.');
                    }
                }).catch(function(){if(tries>=12){clearInterval(iv);showWhenIdle('ℹ️ Chưa nhận được xác nhận thanh toán. Kiểm tra lại trong Gói thuê bao.');}});
            }catch(e){if(tries>=12){clearInterval(iv);showWhenIdle('ℹ️ Chưa nhận được xác nhận thanh toán. Kiểm tra lại trong Gói thuê bao.');}}
        },5000);
    }

    function boot(){unifyMenu();watchActivation();setInterval(function(){unifyMenu();flushNotice();},2000);}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
