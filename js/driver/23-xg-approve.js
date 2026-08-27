// Extracted from index.html; load order is intentionally preserved.
(function(){
    function addBtn(){
        if(document.getElementById('xgApproveBtn'))return;
        var topbar=document.querySelector('.topbar'); if(!topbar)return;
        var btn=document.createElement('button'); btn.id='xgApproveBtn';
        btn.style.cssText='background:linear-gradient(135deg,#0e7490,#2563eb);color:#fff;border:none;padding:10px 14px;border-radius:20px;font-weight:800;font-size:12px;cursor:pointer;margin-left:8px;';
        btn.innerHTML='🚐 Duyệt XG <span id="xgPendCount" style="background:#ef4444;border-radius:10px;padding:1px 7px;font-size:10px;"></span>';
        btn.onclick=openList;
        var user=topbar.querySelector('.user'); if(user)user.insertAdjacentElement('afterend',btn); else topbar.appendChild(btn);
        refreshCount(); setInterval(refreshCount,20000);
    }
    function refreshCount(){
        try{ db.ref('xg_subscriptions').once('value').then(function(s){
            var n=0; s.forEach(function(c){ if((c.val()||{}).status==='pending')n++; });
            var el=document.getElementById('xgPendCount'); if(el)el.textContent=n||'';
        }); }catch(e){}
    }
    function openList(){
        var ov=document.getElementById('xgAdmin');
        if(!ov){ov=document.createElement('div');ov.id='xgAdmin';ov.style.cssText='position:fixed;inset:0;background:rgba(10,15,25,.7);backdrop-filter:blur(6px);z-index:20000;display:none;align-items:flex-end;justify-content:center;';document.body.appendChild(ov);}
        ov.style.display='flex'; load(ov);
    }
    function load(ov){
        ov.innerHTML='<div style="background:#fff;width:100%;max-width:560px;border-radius:24px 24px 0 0;max-height:90vh;overflow-y:auto;padding-bottom:20px;">' +
            '<div style="background:linear-gradient(135deg,#0e7490,#2563eb);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:5;border-radius:24px 24px 0 0;"><b>🚐 Duyệt XE GHÉP (100k/tháng)</b>' +
            '<button id="xgAClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div id="xgAList" style="padding:16px;"><div style="text-align:center;color:#94a3b8;padding:20px;">Đang tải...</div></div></div>';
        ov.querySelector('#xgAClose').onclick=function(){ov.style.display='none';};
        try{
            db.ref('xg_subscriptions').once('value').then(function(s){
                var list=[]; s.forEach(function(c){ list.push(Object.assign({uid:c.key},c.val()||{})); });
                list.sort(function(a,b){ return ((a.status==='pending')?0:1)-((b.status==='pending')?0:1)||((b.requestedAt||0)-(a.requestedAt||0)); });
                var box=ov.querySelector('#xgAList');
                if(!list.length){ box.innerHTML='<div style="text-align:center;color:#94a3b8;padding:20px;">Chưa có yêu cầu nào 🎉</div>'; return; }
                box.innerHTML=list.map(function(d,i){
                    var st=d.status==='pending'?'⏳ Chờ duyệt':(d.status==='active'?'✅ Còn '+Math.max(0,Math.ceil(((d.expiry||0)-Date.now())/86400000))+' ngày':'❌ Đã từ chối');
                    var acts=d.status==='pending'?('<div style="display:flex;gap:6px;margin-top:8px;">' +
                        '<button class="xgOk" data-i="'+i+'" style="flex:1;background:#15803d;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">✅ Duyệt (+30 ngày)</button>' +
                        '<button class="xgNo" data-i="'+i+'" style="flex:1;background:#b91c1c;color:#fff;border:none;border-radius:10px;padding:10px;font-weight:800;cursor:pointer;">❌ Từ chối</button></div>'):'';
                    return '<div style="border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:10px;">' +
                        '<div style="display:flex;justify-content:space-between;"><b>'+(d.name||d.phone||d.uid)+'</b><span style="font-size:11px;font-weight:800;">'+st+'</span></div>' +
                        '<div style="font-size:11px;color:#64748b;margin-top:4px;">📞 '+(d.phone||'')+' · 💵 '+(d.amount||100000).toLocaleString('vi-VN')+'đ · ND: '+(d.txCode||'')+'</div>' +
                        '<div style="font-size:10px;color:#94a3b8;margin-top:2px;">'+new Date(d.requestedAt||Date.now()).toLocaleString('vi-VN')+'</div>'+acts+'</div>';
                }).join('');
                box.querySelectorAll('.xgOk').forEach(function(b){ b.onclick=function(){ decide(list[+b.getAttribute('data-i')].uid,true,ov); }; });
                box.querySelectorAll('.xgNo').forEach(function(b){ b.onclick=function(){ decide(list[+b.getAttribute('data-i')].uid,false,ov); }; });
            });
        }catch(e){ ov.querySelector('#xgAList').innerHTML='<div style="color:#b91c1c;">Lỗi tải dữ liệu</div>'; }
    }
    function decide(uid,ok,ov){
        try{
            if(ok) db.ref('xg_subscriptions/'+uid).update({ status:'active', expiry:Date.now()+30*86400000, approvedAt:Date.now() });
            else db.ref('xg_subscriptions/'+uid).update({ status:'rejected', rejectedAt:Date.now() });
            refreshCount(); load(ov);
        }catch(e){}
    }
    function boot(){ var iv=setInterval(function(){ if(document.querySelector('.topbar')){ addBtn(); clearInterval(iv); } },500); }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
