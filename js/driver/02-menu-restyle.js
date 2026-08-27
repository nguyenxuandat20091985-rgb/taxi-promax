// Extracted from index.html; load order is intentionally preserved.
(function(){
    var css = document.createElement('style');
    css.textContent =
        '.sidebar-menu{padding:0 !important;}' +
        '.sidebar-menu>div,.sidebar-menu>a{display:flex !important;align-items:center !important;gap:14px !important;padding:14px 20px !important;border-bottom:1px solid #f0f0f0 !important;cursor:pointer;background:#fff;text-decoration:none;transition:.2s;}' +
        '.sidebar-menu>div:active,.sidebar-menu>a:active{background:#f5f5f5 !important;}' +
        '.sidebar-menu i[class*="fa-"]{width:24px !important;font-size:18px !important;color:#0054a3 !important;}' +
        '.sidebar-menu>div>span:first-child,.sidebar-menu>a>span:first-child{width:24px !important;text-align:center !important;font-size:18px !important;color:#1c1e21 !important;}' +
        '.sidebar-menu span{font-size:14px !important;font-weight:600 !important;color:#1c1e21 !important;}' +
        '.sidebar-menu span[style*="background"]{color:#fff !important;font-size:9px !important;padding:2px 6px !important;border-radius:10px !important;margin-left:6px;}';
    document.head.appendChild(css);

    function fixClasses(){
        var menu = document.querySelector('.sidebar-menu');
        if (!menu) return;
        for (var i = 0; i < menu.children.length; i++){
            var el = menu.children[i];
            if ((el.tagName === 'DIV' || el.tagName === 'A') && el.classList && !el.classList.contains('sidebar-item')) {
                el.classList.add('sidebar-item');
            }
        }
    }
    function boot(){ fixClasses(); setInterval(fixClasses, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
