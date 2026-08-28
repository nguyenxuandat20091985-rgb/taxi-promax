/*
 * PROMAX LOCATION CORE v2
 * GPS core runtime là owner duy nhất trong driver app.
 * Module này giữ API dùng chung nhưng không tự mở watchPosition.
 */
(function(window){
  'use strict';
  var M={version:'2.0-single-owner'};
  var buffer=[],last=null,speed=0,driverUnsubscribe=null;
  M.haversine=function(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));};
  M.smooth=function(lat,lng,acc){buffer.push({lat:lat,lng:lng,acc:acc});if(buffer.length>5)buffer.shift();if(buffer.length<3)return{lat:lat,lng:lng,acc:acc};var tw=0,sl=0,sg=0;buffer.forEach(function(p){var w=1/Math.max(p.acc,1);sl+=p.lat*w;sg+=p.lng*w;tw+=w;});return{lat:sl/tw,lng:sg/tw,acc:acc};};
  M.checkTeleport=function(lat,lng,ts){if(!last)return false;var dt=(ts-last.t)/1000,d=M.haversine(last.lat,last.lng,lat,lng);return(dt<5&&d>2)||(dt>0&&d/dt*3600>180);};
  M.setLast=function(lat,lng,ts){last={lat:lat,lng:lng,t:ts};};
  M.getLast=function(){return last;};
  M.ensurePermission=function(){return new Promise(function(resolve){if(!navigator.geolocation)return resolve(false);navigator.geolocation.getCurrentPosition(function(){resolve(true);},function(){resolve(false);},{enableHighAccuracy:true,timeout:8000,maximumAge:0});});};
  function fromCore(fix,opts){if(!fix||!opts||typeof opts.onFix!=='function')return;var lat=Number(fix.lat!=null?fix.lat:fix.coords&&fix.coords.latitude),lng=Number(fix.lng!=null?fix.lng:fix.coords&&fix.coords.longitude),acc=Number(fix.accuracy!=null?fix.accuracy:fix.acc!=null?fix.acc:fix.coords&&fix.coords.accuracy)||999,ts=Number(fix.timestamp||fix.ts||Date.now());if(!Number.isFinite(lat)||!Number.isFinite(lng)||M.checkTeleport(lat,lng,ts))return;var s=M.smooth(lat,lng,acc);M.setLast(s.lat,s.lng,ts);speed=Number(fix.speedKmh!=null?fix.speedKmh:fix.speed)||0;opts.onFix({lat:s.lat,lng:s.lng,acc:s.acc,accuracy:s.acc,speed:speed,ts:ts,timestamp:ts,heading:Number(fix.heading)||0});}
  M.startDriver=function(opts){opts=opts||{};M.stopDriver();var core=window.PromaxGPSCore;if(core&&typeof core.onFix==='function'){driverUnsubscribe=core.onFix(function(fix){fromCore(fix,opts);});return true;}var runtime=window.PromaxLegacyRuntime;if(runtime&&typeof runtime.getPosition==='function'){var tick=window.setInterval(function(){fromCore(runtime.getPosition(),opts);},1000);driverUnsubscribe=function(){window.clearInterval(tick);};return true;}return false;};
  M.stopDriver=function(){if(typeof driverUnsubscribe==='function'){try{driverUnsubscribe();}catch(e){}}driverUnsubscribe=null;};
  M.watchDriver=function(db,uid,cb){if(!db||!uid)return function(){};var ref=db.ref('tai_xe_online/'+uid),fn=function(s){var v=s.val();if(v&&v.lat&&typeof cb==='function')cb({lat:v.lat,lng:v.lng,name:v.name,ts:v.timestamp});};ref.on('value',fn);return function(){ref.off('value',fn);};};
  M.distanceTo=function(lat,lng){return last?Math.round(M.haversine(last.lat,last.lng,lat,lng)*10)/10:null;};
  M.moGoogleMaps=function(lat,lng){window.open('https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(lat+','+lng)+'&travelmode=driving','_blank');};
  M.onFix=function(fn){var core=window.PromaxGPSCore;return core&&typeof core.onFix==='function'?core.onFix(fn):function(){};};
  window.ProMaxLocation=M;
  window.ProMaxLocationCore=M;
  console.log('🛰️ ProMaxLocation Core v2 ready — read-only adapter, single GPS owner');
})(window);
