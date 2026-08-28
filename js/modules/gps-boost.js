/*
 * Taxi ProMax — GPS boost v4
 * Cache chỉ được dùng làm dữ liệu đọc; marker tài xế do map owner/core quản lý.
 */
;(function(window, document){
  'use strict';
  var CACHE_KEY='promax_lastpos';
  function readCache(){
    try{
      var value=JSON.parse(window.localStorage.getItem(CACHE_KEY)||'null');
      if(!value||!Number.isFinite(Number(value.lat))||!Number.isFinite(Number(value.lng)))return null;
      return value;
    }catch(e){return null;}
  }
  function renderCachedMarker(){
    var cached=readCache();
    if(!cached)return false;
    var mapOwner=window.PromaxMap;
    if(mapOwner&&typeof mapOwner.updateDriverMarker==='function'){
      mapOwner.updateDriverMarker(Number(cached.lat),Number(cached.lng),Number(cached.heading)||0);
      return true;
    }
    return false;
  }
  window.PromaxGpsBoost={renderCachedMarker:renderCachedMarker,readCache:readCache};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){window.setTimeout(renderCachedMarker,0);});
  else window.setTimeout(renderCachedMarker,0);
  console.log('✅ GPS BOOST v4 loaded — read-only cache, no secondary marker');
})(window,document);
