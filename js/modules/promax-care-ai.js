/* ProMax Care AI — sidebar menu entry, closable panel, no floating button */
(function (window, document) {
  'use strict';
  if (window.PromaxCareAI) return;

  var CARE_CHANNEL = window.PROMAX_CARE_CHANNEL || 'driver';
  var panel = null;
  var log = null;
  var input = null;
  var sending = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function uid() {
    try { if (window.driverInfo && window.driverInfo.uid) return window.driverInfo.uid; } catch (e) {}
    try { return localStorage.getItem('promax_uid') || 'anon'; } catch (e) { return 'anon'; }
  }

  function appendMessage(text, mine) {
    if (!log) return;
    var row = document.createElement('div');
    row.style.cssText = 'margin:6px 0;text-align:' + (mine ? 'right' : 'left') + ';';
    row.innerHTML = '<span style="background:' + (mine ? '#e8f1fb' : '#f1f5f9') + ';padding:7px 10px;border-radius:12px;display:inline-block;max-width:90%;white-space:pre-wrap;word-break:break-word;">' + esc(text) + '</span>';
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function send() {
    if (sending || !input || !log) return;
    var msg = (input.value || '').trim();
    if (!msg) return;
    input.value = '';
    appendMessage(msg, true);
    sending = true;
    var sendBtn = document.getElementById('promaxCareSend');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }
    try {
      var res = await fetch('/api/ai-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: CARE_CHANNEL,
          userId: uid(),
          message: msg,
          sessionId: localStorage.getItem('care_session_' + CARE_CHANNEL) || undefined
        })
      });
      var data = await res.json();
      if (data.sessionId) localStorage.setItem('care_session_' + CARE_CHANNEL, data.sessionId);
      appendMessage(data.answer || data.error || 'Không có phản hồi', false);
      if (data.escalate) {
        var note = document.createElement('div');
        note.style.cssText = 'font-size:11px;color:#d32f2f;margin-top:4px;';
        note.textContent = 'Đã báo admin xử lý ưu tiên';
        log.appendChild(note);
      }
    } catch (e) {
      appendMessage('Lỗi kết nối Care AI. Anh thử lại sau.', false);
    } finally {
      sending = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Gửi'; }
      if (input) input.focus();
    }
  }

  function close() {
    if (panel) panel.style.display = 'none';
    document.body.classList.remove('promax-care-open');
  }

  function open() {
    ensurePanel();
    if (!panel) return;
    panel.style.display = 'flex';
    document.body.classList.add('promax-care-open');
    if (input) setTimeout(function () { input.focus(); }, 50);
  }

  function ensurePanel() {
    if (panel && document.body.contains(panel)) return;
    panel = document.createElement('section');
    panel.id = 'promaxCarePanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'ProMax Care AI');
    panel.innerHTML =
      '<div class="promax-care-head"><strong>ProMax Care AI</strong><button type="button" id="promaxCareClose" aria-label="Đóng Care AI">×</button></div>' +
      '<div id="promaxCareLog" class="promax-care-log" aria-live="polite"></div>' +
      '<div class="promax-care-form"><input id="promaxCareInput" type="text" placeholder="Nhập câu hỏi..." autocomplete="off" /><button type="button" id="promaxCareSend">Gửi</button></div>';
    document.body.appendChild(panel);
    log = document.getElementById('promaxCareLog');
    input = document.getElementById('promaxCareInput');
    document.getElementById('promaxCareClose').addEventListener('click', close);
    document.getElementById('promaxCareSend').addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); if (e.key === 'Escape') close(); });
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
  }

  function addMenuItem() {
    var menu = document.querySelector('.sidebar-menu');
    if (!menu || document.getElementById('promaxCareMenuItem')) return;
    var item = document.createElement('div');
    item.id = 'promaxCareMenuItem';
    item.className = 'sidebar-item';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.innerHTML = '<i class="fas fa-comments"></i><span>Care AI hỗ trợ</span>';
    item.addEventListener('click', function () {
      try { if (typeof closeSidebar === 'function') closeSidebar(); } catch (e) {}
      open();
    });
    item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } });
    var logout = Array.prototype.slice.call(menu.querySelectorAll('.sidebar-item')).find(function (x) { return (x.innerText || '').indexOf('Đăng xuất') !== -1; });
    if (logout) menu.insertBefore(item, logout); else menu.appendChild(item);
  }

  var css = document.createElement('style');
  css.textContent = '.promax-care-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#0054a3;color:#fff;font-size:14px}.promax-care-head button{border:0;background:transparent;color:#fff;font-size:28px;line-height:20px;padding:0 2px;cursor:pointer}.promax-care-log{padding:10px;overflow-y:auto;flex:1;min-height:120px;max-height:calc(70vh - 105px);font-size:13px}.promax-care-form{display:flex;gap:7px;padding:10px;border-top:1px solid #eee;background:#fff}.promax-care-form input{min-width:0;flex:1;padding:11px;border:1px solid #d6dce5;border-radius:10px;font-size:13px}.promax-care-form button{padding:10px 14px;border:0;border-radius:10px;background:#00bfa5;color:#fff;font-weight:800;cursor:pointer}.promax-care-form button:disabled{opacity:.6}.promax-care-open #promaxCarePanel{display:flex!important}@media(max-width:600px){#promaxCarePanel{position:fixed;left:10px;right:10px;top:8vh;bottom:92px;width:auto;max-height:70vh;border-radius:16px;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.28);z-index:25001;flex-direction:column;overflow:hidden}}@media(min-width:601px){#promaxCarePanel{position:fixed;right:22px;bottom:100px;width:360px;max-height:70vh;border-radius:16px;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.28);z-index:25001;display:none;flex-direction:column;overflow:hidden}}';
  document.head.appendChild(css);

  window.PromaxCareAI = { open: open, close: close, send: send, addMenuItem: addMenuItem };
  window.openCareAI = open;
  window.closeCareAI = close;
  function boot() { addMenuItem(); ensurePanel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setInterval(addMenuItem, 1500);
  console.log('✅ ProMax Care AI loaded — sidebar menu, closable panel, no floating FAB');
})(window, document);
