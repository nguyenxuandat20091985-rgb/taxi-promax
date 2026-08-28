/*
 * Taxi ProMax — History Pro v2
 * Hiển thị local-first, đồng bộ Firebase sau; không để request mạng làm trắng lịch sử.
 */
(function(){
    'use strict';

    function getDriver(){
        try { if(typeof driverInfo!=='undefined'&&driverInfo&&driverInfo.uid)return driverInfo; } catch(e){}
        try { var s=localStorage.getItem('driverInfo'); if(s){var d=JSON.parse(s);if(d&&d.uid)return d;} } catch(e){}
        return null;
    }
    function fmt(n){ return (Number(n)||0).toLocaleString('vi-VN')+'đ'; }
    function fmtShort(n){ n=Number(n)||0; return n>=1000000 ? (n/1000000).toFixed(1).replace('.',',')+'tr' : n.toLocaleString('vi-VN')+'đ'; }
    function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
    function readLocal(){
        try { var v=JSON.parse(localStorage.getItem('trip_history')||'[]'); return Array.isArray(v)?v:[]; } catch(e){ return []; }
    }
    function normalize(row){
        row=row||{};
        return {
            km:Number(row.km)||0,
            cost:Number(row.cost)||0,
            costLabel:row.costLabel||fmt(row.cost),
            time:row.time||new Date(Number(row.timestamp)||Date.now()).toLocaleString('vi-VN'),
            timestamp:Number(row.timestamp)||0,
            tripType:row.tripType||'APP_BOOKING',
            driverId:row.driverId||''
        };
    }
    function mergeRows(localRows,remoteRows){
        var byKey={};
        [].concat(remoteRows||[],localRows||[]).forEach(function(row){
            var item=normalize(row), key=String(item.timestamp||item.time);
            if(!byKey[key] || (item.cost && !byKey[key].cost)) byKey[key]=item;
        });
        return Object.keys(byKey).map(function(k){return byKey[k];}).sort(function(a,b){return (b.timestamp||0)-(a.timestamp||0);}).slice(0,100);
    }
    function renderRows(list){
        var box=document.getElementById('historyList'); if(!box)return;
        if(!list.length){box.innerHTML='<div style="text-align:center;padding:30px;color:#999;">Chưa có chuyến đi nào</div>';return;}
        box.innerHTML=list.map(function(h){
            var street=h.tripType==='STREET_HAIL';
            return '<div class="history-card"><div class="h-info"><b>'+esc(h.time)+'</b><br><small>'+h.km.toFixed(2)+' KM</small> '+
                '<span class="h-source '+(street?'street':'cloud')+'">'+(street?'🚕 Vẫy':'📱 App')+'</span></div>'+
                '<div style="display:flex;align-items:center;gap:8px;"><div class="h-price">'+esc(h.costLabel||fmt(h.cost))+'</div>'+
                '<button class="h-del" data-k="'+esc(h.timestamp)+'" style="background:#fee2e2;color:#b91c1c;border:none;border-radius:10px;width:30px;height:30px;font-weight:800;cursor:pointer;" aria-label="Xóa chuyến">✕</button></div></div>';
        }).join('');
    }

    /* Local-first: không chờ Firebase và không xóa local khi remote đang rỗng/chậm. */
    window.renderHistory=async function(){
        var localRows=readLocal();
        renderRows(localRows);
        var drv=getDriver();
        if(!drv||typeof db==='undefined')return localRows;
        try{
            var snap=await db.ref('trips/'+drv.uid).orderByChild('timestamp').limitToLast(50).once('value');
            var data=snap.val();
            var remoteRows=data?Object.keys(data).map(function(k){return data[k];}):[];
            var merged=mergeRows(localRows,remoteRows);
            if(merged.length)renderRows(merged);
            return merged;
        }catch(e){ return localRows; }
    };

    /* Giữ sổ doanh thu tổng kết sau khi core đã lưu chuyến. */
    function ledgerAdd(cost,ts,uid){
        try{
            var d=new Date(ts), ws=new Date(d); ws.setDate(d.getDate()-((d.getDay()+6)%7));
            [['days',d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()],['weeks',ws.getFullYear()+'-'+(ws.getMonth()+1)+'-'+ws.getDate()],['months',d.getFullYear()+'-'+(d.getMonth()+1)]].forEach(function(b){
                var ref=db.ref('revenue/'+uid+'/'+b[0]+'/'+b[1]);
                ref.once('value').then(function(s){var v=s.val()||{total:0,count:0};return ref.set({total:(v.total||0)+cost,count:(v.count||0)+1});}).catch(function(){});
            });
        }catch(e){}
    }
    var previousSave=window.saveHistory;
    window.saveHistory=async function(){
        var result;
        try{ result=typeof previousSave==='function'?await previousSave.apply(this,arguments):undefined; }catch(e){}
        try{
            var cost=Number(result&&result.cost!=null?result.cost:arguments[2])||0;
            var ts=Number(result&&result.timestamp)||Date.now();
            var uid=(result&&result.driverId)||((getDriver()||{}).uid);
            if(cost&&uid)ledgerAdd(cost,ts,uid);
        }catch(e){}
        renderHistory();
        return result;
    };

    function clearOldLedger(uid){
        try{
            var cut=new Date();cut.setDate(cut.getDate()-92);
            db.ref('revenue/'+uid).once('value').then(function(s){
                var v=s.val()||{},del={};
                function old(k){var p=k.split('-');return new Date(+p[0],+p[1]-1,+p[2]||1)<cut;}
                Object.keys(v.days||{}).forEach(function(k){if(old(k))del['days/'+k]=null;});
                Object.keys(v.weeks||{}).forEach(function(k){if(old(k))del['weeks/'+k]=null;});
                var mks=Object.keys(v.months||{}).sort();mks.slice(0,Math.max(0,mks.length-3)).forEach(function(k){del['months/'+k]=null;});
                if(Object.keys(del).length)db.ref('revenue/'+uid).update(del);
            }).catch(function(){});
        }catch(e){}
    }

    document.addEventListener('click',function(e){
        var b=e.target&&e.target.closest?e.target.closest('.h-del'):null;if(!b)return;
        var key=b.getAttribute('data-k');if(!key)return;
        if(!confirm('Xóa chuyến này? (Doanh thu tổng kết vẫn giữ)'))return;
        var drv=getDriver();
        try{if(drv&&typeof db!=='undefined')db.ref('trips/'+drv.uid+'/'+key).remove().catch(function(){});}catch(e){}
        try{localStorage.setItem('trip_history',JSON.stringify(readLocal().filter(function(t){return String(t.timestamp)!==String(key);})));}catch(e){}
        renderHistory();if(typeof showToast==='function')showToast('🗑️ Đã xóa chuyến');
    });

    function bindClearAll(){
        var b=document.querySelector('.btn-clear-history');if(!b||b.dataset.historyBound)return;b.dataset.historyBound='1';
        b.onclick=function(){
            if(!confirm('Xóa TOÀN BỘ lịch sử chuyến?\n💰 Doanh thu tổng kết VẪN ĐƯỢC GIỮ.'))return;
            var drv=getDriver();
            try{if(drv&&typeof db!=='undefined')db.ref('trips/'+drv.uid).remove().catch(function(){});}catch(e){}
            try{localStorage.removeItem('trip_history');}catch(e){}
            renderRows([]);if(typeof showToast==='function')showToast('🗑️ Đã xóa toàn bộ lịch sử');
        };
    }

    function keysNow(){var d=new Date(),ws=new Date(d);ws.setDate(d.getDate()-((d.getDay()+6)%7));return{dk:d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(),wk:ws.getFullYear()+'-'+(ws.getMonth()+1)+'-'+ws.getDate(),mk:d.getFullYear()+'-'+(d.getMonth()+1),m:d.getMonth()+1};}
    function revenueCard(){
        var tab=document.getElementById('tab-lichsu');if(!tab)return;
        var card=document.getElementById('revCard');if(!card){card=document.createElement('div');card.id='revCard';card.style.cssText='margin:10px 15px;background:#fff;border-radius:16px;padding:14px;box-shadow:0 4px 12px rgba(0,0,0,.05);border-left:5px solid #00bfa5;';var hdr=tab.querySelector('.history-header');if(hdr)hdr.insertAdjacentElement('afterend',card);else tab.appendChild(card);}
        var drv=getDriver();if(!drv||typeof db==='undefined')return;
        db.ref('revenue/'+drv.uid).once('value').then(function(s){
            var v=s.val()||{},k=keysNow(),d=(v.days||{})[k.dk],w=(v.weeks||{})[k.wk],m=(v.months||{})[k.mk];
            function box(label,val,color){return '<div style="background:'+color+';border-radius:12px;padding:10px;text-align:center;"><div style="font-size:9px;font-weight:800;color:#64748b;">'+label+'</div><div style="font-size:14px;font-weight:900;color:#1e293b;">'+fmtShort(val&&val.total)+'</div><div style="font-size:9px;color:#94a3b8;">'+(val&&val.count||0)+' chuyến</div></div>';}
            card.innerHTML='<div style="font-size:13px;font-weight:800;color:#0054a3;margin-bottom:10px;">💰 DOANH THU · tự làm mới mỗi tháng · giữ 3 tháng</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+box('HÔM NAY',d,'#f0f7ff')+box('TUẦN NÀY',w,'#f0fdf4')+box('THÁNG '+k.m,m,'#fff7ed')+'</div>';
        }).catch(function(){});
    }

    var previousShowTab=window.showTab;
    window.showTab=function(tab,btn){
        var result=previousShowTab?previousShowTab.apply(this,arguments):undefined;
        if(tab==='lichsu')setTimeout(function(){bindClearAll();revenueCard();window.renderHistory();},100);
        return result;
    };
    function boot(){var drv=getDriver();if(drv)clearOldLedger(drv.uid);bindClearAll();}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
    setInterval(bindClearAll,2000);
    console.log('✅ HISTORY PRO v2 loaded — local first');
})();
