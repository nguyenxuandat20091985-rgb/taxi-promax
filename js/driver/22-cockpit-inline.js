// Extracted from index.html; load order is intentionally preserved.
(function(){
    'use strict';
    var CFG = { MIN_FARE:20000, MAX_SPEED_KMH:140, MAX_GAP_KM:12, GAP_MS:12000, TELEPORT_KM:2, TELEPORT_S:5,
        MIN_MOVE_M:8, ACC_OK:120, SURGE_RAIN:1.3, SURGE_AM:1.2, SURGE_PM:1.25, SURGE_WK:1.15, BASE_RATE:15000, CAP:1.5,
        /* [v3.5] Adaptive fine-tune */
        GPS_HIGHWAY:300, GPS_CITY:900, GPS_TRAFFIC:1800, GPS_STILL:6000 };

    var pickupKm=0,tripKm=0,gapKm=0,lastGood=null,lastSpeeds=[],curSpeed=0,acc=999,lastFix=0;
    var wmaBuffer=[],etaInfo=null,demandFactor=1,gapCount=0;
    var gapLive=false,gapStartGapKm=0,drSpeed=0,drHeading=0,lastTick=0;
    /* [v3.5] Abort controllers */
    var etaController=null, osrmController=null;
    /* [v3.5] Debounce timestamp */
    var lastDisplayUpdate=0;

    function hav(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
    function avgSpeed(){if(!lastSpeeds.length)return 25;var s=0;for(var i=0;i<lastSpeeds.length;i++)s+=lastSpeeds[i];return Math.min(CFG.MAX_SPEED_KMH,Math.max(8,s/lastSpeeds.length));}

    function smoothGPS(lat,lng,accuracy){
        wmaBuffer.push({lat:lat,lng:lng,acc:accuracy});if(wmaBuffer.length>5)wmaBuffer.shift();
        if(wmaBuffer.length<3)return{lat:lat,lng:lng};
        var tw=0,sl=0,sg=0;for(var i=0;i<wmaBuffer.length;i++){var w=1/Math.max(wmaBuffer[i].acc,1);sl+=wmaBuffer[i].lat*w;sg+=wmaBuffer[i].lng*w;tw+=w;}
        return{lat:sl/tw,lng:sg/tw};
    }

    function confidence(accuracy){
        var c=100;
        if(accuracy>150)c-=50;else if(accuracy>100)c-=30;else if(accuracy>45)c-=15;else if(accuracy>20)c-=5;
        if(lastSpeeds.length>=4){var m=avgSpeed(),v=0;for(var i=0;i<lastSpeeds.length;i++)v+=Math.pow(lastSpeeds[i]-m,2);v/=lastSpeeds.length;if(v>400)c-=20;}
        c-=Math.min(30,gapCount*10);
        return Math.max(0,Math.min(100,c));
    }

    function isTeleport(lat,lng,ts){
        if(!lastGood)return false;
        var dt=(ts-lastGood.t)/1000,dH=hav(lastGood.lat,lastGood.lng,lat,lng);
        if(dt<CFG.TELEPORT_S&&dH>CFG.TELEPORT_KM){if(typeof showToast==='function')showToast('🚫 GPS nhảy bất thường — bỏ qua');return true;}
        if(dt>0&&(dH/dt*3600)>180){if(typeof showToast==='function')showToast('⚠️ Tốc độ không hợp lệ');return true;}
        return false;
    }

    /* [v3.5] Adaptive GPS fine-tune: 4 chế độ */
    var gpsTimer=null;
    function gpsInterval(){
        if(curSpeed>80)return CFG.GPS_HIGHWAY;     // cao tốc: 300ms
        if(curSpeed>20)return CFG.GPS_CITY;        // đường phố: 900ms
        if(curSpeed>2)return CFG.GPS_TRAFFIC;      // kẹt xe: 1800ms
        return CFG.GPS_STILL;                       // đứng yên: 6000ms
    }
    function scheduleGPS(){
        if(gpsTimer)clearTimeout(gpsTimer);
        gpsTimer=setTimeout(function(){
            if(typeof isRunning!=='undefined'&&isRunning&&navigator.geolocation){
                navigator.geolocation.getCurrentPosition(function(p){acc=p.coords.accuracy||999;lastFix=Date.now();
                    if(p.coords.speed&&p.coords.speed>0)curSpeed=Math.round(p.coords.speed*3.6);
                    scheduleGPS();
                },function(){scheduleGPS();},{enableHighAccuracy:true,maximumAge:1000});
            }
        },gpsInterval());
    }
    function stopGPS(){if(gpsTimer){clearTimeout(gpsTimer);gpsTimer=null;}}

    /* [v3.5] ETA với AbortController — hủy request cũ */
    function calcETA(toLat,toLng,mode){
        if(typeof currentLat==='undefined'||!currentLat)return;
        if(etaController)try{etaController.abort();}catch(e){}
        etaController=new AbortController();
        fetch('https://router.project-osrm.org/route/v1/driving/'+currentLng+','+currentLat+';'+toLng+','+toLat+'?overview=false',{signal:etaController.signal})
        .then(function(r){return r.json();}).then(function(d){
            if(d.routes&&d.routes[0]){
                var sec=d.routes[0].duration,h=new Date().getHours();
                if((h>=7&&h<=9)||(h>=17&&h<=19))sec*=1.3;
                etaInfo={min:Math.ceil(sec/60),km:(d.routes[0].distance/1000).toFixed(1),mode:mode};
            }
        }).catch(function(){});
    }
    function updateETADisplay(){
        var pill=document.getElementById('etaPill');
        if(!pill){pill=document.createElement('div');pill.id='etaPill';pill.className='eta-pill';document.body.appendChild(pill);}
        var running=(typeof isRunning!=='undefined')&&isRunning,picked=(typeof hasPickedUp!=='undefined')&&hasPickedUp;
        if(etaInfo&&running){pill.style.display='block';
            pill.innerHTML=picked?('🏁 Đến nơi: '+etaInfo.min+' phút'):('🕐 Tới khách: '+etaInfo.min+' phút · '+etaInfo.km+' km');}
        else pill.style.display='none';
    }

    setInterval(function(){
        try{
            if(typeof db==='undefined'||!window.driverInfo||!driverInfo.uid)return;
            db.ref('datxe').orderByChild('timestamp').limitToLast(30).once('value').then(function(s){
                var n=0;s.forEach(function(c){var o=c.val();if(o&&o.status==='waiting')n++;});
                demandFactor=n>=6?1.15:(n>=3?1.08:1);
            }).catch(function(){});
        }catch(e){}
    },60000);

    function surgeMult(){
        var now=new Date(),h=now.getHours(),day=now.getDay(),m=1;
        if(h>=7&&h<=9)m*=CFG.SURGE_AM;if(h>=17&&h<=19)m*=CFG.SURGE_PM;
        if(day===6||day===0)m*=CFG.SURGE_WK;
        if(typeof currentWeather!=='undefined'&&currentWeather&&currentWeather.rain)m*=CFG.SURGE_RAIN;
        m*=demandFactor;
        return Math.min(CFG.CAP,m);
    }
    function currentFareRate(){return Math.round(((typeof currentRate!=='undefined')?currentRate:CFG.BASE_RATE)*surgeMult());}
    function updateSurgeBadge(){
        var m=surgeMult(),b=document.getElementById('surgeBadge');
        if(!b){b=document.createElement('span');b.id='surgeBadge';b.className='surge-badge';var r=document.getElementById('rateLabel');if(r)r.insertAdjacentElement('afterend',b);}
        if(m>1.05){b.textContent='x'+m.toFixed(2);b.style.display='inline-block';}else b.style.display='none';
    }

    /* [v3.5] OSRM với AbortController */
    function roadDistance(p1,p2){
        return new Promise(function(res){
            if(osrmController)try{osrmController.abort();}catch(e){}
            osrmController=new AbortController();
            var t=setTimeout(function(){try{osrmController.abort();}catch(e){}res(null);},2800);
            fetch('https://router.project-osrm.org/route/v1/driving/'+p1.lng+','+p1.lat+';'+p2.lng+','+p2.lat+'?overview=false',{signal:osrmController.signal})
            .then(function(r){return r.json();}).then(function(d){clearTimeout(t);res(d.routes&&d.routes[0]?d.routes[0].distance/1000:null);})
            .catch(function(){clearTimeout(t);res(null);});
        });
    }
    function histKm(fT,tT,to){try{var h=(typeof locationHistory!=='undefined')?locationHistory:[];if(!h||h.length<3)return null;
        var rel=[];for(var i=0;i<h.length;i++){if(h[i].timestamp>=fT-30000&&h[i].timestamp<=tT+5000)rel.push(h[i]);}rel=rel.slice(-8);
        if(rel.length<2)return null;var t=0;for(var j=1;j<rel.length;j++)t+=hav(rel[j-1].lat,rel[j-1].lng,rel[j].lat,rel[j].lng);
        var lh=rel[rel.length-1];return t+hav(lh.lat,lh.lng,to.lat,to.lng);}catch(e){return null;}}

    function totalKmNow(){return pickupKm+tripKm+gapKm;}
    /* [v3.5] Debounce: chỉ update UI 10 lần/giây thay vì mỗi vòng 200ms */
    function updateAllDisplays(force){
        // Trip Engine là owner duy nhất của km/cước.
        if(window.tripEngine && typeof window.tripEngine.isFareActive==='function' && !window.tripEngine.isFareActive())return;
        var now=performance.now();
        if(!force&&now-lastDisplayUpdate<100)return;
        lastDisplayUpdate=now;
        var fare=Math.max(CFG.MIN_FARE,Math.round(totalKmNow()*currentFareRate()));
        var c=document.getElementById('cost'),k=document.getElementById('km'),t=document.getElementById('tripPrice');
        if(k)k.innerText=totalKmNow().toFixed(2);if(c)c.innerText=fare.toLocaleString('vi-VN');if(t)t.innerHTML=fare.toLocaleString('vi-VN')+'đ';
    }

    var _sh=window.saveHistory;
    window.saveHistory=async function(km,costLabel,costRaw,tripType){
        var fare=Math.max(CFG.MIN_FARE,Math.round((typeof costRaw==='number')?costRaw:0));
        var now=Date.now();
        var data={km:parseFloat(totalKmNow().toFixed(2)),cost:fare,costLabel:fare.toLocaleString('vi-VN'),
            time:new Date().toLocaleString('vi-VN'),timestamp:now,rate:currentFareRate(),
            driverId:(window.driverInfo&&driverInfo.uid)||'',tripType:tripType,
            pickupKm:+pickupKm.toFixed(2),tripKm:+tripKm.toFixed(2),gapKm:+gapKm.toFixed(2),surge:+surgeMult().toFixed(2)};
        try{var h=JSON.parse(localStorage.getItem('trip_history')||'[]');h.unshift(data);localStorage.setItem('trip_history',JSON.stringify(h.slice(0,100)));}catch(e){}
        try{if(typeof db!=='undefined')await db.ref('trips/'+data.driverId+'/'+now).set(data);}catch(e){}
        try{if(typeof renderHistory==='function')renderHistory();}catch(e){}
        return data;
    };

    /* ===== CORE (đã fix bug gapKm gán 2 lần) ===== */
    var lastAutonomousGpsCheck=0;
    function checkAutonomousGps(previous,current){
        if(!window.TaxiAutonomous||!previous||!current)return;
        var now=Date.now();
        if(now-lastAutonomousGpsCheck<15000)return;
        lastAutonomousGpsCheck=now;
        window.TaxiAutonomous.gpsCheck({previous:{lat:previous.lat,lng:previous.lng,timestamp:previous.t},current:{lat:current.lat,lng:current.lng,timestamp:current.t,accuracy:current.accuracy,speedKph:current.speedKph},history:[]})
            .then(function(payload){
                var result=payload&&payload.result;
                if(result&&result.suspicious&&typeof showToast==='function')showToast('⚠️ Lõi tự trị phát hiện GPS bất thường','error');
            }).catch(function(){});
    }
    async function smartAdd(lat,lng,accuracy,ts,speed,heading){
        // Không tính km ở pickup/waiting; chỉ FARE_CALCULATING mới được phép.
        if(window.tripEngine && typeof window.tripEngine.isFareActive==='function' && !window.tripEngine.isFareActive())return;
        if(typeof isRunning==='undefined'||!isRunning)return;
        var sm=smoothGPS(lat,lng,accuracy);lat=sm.lat;lng=sm.lng;
        if(isTeleport(lat,lng,ts))return;
        if(!lastGood){lastGood={lat:lat,lng:lng,t:ts,heading:heading||0};return;}
        var dt=(ts-lastGood.t)/1000;if(dt<=0.4)return;
        var dH=hav(lastGood.lat,lastGood.lng,lat,lng);
        var sp=(speed!=null&&speed>=0)?speed*3.6:(dH/dt*3600);
        if(sp>3&&sp<CFG.MAX_SPEED_KMH){lastSpeeds.push(sp);if(lastSpeeds.length>12)lastSpeeds.shift();curSpeed=Math.round(sp);}

        if(dt<CFG.GAP_MS/1000&&accuracy<=CFG.ACC_OK){
            gapLive=false;
            checkAutonomousGps(lastGood,{lat:lat,lng:lng,t:ts,accuracy:accuracy,speedKph:sp});
            if(confidence(accuracy)>=40){
                if(dH*1000>=CFG.MIN_MOVE_M&&dH<0.8){
                    if((typeof hasPickedUp!=='undefined')&&hasPickedUp)tripKm+=dH;else pickupKm+=dH;
                    updateAllDisplays(true);
                }
            }
            lastGood={lat:lat,lng:lng,t:ts,heading:heading||lastGood.heading||0};return;
        }

        /* [FIX] Mất sóng: KHÔNG cộng vào gapKm ở đây, DR loop sẽ cộng live */
        if(dt>=CFG.GAP_MS/1000){
            gapCount++;if(typeof showGapNotice==='function')showGapNotice();
            /* Đánh dấu bắt đầu gap nếu chưa */
            if(!gapLive){gapLive=true;gapStartGapKm=gapKm;drSpeed=curSpeed;drHeading=lastGood?lastGood.heading:0;}
            /* KHÔNG cộng OSRM vào gapKm nữa — DR loop xử lý, tránh double */
        }
        if(accuracy<=CFG.ACC_OK){
            checkAutonomousGps(lastGood,{lat:lat,lng:lng,t:ts,accuracy:accuracy,speedKph:sp});
            lastGood={lat:lat,lng:lng,t:ts,heading:heading||lastGood.heading||0};
        }
    }

    var _oldProcess=window.processBackgroundLocation;
    window.processBackgroundLocation=function(loc){
        if(typeof _oldProcess==='function'){try{_oldProcess(loc);}catch(e){}}
        var lat,lng,ac,spd,hdg;
        if(loc&&loc.coords){lat=loc.coords.latitude;lng=loc.coords.longitude;ac=loc.coords.accuracy;spd=loc.coords.speed;hdg=loc.coords.heading;}
        else if(loc){lat=loc.latitude;lng=loc.longitude;ac=loc.accuracy;spd=loc.speed;hdg=loc.heading;}
        var ts=(loc&&loc.timestamp)||Date.now();
        if(lat==null||lng==null||isNaN(lat)||isNaN(lng))return;
        ac=ac||999;lastFix=Date.now();acc=ac;
        if(ac>280)return;
        smartAdd(lat,lng,ac,ts,spd,hdg);
    };

    if(false && navigator.geolocation){navigator.geolocation.watchPosition(function(p){acc=p.coords.accuracy||999;lastFix=Date.now();
        if(p.coords.speed&&p.coords.speed>0)curSpeed=Math.round(p.coords.speed*3.6);},function(){},{enableHighAccuracy:true,maximumAge:2000});}

    function resetKm(){pickupKm=0;tripKm=0;gapKm=0;lastGood=null;lastSpeeds=[];wmaBuffer=[];etaInfo=null;gapCount=0;gapLive=false;gapStartGapKm=0;drSpeed=0;drHeading=0;}
    var _oldHandle=window.handleTrip;
    window.handleTrip=function(){if(typeof isRunning!=='undefined'&&!isRunning)resetKm();return _oldHandle?_oldHandle.apply(this,arguments):undefined;};
    var _oldAccept=window.acceptOrder;
    if(typeof _oldAccept==='function'){window.acceptOrder=function(){resetKm();
        try{if(currentCustomerData&&currentCustomerData.pickupLat)calcETA(currentCustomerData.pickupLat,currentCustomerData.pickupLng,'pickup');}catch(e){}
        return _oldAccept.apply(this,arguments);};}
    var _oldPickup=window.confirmPickup;
    if(typeof _oldPickup==='function'){window.confirmPickup=function(){var r=_oldPickup.apply(this,arguments);
        try{if(currentCustomerData&&currentCustomerData.dropoffLat)calcETA(currentCustomerData.dropoffLat,currentCustomerData.dropoffLng,'drop');}catch(e){}return r;};}

    function swapTiles(){if(typeof map==='undefined'||!map||map._ck)return;try{map.eachLayer(function(l){try{if(l._url)map.removeLayer(l);}catch(e){}});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);map._ck=1;}catch(e){}}
    function addStats(){var bar=document.getElementById('statsUI');if(!bar||bar.dataset.t2)return;bar.dataset.t2='1';
        bar.insertAdjacentHTML('beforeend','<div class="stat-item"><div class="stat-label">THỜI GIAN</div><div class="stat-value" id="t2val">0:00</div></div><div class="stat-item"><div class="stat-label">TỐC ĐỘ</div><div class="stat-value" id="speedVal">0</div></div>');}
    function polish(){var labs=document.querySelectorAll('#statsUI .stat-label');
        for(var i=0;i<labs.length;i++){var t=labs[i].innerText;if(t.indexOf('CƯỚC')===0)labs[i].innerText='CƯỚC (Đ)';if(t.indexOf('KHOẢNG')===0)labs[i].innerText='KM';}
        var b=document.querySelector('.trip-end-btn');if(b&&!b.dataset.slim){b.dataset.slim='1';b.innerHTML='🏁 HOÀN THÀNH CHUYẾN';}}
    function addTripHandle(){var p=document.getElementById('tripInfoPanel');if(!p||p.dataset.cp)return;p.dataset.cp='1';
        var h=document.createElement('button');h.className='cp-handle';h.innerHTML='▲ Mở rộng';
        h.onclick=function(){p.classList.toggle('compact');h.innerHTML=p.classList.contains('compact')?'▲ Mở rộng':'▼ Thu gọn';try{map.invalidateSize();}catch(e){}};
        p.insertBefore(h,p.firstChild);}
    function addHomeHandle(){var fc=document.querySelector('.footer-panel');if(!fc||fc.dataset.hp)return;fc.dataset.hp='1';
        var h=document.createElement('button');h.className='hp-handle';h.innerHTML='▼ Bản đồ to hơn';fc.insertBefore(h,fc.firstChild);
        var rateRow=null;fc.querySelectorAll('div').forEach(function(d){if(d.textContent.indexOf('GIÁ/KM')!==-1&&!d.querySelector('#mainBtn')){if(!rateRow||d.children.length<=rateRow.children.length)rateRow=d;}});
        if(rateRow)rateRow.classList.add('hp-rate-row');
        h.onclick=function(){fc.classList.toggle('deck-compact');h.innerHTML=fc.classList.contains('deck-compact')?'▲ Hiện đủ controls':'▼ Bản đồ to hơn';try{map.invalidateSize();}catch(e){}};
        if(window.innerHeight<700){fc.classList.add('deck-compact');h.innerHTML='▲ Hiện đủ controls';}
        window.addEventListener('resize',function(){try{map.invalidateSize();}catch(e){}});}
    function gpsHelp(){var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:30000;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.innerHTML='<div style="background:#fff;border-radius:20px;padding:24px;max-width:340px;text-align:center;"><div style="font-size:34px;">📡</div><b style="font-size:16px;">GPS đang bị tắt / từ chối</b><div style="font-size:13px;color:#475569;margin:12px 0;line-height:1.7;text-align:left;">1. Bấm biểu tượng 🔒 cạnh thanh địa chỉ<br>2. Chọn <b>Vị trí → Cho phép</b><br>3. Bấm ⟳ tải lại trang</div><button id="gpsRetry" style="width:100%;padding:12px;border:none;border-radius:12px;background:#0054a3;color:#fff;font-weight:800;margin-bottom:8px;cursor:pointer;">🔄 Thử yêu cầu lại</button><button id="gpsOk" style="width:100%;padding:12px;border:none;border-radius:12px;background:#e2e8f0;font-weight:800;cursor:pointer;">ĐÃ HIỂU</button></div>';
        document.body.appendChild(ov);
        ov.querySelector('#gpsOk').onclick=function(){ov.remove();};
        ov.querySelector('#gpsRetry').onclick=function(){try{navigator.geolocation.getCurrentPosition(function(){ov.remove();if(typeof showToast==='function')showToast('✅ GPS đã bật!');},function(){if(typeof showToast==='function')showToast('⚠️ Vẫn bị chặn — làm theo 3 bước');});}catch(e){}};}
    function bindGpsPill(){var pill=document.querySelector('.gps-status-bar');if(pill&&!pill.dataset.help){pill.dataset.help='1';pill.style.cursor='pointer';pill.addEventListener('click',gpsHelp);}}

    /* ===== VÒNG LẶP CHÍNH + [#1] DR bằng heading ===== */
    var tripStart=0,lastWarn=0,zoomDone=false;
    setInterval(function(){
        try{
            swapTiles();addStats();polish();addTripHandle();addHomeHandle();bindGpsPill();updateSurgeBadge();updateETADisplay();
            var running=(typeof isRunning!=='undefined')&&isRunning;
            var picked=(typeof hasPickedUp!=='undefined')&&hasPickedUp;
            var p=document.getElementById('tripInfoPanel');
            var now=Date.now();
            var dtReal=lastTick?(now-lastTick)/1000:0.5;lastTick=now;

            if(running&&!tripStart){tripStart=now;scheduleGPS();}
            if(!running){tripStart=0;zoomDone=false;stopGPS();gapLive=false;if(p)p.dataset.auto='';}

            var fp=document.querySelector('.footer-panel');
            if(fp)fp.style.display=(running&&p&&p.classList.contains('compact'))?'none':'';
            if(running&&picked&&p&&!p.classList.contains('compact')&&!p.dataset.auto){p.dataset.auto='1';p.classList.add('compact');}
            if(running&&!zoomDone&&typeof map!=='undefined'&&map){if(map.getZoom()<16)map.setZoom(17);zoomDone=true;}

            if(running&&now-lastFix>15000&&now-lastWarn>30000){lastWarn=now;
                if(typeof showToast==='function')showToast('⚠️ GPS tắt — bấm chấm đỏ xem cách bật');
                if(typeof speak==='function')speak('Cảnh báo. GPS đang bị tắt.');}

            /* [#1] DR với heading — xe đi đúng hướng trong hầm */
            if(running&&now-lastFix>CFG.GAP_MS){
                if(!gapLive){gapLive=true;gapStartGapKm=gapKm;drSpeed=curSpeed;drHeading=lastGood?lastGood.heading:0;}
                drSpeed=Math.max(0,drSpeed-0.4*dtReal);
                var addKm=(drSpeed/3600)*dtReal;
                gapKm+=addKm;
                /* Trần: không vượt quá OSRM estimate hoặc 12km */
                gapKm=Math.min(gapKm,gapStartGapKm+CFG.MAX_GAP_KM);
            } else if(gapLive&&now-lastFix<CFG.GAP_MS){
                /* Đã ra khỏi gap — đối soát OSRM */
                gapLive=false;
                try{
                    roadDistance({lat:lastGood.lat,lng:lastGood.lng},{lat:(typeof currentLat!=='undefined')?currentLat:0,lng:(typeof currentLng!=='undefined')?currentLng:0})
                    .then(function(road){
                        if(road!=null&&road>0){
                            /* Thay DR bằng đường thật nếu chính xác hơn */
                            var drAdded=gapKm-gapStartGapKm;
                            if(Math.abs(road-drAdded)>0.5){
                                gapKm=gapStartGapKm+road;
                                updateAllDisplays(true);
                                if(typeof showToast==='function')showToast('📡 Đã bù '+(road).toFixed(2)+' km (mất sóng)');
                            }
                        }
                    });
                }catch(e){}
            }

            if(running){
                updateAllDisplays();
                var el=Math.floor((now-tripStart)/1000);
                var t2=document.getElementById('t2val');if(t2)t2.innerText=Math.floor(el/60)+':'+(el%60<10?'0':'')+(el%60);
                var sv=document.getElementById('speedVal');if(sv)sv.innerText=curSpeed;
                if(picked&&typeof currentCustomerData!=='undefined'&&currentCustomerData&&currentCustomerData.dropoffLat){
                    if(!window._etaLast||now-window._etaLast>30000){calcETA(currentCustomerData.dropoffLat,currentCustomerData.dropoffLng,'drop');window._etaLast=now;}
                }
            }
        }catch(e){}
    },500);
    console.log('✅ COCKPIT ULTRA v3.5 — fix 3 bugs + heading DR + abort + debounce');
})();
