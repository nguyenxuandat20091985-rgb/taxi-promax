/*
 * Taxi ProMax — GPS boost inline v4
 * Cache chỉ là nguồn khởi tạo dữ liệu; không tự tạo watcher hoặc marker phụ.
 */
;(function(window,document){
  'use strict';
  var CACHE_KEY='promax_lastpos';
  function loadCachedPosition(){
    try{
      var value=JSON.parse(window.localStorage.getItem(CACHE_KEY)||'null');
      if(!value||!Number.isFinite(Number(value.lat))||!Number.isFinite(Number(value.lng)))return null;
      return value;
    }catch(e){return null;}
  }
  function showCachedPosition(){
    var cached=loadCachedPosition(),owner=window.PromaxMap;
    if(!cached||!owner||typeof owner.updateDriverMarker!=='function')return false;
    owner.updateDriverMarker(Number(cached.lat),Number(cached.lng),Number(cached.heading)||0);
    return true;
  }
  window.PromaxGpsBoostInline={showCachedPosition:showCachedPosition,loadCachedPosition:loadCachedPosition};
  window.setTimeout(showCachedPosition,0);
  console.log('✅ GPS BOOST INLINE v4 loaded — read-only cache, no secondary marker');
})(window,document);
