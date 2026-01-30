(function() {
    if (typeof AI_CONFIG === 'undefined' || !AI_CONFIG.active) return;

    fetch('ai-module/ai-ui.html').then(r => r.text()).then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        makeDraggable(document.getElementById('ai-root')); // Kích hoạt tính năng di chuyển
        addMsg("AI", AI_CONFIG.welcomeMessage);
    });

    // --- LOGIC DI CHUYỂN (DRAGGABLE) ---
    function makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const btn = document.getElementById('ai-btn');
        
        btn.onmousedown = dragMouseDown;
        btn.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            const isTouch = e.type === 'touchstart';
            pos3 = isTouch ? e.touches[0].clientX : e.clientX;
            pos4 = isTouch ? e.touches[0].clientY : e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto";
            el.style.right = "auto";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    window.toggleAI = () => {
        const box = document.getElementById('ai-box');
        box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'flex' : 'none';
    };

    window.callAI = async () => {
        const q = document.getElementById('ai-query');
        const text = q.value.trim();
        if (!text) return;
        addMsg("Bạn", text);
        q.value = "Đang trả lời...";
        try {
            const res = await fetch(`${AI_CONFIG.apiEndpoint}?key=${AI_CONFIG.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            addMsg("AI", reply);
        } catch (e) { addMsg("AI", "Kiểm tra API Key anh nhé!"); }
        q.value = "";
    };

    function addMsg(user, msg) {
        const list = document.getElementById('ai-msg-list');
        if (list) {
            const type = user === "AI" ? "msg-ai" : "msg-user";
            list.innerHTML += `<div class="${type}"><b>${user}:</b> ${msg}</div>`;
            list.scrollTop = list.scrollHeight;
        }
    }
})();
