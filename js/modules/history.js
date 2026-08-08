/* ========== 🗂️ HISTORY PRO v1 - xóa chuyến + sổ doanh thu 3 tháng ========== */
(function(){
    function getDriver(){ try{ if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo; }catch(e){}
        try{ var s=localStorage.getItem('driverInfo'); if(s){var d=JSON.parse(s); if(d&&d.uid)return d;} }catch(e){} return null; }
    function fmt(n){ return (n||0).toLocaleString('vi-VN')+'đ'; }
    function fmtShort(n){ n=n||0; return n>=1000000 ? (n/1000000).toFixed(1).replace('.',',')+'tr' : n.toLocaleString('vi-VN')+'đ'; }
    function keysNow(){ var d=new Date();
        var ws=new Date(d); ws.setDate(d.getDate()-((d.getDay()+6)%7));
        return { dk:d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),
                 wk:ws.getFullYear()+'-'+(ws.getMonth()+1)+'-'+ws.getDate(),
                 mk:d.getFullYear()+'-'+(d.getMonth()+1), m:d.getMonth()+1 }; }

    /* ===== 1) SỔ DOANH THU: cộng tự động mỗi chuyến ===== */
    function ledgerAdd(cost, ts, uid){
        try{
            var d=new Date(ts);
            var ws=new Date(d); ws.setDate(d.getDate()-((d.getDay()+6)%7));
            var buckets=[ ['days', d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()],
                          ['weeks', ws.getFullYear()+'-'+(ws.getMonth()+1)+'-'+ws.getDate()],
                          ['months', d.getFullYear()+'-'+(d.getMonth()+1)] ];
            buckets.forEach(function(b){
                var ref=db.ref('revenue/'+uid+'/'+b[0]+'/'+b[1]);
                ref.once('value').then(function(s){ var v=s.val()||{total:0,count:0};
                    ref.set({ total:(v.total||0)+cost, count:(v.count||0)+1 }); }).catch(function(){});
            });
        }catch(e){}
    }
    var _sh=window.saveHistory;
    window.saveHistory=async function(){
        var r; try{ r=await _sh.apply(this,arguments); }catch(e){ r=undefined; }
        try{
            var cost=(r&&r.cost!=null)?r.cost:arguments[2];
            var ts=(r&&r.timestamp)||Date.now();
            var uid=(r&&r.driverId)||((getDriver()||{}).uid);
            if(cost!=null&&uid) ledgerAdd(cost,ts,uid);
        }catch(e){}
        return r;
    };

    /* ===== 2) Tự dọn sổ: chỉ giữ 3 tháng ===== */
    function ledgerCleanup(uid){
        try{
            var cut=new Date(); cut.setDate(cut.getDate()-92);
            db.ref('revenue/'+uid).once('value').then(function(s){
                var v=s.val()||{}, del={};
                function old(k){ var p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]||1) < cut; }
                Object.keys(v.days||{}).forEach(function(k){ if(old(k)) del['days/'+k]=null; });
                Object.keys(v.weeks||{}).forEach(function(k){ if(old(k)) del['weeks/'+k]=null; });
                var mks=Object.keys(v.months||{}).sort(function(a,b){var pa=a.split('-'),pb=b.split('-');return (+pa[0]*12+ +pa[1])-(+pb[0]*12+ +pb[1]);});
                mks.slice(0,Math.max(0,mks.length-3)).forEach(function(k){ del['months/'+k]=null; });
                if(Object.keys(del).length) db.ref('revenue/'+uid).update(del);
            }).catch(function(){});
        }catch(e){}
    }

    /* ===== 3) renderHistory mới: thêm nút ✕ từng chuyến ===== */
    window.renderHistory=async function(){
        var list=document.getElementById('historyList'); if(!list)return;
        var drv=getDriver(), rows=[];
        try{ if(drv&&typeof db!=='undefined'){ var snap=await db.ref('trips/'+drv.uid).orderByChild('timestamp').limitToLast(50).once('value');
            var data=snap.val(); if(data) rows=Object.values(data).reverse(); } }catch(e){}
        if(!rows.length) rows=JSON.parse(localStorage.getItem('trip_history')||'[]');
        if(!rows.length){ list.innerHTML='<div style="text-align:center;padding:30px;color:#999;">Chưa có chuyến đi nào</div>'; return; }
        list.innerHTML=rows.map(function(h){
            var street=h.tripType==='STREET_HAIL';
            return '<div class="history-card"><div class="h-info"><b>'+h.time+'</b><br><small>'+(parseFloat(h.km)||0).toFixed(2)+' KM</small> '+
                '<span class="h-source '+(street?'street':'cloud')+'">'+(street?'🚕 Vẫy':'📱 App')+'</span></div>'+
                '<div style="display:flex;align-items:center;gap:8px;"><div class="h-price">'+(h.costLabel||fmt(h.cost))+'</div>'+
                '<button class="h-del" data-k="'+(h.timestamp||'')+'" style="background:#fee2e2;color:#b91c1c;border:none;border-radius:10px;width:30px;height:30px;font-weight:800;cursor:pointer;">✕</button></div></div>';
        }).join('');
    };

    /* Xóa từng chuyến */
    document.addEventListener('click',function(e){
        var b=e.target&&e.target.closest?e.target.closest('.h-del'):null; if(!b)return;
        var k=b.getAttribute('data-k'); if(!k)return;
        if(!confirm('Xóa chuyến này? (Doanh thu tổng kết vẫn giữ)'))return;
        var drv=getDriver();
        try{ if(drv)db.ref('trips/'+drv.uid+'/'+k).remove(); }catch(e){}
        try{ var loc=JSON.parse(localStorage.getItem('trip_history')||'[]');
            localStorage.setItem('trip_history',JSON.stringify(loc.filter(function(t){return String(t.timestamp)!==String(k);}))); }catch(e){}
        renderHistory(); if(typeof showToast==='function')showToast('🗑️ Đã xóa chuyến');
    });

    /* ===== 4) XÓA TẤT CẢ bản xịn: xóa cả Firebase ===== */
    function bindClearAll(){
        var b=document.querySelector('.btn-clear-history'); if(!b||b.dataset.fix)return; b.dataset.fix='1';
        b.onclick=function(){
            if(!confirm('Xóa TOÀN BỘ lịch sử chuyến?\n💰 Doanh thu tổng kết VẪN ĐƯỢC GIỮ.'))return;
            var drv=getDriver();
            try{ if(drv)db.ref('trips/'+drv.uid).remove(); }catch(e){}
            try{ localStorage.removeItem('trip_history'); }catch(e){}
            renderHistory(); if(typeof showToast==='function')showToast('🗑️ Đã xóa toàn bộ lịch sử');
        };
    }

    /* ===== 5) Thẻ DOANH THU trong tab Lịch sử ===== */
    function revenueCard(){
        var tab=document.getElementById('tab-lichsu'); if(!tab)return;
        var card=document.getElementById('revCard');
        if(!card){
            card=document.createElement('div'); card.id='revCard';
            card.style.cssText='margin:10px 15px;background:#fff;border-radius:16px;padding:14px;box-shadow:0 4px 12px rgba(0,0,0,.05);border-left:5px solid #00bfa5;';
            var hdr=tab.querySelector('.history-header'); if(hdr)hdr.insertAdjacentElement('afterend',card); else tab.appendChild(card);
        }
        var drv=getDriver(); if(!drv)return;
        try{
            db.ref('revenue/'+drv.uid).once('value').then(function(s){
                var v=s.val()||{}, k=keysNow();
                var d=(v.days||{})[k.dk], w=(v.weeks||{})[k.wk], m=(v.months||{})[k.mk];
                function box(lbl,val,color){ return '<div style="background:'+color+';border-radius:12px;padding:10px;text-align:center;">'+
                    '<div style="font-size:9px;font-weight:800;color:#64748b;">'+lbl+'</div>'+
                    '<div style="font-size:14px;font-weight:900;color:#1e293b;">'+fmtShort(val&&val.total)+'</div>'+
                    '<div style="font-size:9px;color:#94a3b8;">'+(val&&val.count||0)+' chuyến</div></div>'; }
                var mini='';
                var mks=Object.keys(v.months||{}).sort().slice(-3);
                if(mks.length){ mini='<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">'+mks.map(function(mk){
                    var p=mk.split('-'); return '<span style="background:#f1f5f9;border-radius:10px;padding:4px 10px;font-size:10px;font-weight:700;color:#475569;">T'+p[1]+': '+fmtShort(v.months[mk].total)+'</span>'; }).join('')+'</div>'; }
                card.innerHTML='<div style="font-size:13px;font-weight:800;color:#0054a3;margin-bottom:10px;">💰 DOANH THU · tự làm mới mỗi tháng · giữ 3 tháng</div>'+
                    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
                    box('HÔM NAY',d,'#f0f7ff')+box('TUẦN NÀY',w,'#f0fdf4')+box('THÁNG '+k.m,m,'#fff7ed')+'</div>'+mini;
            }).catch(function(){});
        }catch(e){}
    }

    /* Mở tab Lịch sử → làm mới */
    var _st=window.showTab;
    window.showTab=function(tab,btn){
        var r=_st?_st.apply(this,arguments):undefined;
        if(tab==='lichsu'){ setTimeout(function(){ bindClearAll(); revenueCard(); renderHistory(); },250); }
        return r;
    };

    function boot(){ var drv=getDriver(); if(drv)ledgerCleanup(drv.uid); bindClearAll(); }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
    setInterval(bindClearAll,2000);
    console.log('✅ HISTORY PRO v1 loaded');
})();