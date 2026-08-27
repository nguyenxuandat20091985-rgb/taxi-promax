// Extracted from index.html; load order is intentionally preserved.
(function(){
    /* ===== CSS premium ===== */
    var css = document.createElement('style');
    css.textContent =
        '@keyframes pmPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}' +
        '.footer-panel{background:rgba(255,255,255,.94)!important;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 -16px 40px rgba(15,39,68,.14)!important;border-top:1px solid rgba(0,84,163,.08)!important;}' +
        'body.dark-mode .footer-panel,body.dark .footer-panel{background:rgba(18,24,34,.94)!important;}' +
        '.nav-grid{display:flex!important;justify-content:space-around!important;align-items:flex-end!important;gap:4px;padding-top:10px!important;}' +
        '.nav-item{flex:1;display:flex!important;flex-direction:column!important;align-items:center!important;gap:4px;padding:6px 4px 8px!important;border:none;background:none;cursor:pointer;position:relative;}' +
        '.nav-ico{width:52px;height:32px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:15px;color:#8aa0b8;background:transparent;transition:all .28s cubic-bezier(.34,1.56,.64,1);}' +
        '.nav-ico i{font-size:15px!important;display:block!important;margin:0!important;color:inherit!important;}' +
        '.nav-item.active .nav-ico{background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;box-shadow:0 8px 18px rgba(0,191,165,.35);transform:translateY(-6px);}' +
        '.nav-item:active .nav-ico{transform:scale(.88);}' +
        '.nav-lab{font-size:10px!important;font-weight:800!important;color:#94a3b8!important;letter-spacing:.2px;transition:color .2s;}' +
        '.nav-item.active .nav-lab{color:#0054a3!important;}' +
        'body.dark-mode .nav-lab,body.dark .nav-lab{color:#64748b!important;}' +
        'body.dark-mode .nav-item.active .nav-lab,body.dark .nav-item.active .nav-lab{color:#00bfa5!important;}' +
        '.nav-item.active .nav-lab::after{content:"";display:block;width:4px;height:4px;border-radius:50%;background:#00bfa5;margin:3px auto 0;}' +
        '.brand-footer{font-size:8px!important;color:#b6c4d4!important;}';
    document.head.appendChild(css);

    /* ===== 1) Nâng cấp icon tab ===== */
    var ICONS = [
        { match: 'Trang chủ', fa: 'fa-house' },
        { match: 'Ví tiền',   fa: 'fa-wallet' },
        { match: 'Lịch sử',   fa: 'fa-chart-line' },
        { match: 'Tôi',       fa: 'fa-user' }
    ];
    function upgradeTabs(){
        var items = document.querySelectorAll('.nav-item');
        for (var k = 0; k < items.length; k++){
            var el = items[k];
            if (el.dataset.premium) continue;
            el.dataset.premium = '1';
            var label = (el.innerText || '').trim();
            var fa = 'fa-circle';
            for (var i = 0; i < ICONS.length; i++){
                if (label.indexOf(ICONS[i].match) !== -1) fa = ICONS[i].fa;
            }
            var ico = document.createElement('div');
            ico.className = 'nav-ico';
            ico.innerHTML = '<i class="fas ' + fa + '"></i>';
            var lab = document.createElement('span');
            lab.className = 'nav-lab';
            lab.textContent = label;
            el.innerHTML = '';
            el.appendChild(ico);
            el.appendChild(lab);
        }
    }

    /* ===== 2) Hộp thoại đẹp thay alert ===== */
    window.alert = function(msg){
        var old = document.getElementById('pmAlert');
        if (old) old.remove();
        var wrap = document.createElement('div');
        wrap.id = 'pmAlert';
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.55);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:24px;padding:26px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:pmPop .25s ease;';
        var logo = document.createElement('div');
        logo.style.cssText = 'width:64px;height:64px;margin:0 auto 14px;border-radius:20px;background:linear-gradient(135deg,#0054a3,#00bfa5);display:flex;align-items:center;justify-content:center;font-size:28px;';
        logo.textContent = '🚖';
        var txt = document.createElement('div');
        txt.style.cssText = 'font-size:15px;font-weight:700;color:#1e293b;line-height:1.5;white-space:pre-line;';
        txt.textContent = String(msg);
        var btn = document.createElement('button');
        btn.style.cssText = 'margin-top:18px;width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;';
        btn.textContent = 'OK';
        btn.onclick = function(){ wrap.remove(); };
        wrap.addEventListener('click', function(e){ if (e.target === wrap) wrap.remove(); });
        card.appendChild(logo); card.appendChild(txt); card.appendChild(btn);
        wrap.appendChild(card);
        document.body.appendChild(wrap);
    };

    function boot(){ upgradeTabs(); setInterval(upgradeTabs, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
