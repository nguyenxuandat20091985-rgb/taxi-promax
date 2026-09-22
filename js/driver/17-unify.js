/*
 * Taxi ProMax — Subscription activation bridge v2 + PayOS final override
 * Fix: core gọi api.payos.vn với YOUR_CLIENT_ID → "Failed to fetch"
 * File này load SAU core/11/13 → ép handlePayment qua /api/create-payment
 */
(function(){
    'use strict';

    function getDriver(){
        try { if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo; } catch(e){}
        try { if(window.driverInfo&&window.driverInfo.uid)return window.driverInfo; } catch(e){}
        try { var s=localStorage.getItem('driverInfo');if(s){var d=JSON.parse(s);if(d&&d.uid)return d;} } catch(e){}
        return null;
    }
    function planKey(plan){
        if(plan==null)return 'PRO';
        if(typeof plan==='object')return String(plan.key||plan.name||plan.plan||'PRO');
        return String(plan);
    }
    function apiBase(){
        try{
            if(location&&location.origin&&location.protocol.indexOf('http')===0)return location.origin;
        }catch(e){}
        return 'https://taxi-promax.vercel.app';
    }

    /* ===== PayOS: override CUỐI CÙNG ===== */
    window.handlePayment = async function(amount, plan){
        var drv = getDriver();
        if(!drv||!drv.uid){
            if(typeof showToast==='function')showToast('⚠️ Vui lòng đăng nhập trước');
            return;
        }
        if(Number(amount)===0){
            try{
                var nextWeek=Date.now()+7*24*60*60*1000;
                if(typeof db!=='undefined'&&db){
                    await db.ref('drivers/'+drv.uid).update({tp_expiry:nextWeek,active_plan:planKey(plan)||'TRIAL 7D'});
                }
                if(typeof showToast==='function')showToast('✅ Kích hoạt gói dùng thử 7 ngày!');
                setTimeout(function(){try{location.reload();}catch(e){}},1200);
            }catch(e){
                if(typeof showToast==='function')showToast('⚠️ '+((e&&e.message)||e));
            }
            return;
        }
        var key=planKey(plan);
        if(typeof showToast==='function')showToast('⏳ Đang tạo thanh toán PayOS...');
        try{
            var r=await fetch(apiBase()+'/api/create-payment',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({amount:Number(amount),plan:key,planName:key,driverUid:drv.uid,driverPhone:drv.phone||''})
            });
            var d=await r.json().catch(function(){return{success:false,error:'Phản hồi không hợp lệ'};});
            if(d.success&&d.checkoutUrl){
                try{
                    localStorage.setItem('pending_plan',key);
                    localStorage.setItem('pending_uid',drv.uid);
                    localStorage.setItem('pending_order',String(d.orderCode||''));
                }catch(e){}
                window.location.href=d.checkoutUrl;
                return;
            }
            if(typeof showToast==='function')showToast('❌ Lỗi PayOS: '+(d.error||('HTTP '+r.status)));
        }catch(e){
            console.error('[PayOS]',e);
            if(typeof showToast==='function')showToast('❌ Không kết nối máy chủ thanh toán. Mở https://taxi-promax.vercel.app');
        }
    };

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

    function onPayosReturn(){
        try{
            var p=new URLSearchParams(location.search);
            var st=p.get('status');
            if(st==='success'){
                history.replaceState({},'',location.pathname+location.hash);
                if(typeof showToast==='function')showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
                setTimeout(function(){location.reload();},2200);
            }else if(st==='cancel'){
                history.replaceState({},'',location.pathname+location.hash);
                if(typeof showToast==='function')showToast('❌ Đã hủy thanh toán');
            }
        }catch(e){}
    }

    function boot(){
        unifyMenu();
        watchActivation();
        onPayosReturn();
        setInterval(function(){unifyMenu();flushNotice();},2000);
        console.log('[PayOS] 17-unify: handlePayment → /api/create-payment');
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
