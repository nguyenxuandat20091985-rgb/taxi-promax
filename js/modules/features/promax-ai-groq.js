/* ProMax extracted module: promax-ai-groq */
(function(){
    var ov = null;
    function buildUI(){
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = 'aiAssistant';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;';
        ov.innerHTML =
            '<div style="background:#fff;width:100%;max-width:480px;height:80vh;border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div style="background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">' +
            '<b>🤖 Trợ lý AI ProMax</b>' +
            '<button id="aiClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div id="aiMsgs" style="flex:1;overflow-y:auto;padding:14px;background:#f5f7fa;display:flex;flex-direction:column;gap:10px;"></div>' +
            '<div style="display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e2e8f0;">' +
            '<input id="aiInput" placeholder="Hỏi: giờ nào đông khách?..." style="flex:1;padding:12px;border:1px solid #e2e8f0;border-radius:20px;font-size:14px;">' +
            '<button id="aiSend" style="background:linear-gradient(135deg,#0054a3,#00bfa5);border:none;color:#fff;border-radius:20px;padding:0 18px;font-weight:800;cursor:pointer;">Gửi</button></div></div>';
        document.body.appendChild(ov);
        ov.querySelector('#aiClose').onclick = function(){ ov.style.display = 'none'; };
        ov.querySelector('#aiSend').onclick = ask;
        ov.querySelector('#aiInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') ask(); });
        return ov;
    }
    function addMsg(who, text){
        var box = document.getElementById('aiMsgs');
        var d = document.createElement('div');
        d.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.5;white-space:pre-line;' +
            (who === 'me' ? 'align-self:flex-end;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;' : 'align-self:flex-start;background:#fff;border:1px solid #e2e8f0;');
        d.textContent = text;
        box.appendChild(d);
        box.scrollTop = box.scrollHeight;
        return d;
    }
    function ask(){
        var inp = document.getElementById('aiInput');
        var q = (inp.value || '').trim();
        if (!q) return;
        inp.value = '';
        addMsg('me', q);
        var wait = addMsg('ai', '⏳ Đang suy nghĩ...');
        fetch('/api/ai-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q, role: 'driver' })
        })
        .then(function(r){
            return r.json().catch(function(){ return {}; }).then(function(d){ return { ok: r.ok, status: r.status, data: d }; });
        })
        .then(function(result){
            var d = result.data || {};
            if (result.ok && d.success) {
                wait.textContent = '🤖 ' + d.answer;
                if (typeof speak === 'function') speak(d.answer);
                return null;
            }
            // Provider đang lỗi 404/502: dùng Care AI nội bộ để tài xế vẫn
            // nhận được hướng dẫn, thay vì để khung chat đứng im.
            wait.textContent = '⏳ AI ngoài tạm lỗi, đang chuyển sang Care AI...';
            return fetch('/api/ai-care', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q, message: q, channel: 'driver' })
            }).then(function(r){
                return r.json().catch(function(){ return {}; }).then(function(fallback){
                    if (r.ok && fallback.success && fallback.answer) {
                        wait.textContent = '🛟 Care AI dự phòng: ' + fallback.answer;
                        if (typeof speak === 'function') speak(fallback.answer);
                    } else {
                        wait.textContent = '❌ AI chưa khả dụng (HTTP ' + result.status + '). Vui lòng thử lại sau.';
                    }
                });
            }).catch(function(){
                wait.textContent = '❌ AI chưa khả dụng (HTTP ' + result.status + '). Vui lòng thử lại sau.';
            });
        })
        .catch(function(e){ wait.textContent = '❌ Không kết nối được trợ lý: ' + e.message; });
    }
    function addMenu(){
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.aiAdded) return;
        menu.dataset.aiAdded = '1';
        var logout = null;
        for (var i = 0; i < menu.children.length; i++) {
            if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
        }
        var d = document.createElement('div');
        d.className = 'sidebar-item';
        d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">🤖</span><span>Trợ lý AI</span>';
        d.onclick = function(){ try { closeSidebar(); } catch(e){} buildUI(); ov.style.display = 'flex'; };
        if (logout) menu.insertBefore(d, logout); else menu.appendChild(d);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMenu);
    else addMenu();
    setInterval(addMenu, 2000);
})();
