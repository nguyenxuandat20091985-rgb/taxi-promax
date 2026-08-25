/* ProMax extracted module: promax-pwa */
(function(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function(){
            navigator.serviceWorker.register('/sw.js?v=20260826').then(function(reg){
                try { reg.update(); } catch(e) {}
            }).catch(function(){});
            navigator.serviceWorker.addEventListener('controllerchange', function(){
                if (!sessionStorage.getItem('promax_sw_reloaded_v6')) {
                    sessionStorage.setItem('promax_sw_reloaded_v6', '1');
                    window.location.reload();
                }
            });
        });
    }
    function addMeta(name, content){
        if (!document.querySelector('meta[name="' + name + '"]')) {
            var m = document.createElement('meta'); m.name = name; m.content = content;
            document.head.appendChild(m);
        }
    }
    addMeta('theme-color', '#0054a3');
    addMeta('mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
})();
