/*
 * Taxi ProMax — GPS dual adapter v3
 *
 * Không tạo geolocation watcher. GPS core/location-core là owner duy nhất.
 * Module này chỉ cung cấp adapter để legacy code đọc trạng thái hoặc nhận
 * một fix đã được core xác thực.
 */
;(function(window, document){
  'use strict';
  var listeners=[];
  var lastFix=null;

  function normalize(fix){
    if(!fix)return null;
    var c=fix.coords||fix;
    var lat=Number(c.latitude!=null?c.latitude:c.lat);
    var lng=Number(c.longitude!=null?c.longitude:c.lng!=null?c.lng:c.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    return {lat:lat,lng:lng,accuracy:Number(c.accuracy)||999,speed:Number(c.speed)||0,heading:Number(c.heading)||0,timestamp:Number(fix.timestamp||c.timestamp||Date.now())};
  }
  function publish(fix){
    var next=normalize(fix);if(!next)return;
    lastFix=next;
    listeners.slice().forEach(function(fn){try{fn(next);}catch(e){}});
  }
  function attach(){
    var core=window.PromaxGPSCore;
    if(core&&typeof core.onFix==='function'){core.onFix(publish);return true;}
    var loc=window.PromaxLocationCore;
    if(loc&&typeof loc.onFix==='function'){loc.onFix(publish);return true;}
    return false;
  }
  window.PromaxGpsFallback={
    start:function(){return attach();},
    stop:function(){},
    isFareActive:function(){return !window.tripEngine||typeof window.tripEngine.isFareActive!=='function'||window.tripEngine.isFareActive();},
    onFix:function(fn){
      if(typeof fn!=='function')return function(){};
      listeners.push(fn);
      if(lastFix)try{fn(lastFix);}catch(e){}
      return function(){listeners=listeners.filter(function(x){return x!==fn;});};
    },
    getLastFix:function(){return lastFix;}
  };
  attach();
  console.log('✅ GPS DUAL v3 loaded — read-only adapter, no watcher');
})(window,document);
