/*
 * Taxi ProMax — Premium driver UI
 *
 * Bottom navigation dùng SVG inline, không phụ thuộc Font Awesome CDN.
 * Điều này giữ icon Home/History hiển thị ngay cả khi mạng chậm hoặc CDN lỗi.
 */
;(function (window, document) {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pmPop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
    .footer-panel { background: rgba(255,255,255,.94)!important; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: 0 -16px 40px rgba(15,39,68,.14)!important; border-top: 1px solid rgba(0,84,163,.08)!important; }
    body.dark-mode .footer-panel, body.dark .footer-panel { background: rgba(18,24,34,.94)!important; }
    .nav-grid { display:flex!important; justify-content:space-around!important; align-items:flex-end!important; gap:4px; padding-top:10px!important; }
    .nav-item { flex:1; display:flex!important; flex-direction:column!important; align-items:center!important; gap:4px; padding:6px 4px 8px!important; border:none; background:none; cursor:pointer; position:relative; }
    .nav-ico { width:52px; height:32px; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#8aa0b8; background:transparent; transition:all .28s cubic-bezier(.34,1.56,.64,1); }
    .nav-ico svg { width:19px; height:19px; display:block; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .nav-item.active .nav-ico { background:linear-gradient(135deg,#0054a3,#00bfa5); color:#fff; box-shadow:0 8px 18px rgba(0,191,165,.35); transform:translateY(-6px); }
    .nav-item:active .nav-ico { transform:scale(.88); }
    .nav-lab { font-size:10px!important; font-weight:800!important; color:#94a3b8!important; letter-spacing:.2px; transition:color .2s; }
    .nav-item.active .nav-lab { color:#0054a3!important; }
    body.dark-mode .nav-lab, body.dark .nav-lab { color:#64748b!important; }
    body.dark-mode .nav-item.active .nav-lab, body.dark .nav-item.active .nav-lab { color:#00bfa5!important; }
    .nav-item.active .nav-lab::after { content:""; display:block; width:4px; height:4px; border-radius:50%; background:#00bfa5; margin:3px auto 0; }
    .brand-footer { font-size:8px!important; color:#b6c4d4!important; }
  `;
  document.head.appendChild(style);

  const ICONS = {
    'Trang chủ': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8"></path><path d="M5.5 9.8V21h13V9.8"></path><path d="M9.5 21v-6h5v6"></path></svg>',
    'Ví tiền': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 9h18"></path><path d="M16 14h2"></path></svg>',
    'Lịch sử': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 7v5l3 2"></path></svg>',
    'Tôi': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 21c.8-3.5 3-5.5 7-5.5s6.2 2 7 5.5"></path></svg>'
  };

  function iconFor(label) {
    const normalized = String(label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (normalized.includes('trang chu') || normalized === 'home' || normalized.startsWith('home ')) return ICONS['Trang chủ'];
    if (normalized.includes('lich su') || normalized === 'history' || normalized.startsWith('history ')) return ICONS['Lịch sử'];
    if (normalized.includes('vi tien') || normalized === 'wallet' || normalized.startsWith('wallet ')) return ICONS['Ví tiền'];
    if (normalized === 'toi' || normalized === 'profile' || normalized === 'me') return ICONS['Tôi'];
    const key = Object.keys(ICONS).find((name) => label.indexOf(name) !== -1);
    return key ? ICONS[key] : ICONS['Trang chủ'];
  }

  function upgradeTabs() {
    const items = document.querySelectorAll('.nav-item');
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const oldLabel = item.querySelector('.nav-lab');
      const label = (oldLabel ? oldLabel.textContent : item.textContent || '').trim();
      if (!label) continue;
      const currentIcon = item.querySelector('.nav-ico svg');
      // Dựng lại nếu label bị đổi ngôn ngữ sau lần boot đầu tiên.
      if (item.dataset.premium === '1' && currentIcon && item.dataset.iconLabel === label) continue;
      item.dataset.premium = '1';
      item.dataset.iconLabel = label;
      item.innerHTML = '';

      const icon = document.createElement('span');
      icon.className = 'nav-ico';
      icon.innerHTML = iconFor(label);
      icon.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'nav-lab';
      text.textContent = label;

      item.appendChild(icon);
      item.appendChild(text);
    }
  }

  function showNativeAlert(message) {
    const old = document.getElementById('pmAlert');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'pmAlert';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.55);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:24px;padding:26px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:pmPop .25s ease;';
    const logo = document.createElement('div');
    logo.style.cssText = 'width:64px;height:64px;margin:0 auto 14px;border-radius:20px;background:linear-gradient(135deg,#0054a3,#00bfa5);display:flex;align-items:center;justify-content:center;font-size:28px;';
    logo.textContent = '🚖';
    const text = document.createElement('div');
    text.style.cssText = 'font-size:15px;font-weight:700;color:#1e293b;line-height:1.5;white-space:pre-line;';
    text.textContent = String(message);
    const button = document.createElement('button');
    button.style.cssText = 'margin-top:18px;width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;';
    button.textContent = 'OK';
    button.onclick = function () { wrap.remove(); };
    wrap.addEventListener('click', function (event) { if (event.target === wrap) wrap.remove(); });
    card.appendChild(logo);
    card.appendChild(text);
    card.appendChild(button);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  window.alert = showNativeAlert;

  function boot() {
    upgradeTabs();
    window.setInterval(upgradeTabs, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
