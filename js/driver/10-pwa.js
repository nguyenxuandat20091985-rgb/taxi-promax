// Extracted from index.html; load order is intentionally preserved.
(function(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function(){
            navigator.serviceWorker.register('/sw.js').catch(function(){});
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
