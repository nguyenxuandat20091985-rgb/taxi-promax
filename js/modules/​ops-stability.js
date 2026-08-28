/*
 * Taxi ProMax — Operations Stability v1
 * Lớp bảo vệ cuối sau các module legacy.
 * Không tính cước, không mở GPS watcher và không thay thế state machine.
 */
(function(window, document){
    'use strict';
    if(window.PromaxOpsStability) return;

    var VERSION='20260828-ops-stability1';
    var previousComplete=null;
    var previousConfirm=null;
    var previousHandle=null;
    var previousOnline=null;
    var previousShowToast=null;
    var previousShowTab=null;
    var lastToast={message:'',at:0};
    var completeBusy=false;

    function engine(){return window.tripEngine||null;}
    function state(){
        try{var e=engine();if(e&&typeof e.getCurrentState==='function')return e.getCurrentState();}catch(e){}
        return document.documentElement.getAttribute('data-trip-state')||'IDLE';
    }
    function activeTrip(){
        var s=state();
        return s&&s!=='IDLE'&&s!=='COMPLETED'&&s!=='CANCELLED';
    }
    function expiry(){
        try{
            var local=parseInt(localStorage.getItem('tp_expiry')||'0',10);
            if(local)return local;
        }catch(e){}
        try{
            if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.tp_expiry)return parseInt(driverInfo.tp_expiry,10);
        }catch(e){}
        return 0;
    }
    function subscriptionActive(){
        try{if(typeof isLocked!=='undefined'&&isLocked)return false;}catch(e){}
        var exp=expiry();
        return !exp||exp>Date.now();
    }
    function notify(message){if(typeof previousShowToast==='function')previousShowToast(message);}
    function hideFinishedTripUi(){
        ['tripInfoPanel','statsUI','streetHailMeter'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.display='none';el.classList.remove('show');}});
        var home=document.getElementById('homeControls');if(home)home.style.display='block';
        var end=document.getElementById('endTripBtn');if(end){end.style.display='none';end.disabled=true;end.setAttribute('aria-hidden','true');}
        var actions=document.getElementById('tripActionButtons');if(actions)actions.style.display='none';
    }
    function syncFinishedUi(){
        if(state()==='IDLE'||state()==='COMPLETED'||state()==='CANCELLED')hideFinishedTripUi();
    }
    function recentGpsFix(){
        try{
            var fix=null;
            if(window.PromaxGPSCore&&typeof window.PromaxGPSCore.getState==='function')fix=window.PromaxGPSCore.getState().lastFix;
            if(!fix&&engine())fix=engine().lastGpsUpdate;
            if(!fix)return false;
            var t=Number(fix.timestamp||fix.ts||Date.now()),accuracy=Number(fix.accuracy||999);
            return Date.now()-t<30000&&accuracy<=300;
        }catch(e){return false;}
    }
    function installToastGuard(){
        previousShowToast=window.showToast;
        if(typeof previousShowToast!=='function')return;
        window.showToast=function(message){
            var text=String(message||'');
            var now=Date.now();
            if(text&&lastToast.message===text&&now-lastToast.at<8000)return;
            if(/GPS\s*(tắt|rất kém|yếu|timeout)|GPS đang bị tắt/i.test(text)&&recentGpsFix())return;
            lastToast={message:text,at:now};
            return previousShowToast.apply(this,arguments);
        };
    }
    function installSubscriptionGuard(){
        previousOnline=window.toggleOnlineStatus;
        if(typeof previousOnline==='function'){
            window.toggleOnlineStatus=function(){
                var toggle=document.getElementById('onlineToggleSwitch');
                var turningOn=!!(toggle&&!toggle.classList.contains('active'));
                if(turningOn&&!subscriptionActive()){
                    notify('⚠️ Gói thuê bao đã hết hạn. Vui lòng gia hạn trước khi Online.');
                    if(toggle){toggle.classList.remove('active');toggle.setAttribute('aria-checked','false');}
                    var text=document.getElementById('onlineTextStatus');if(text)text.textContent='Offline';
                    return false;
                }
                return previousOnline.apply(this,arguments);
            };
        }
        previousHandle=window.handleTrip;
        if(typeof previousHandle==='function'){
            window.handleTrip=function(){
                if(!activeTrip()&&!subscriptionActive()){
                    notify('⚠️ Gói thuê bao đã hết hạn. Vui lòng gia hạn trước khi bắt đầu chuyến.');
                    return false;
                }
                return previousHandle.apply(this,arguments);
            };
        }
    }
    function installCompletionGuard(){
        previousConfirm=window.showConfirmComplete;
        if(typeof previousConfirm==='function'){
            window.showConfirmComplete=function(){
                if(state()==='IDLE'||state()==='COMPLETED'||state()==='CANCELLED'){
                    syncFinishedUi();
                    return false;
                }
                return previousConfirm.apply(this,arguments);
            };
        }
        previousComplete=window.completeTrip;
        if(typeof previousComplete==='function'){
            window.completeTrip=function(){
                if(completeBusy||state()==='IDLE'||state()==='COMPLETED'||state()==='CANCELLED'){
                    syncFinishedUi();
                    return false;
                }
                completeBusy=true;
                var result;
                try{result=previousComplete.apply(this,arguments);}finally{
                    window.setTimeout(function(){completeBusy=false;syncFinishedUi();},250);
                }
                return result;
            };
        }
    }
    function installHistoryRefresh(){
        previousShowTab=window.showTab;
        if(typeof previousShowTab==='function'){
            window.showTab=function(tab,btn){
                var result=previousShowTab.apply(this,arguments);
                if(tab==='lichsu')window.setTimeout(function(){if(typeof window.renderHistory==='function')window.renderHistory();},50);
                return result;
            };
        }
        document.addEventListener('trip:completed',function(){
            window.setTimeout(function(){if(typeof window.renderHistory==='function')window.renderHistory();syncFinishedUi();},80);
        });
    }
    function forceOfflineIfLocked(){
        if(subscriptionActive())return;
        var toggle=document.getElementById('onlineToggleSwitch');
        if(toggle)toggle.classList.remove('active');
        var text=document.getElementById('onlineTextStatus');if(text)text.textContent='Offline';
        try{if(typeof syncDriverOnline==='function')syncDriverOnline(false);}catch(e){}
    }
    function boot(){
        installToastGuard();
        installSubscriptionGuard();
        installCompletionGuard();
        installHistoryRefresh();
        forceOfflineIfLocked();
        syncFinishedUi();
        window.setInterval(function(){syncFinishedUi();forceOfflineIfLocked();},1000);
    }
    window.PromaxOpsStability={version:VERSION,refresh:function(){syncFinishedUi();forceOfflineIfLocked();},isSubscriptionActive:subscriptionActive};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})(window,document);
