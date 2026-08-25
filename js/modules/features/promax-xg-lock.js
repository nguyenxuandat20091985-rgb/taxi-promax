/* ProMax extracted module: promax-xg-lock */
(function(){
    var PRICE=100000, BANK_BIN='970422', BANK_ACC='4430269669', BANK_NAME='NGUYEN XUAN DAT';
    var subCache=null, subAt=0;
    function getDriver(){ try{ if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo; }catch(e){}
        try{ var s=localStorage.getItem('driverInfo'); if(s){var d=JSON.parse(s); if(d&&d.uid)return d;} }catch(e){} return null; }
    function isActive(d){ return d&&d.status==='active'&&(d.expiry||0)>Date.now(); }
    function getSub(uid,cb){
        if(subCache&&Date.now()-subAt<15000) return cb(subCache);
        try{ db.ref('xg_subscriptions/'+uid).once('value').then(function(s){ subCache=s.val()||{}; subAt=Date.now(); cb(subCache); }).catch(function(){cb({});}); }
        catch(e){ cb({}); }
    }
    function syncSession(drv,d){ try{ localStorage.setItem('xg_driver_session',JSON.stringify({name:drv.name,phone:drv.phone,expiry:d.expiry,registeredAt:Date.now()})); }catch(e){} }

    function qrUrl(drv){ return 'https://img.vietqr.io/image/'+BANK_BIN+'-'+BANK_ACC+'-compact.png?amount='+PRICE+'&addInfo='+encodeURIComponent('XG '+drv.phone)+'&accountName='+encodeURIComponent(BANK_NAME); }

    function showGate(drv,d){
        var ov=document.getElementById('xgLock');
        if(!ov){ov=document.createElement('div');ov.id='xgLock';ov.style.cssText='position:fixed;inset:0;background:rgba(10,15,25,.7);backdrop-filter:blur(6px);z-index:16000;display:none;align-items:flex-end;justify-content:center;';document.body.appendChild(ov);}
        ov.innerHTML='<div style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:24px;">' +
            '<div style="background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;"><b>🚐 XE GHÉP — 100.000đ/tháng</b>' +
            '<button id="xgLClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div style="padding:16px;">' +
            ((d.expiry&&d.expiry<Date.now())?'<div style="background:#fff7e6;border:1px solid #fcd34d;color:#b45309;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:800;margin-bottom:12px;">⚠️ Gói XE GHÉP đã hết hạn — gia hạn để tiếp tục</div>':'') +
            '<div style="text-align:center;margin-bottom:12px;"><img src="'+qrUrl(drv)+'" alt="QR" style="width:220px;max-width:70%;border-radius:12px;border:1px solid #e2e8f0;"></div>' +
            '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;padding:12px;font-size:13px;line-height:1.9;">🏦 <b>BIDV:</b> '+BANK_ACC+'<br>👤 '+BANK_NAME+'<br>💵 Số tiền: <b style="color:#d32f2f;">100.000đ</b><br>📝 Nội dung: <b style="color:#0054a3;">XG '+drv.phone+'</b></div>' +
            '<button id="xgLConfirm" style="width:100%;margin-top:12px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;">✅ Đã chuyển khoản — gửi yêu cầu duyệt</button>' +
            '<div style="margin-top:10px;font-size:11px;color:#64748b;text-align:center;">Admin duyệt trong ít phút · Gói 30 ngày kể từ khi duyệt</div></div></div>';
        ov.style.display='flex';
        ov.querySelector('#xgLClose').onclick=function(){ov.style.display='none';};
        ov.querySelector('#xgLConfirm').onclick=function(){
            try{ db.ref('xg_subscriptions/'+drv.uid).set({ uid:drv.uid,name:drv.name||'',phone:drv.phone||'',amount:PRICE,txCode:'XG '+drv.phone,status:'pending',requestedAt:Date.now() });
                ov.style.display='none'; showPending(drv);
            }catch(e){ if(typeof showToast==='function')showToast('❌ Lỗi gửi yêu cầu'); }
        };
    }

    function showPending(drv){
        var ov=document.getElementById('xgPend');
        if(!ov){ov=document.createElement('div');ov.id='xgPend';ov.style.cssText='position:fixed;inset:0;background:rgba(10,15,25,.7);z-index:16000;display:none;align-items:center;justify-content:center;padding:20px;';document.body.appendChild(ov);}
        ov.innerHTML='<div style="background:#fff;border-radius:20px;padding:24px;max-width:340px;text-align:center;"><div style="font-size:36px;">⏳</div><b style="font-size:15px;">Đang chờ admin duyệt</b>' +
            '<div style="font-size:12px;color:#64748b;margin:10px 0;">Khi admin duyệt, XE GHÉP tự mở khóa tại đây.</div>' +
            '<button id="xgPOk" style="width:100%;padding:12px;border:none;border-radius:12px;background:#e2e8f0;font-weight:800;cursor:pointer;">ĐÓNG</button></div>';
        ov.style.display='flex';
        ov.querySelector('#xgPOk').onclick=function(){ov.style.display='none';};
        try{ db.ref('xg_subscriptions/'+drv.uid).on('value',function(s){
            var v=s.val()||{};
            if(isActive(v)){ ov.style.display='none'; syncSession(drv,v);
                if(typeof showToast==='function')showToast('🎉 XE GHÉP đã mở khóa!');
                if(typeof speak==='function')speak('Xe ghép đã được mở khóa.');
                db.ref('xg_subscriptions/'+drv.uid).off('value'); }
        }); }catch(e){}
    }

    /* ===== Tìm modal XE GHÉP đang hiện ===== */
    function findXGModal(){
        var els=document.querySelectorAll('div');
        for(var i=0;i<els.length;i++){
            var el=els[i], t=el.textContent||'';
            if(t.indexOf('XE GHÉP PROMAX')!==-1){
                var ov=el;
                while(ov&&ov!==document.body){ var cs=getComputedStyle(ov); if(cs.position==='fixed')break; ov=ov.parentElement; }
                if(ov&&ov!==document.body&&getComputedStyle(ov).display!=='none') return ov;
            }
        }
        return null;
    }

    /* ===== GÁC CỔNG: bấm gì mở XE GHÉP cũng bị kiểm tra ===== */
    document.addEventListener('click',function(e){
        var t=e.target, txt=(t&&(t.innerText||t.textContent))||'';
        if(txt.indexOf('XE GHÉP')===-1) return;
        setTimeout(function(){
            var m=findXGModal(); if(!m) return;
            var drv=getDriver(); if(!drv) return;
            getSub(drv.uid,function(d){
                if(isActive(d)){ syncSession(drv,d); return; }
                m.style.display='none';
                if(d&&d.status==='pending') showPending(drv); else showGate(drv,d||{});
            });
        },150);
    },true);

    /* Vẫn gác thêm ở hàm cũ nếu tồn tại */
    if(typeof window.openXeGhepModule==='function'){
        var _o=window.openXeGhepModule;
        window.openXeGhepModule=function(){
            var drv=getDriver(); if(!drv) return;
            getSub(drv.uid,function(d){
                if(isActive(d)){ syncSession(drv,d); _o(); }
                else if(d&&d.status==='pending') showPending(drv);
                else showGate(drv,d||{});
            });
        };
    }
    console.log('✅ XG LOCK v2 loaded — modal-level gate');
})();
