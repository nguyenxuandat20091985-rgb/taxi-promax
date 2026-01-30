(function() {
    if (typeof AI_CONFIG === 'undefined' || !AI_CONFIG.active) return;
    fetch('ai-module/ai-ui.html').then(r => r.text()).then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        addMsg("AI", AI_CONFIG.welcomeMessage);
    });
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
        } catch (e) { addMsg("AI", "Lỗi kết nối. Anh kiểm tra lại API Key nhé!"); }
        q.value = "";
    };
    function addMsg(user, msg) {
        const list = document.getElementById('ai-msg-list');
        if (list) {
            list.innerHTML += `<div style="margin-bottom:10px;"><b>${user}:</b> ${msg}</div>`;
            list.scrollTop = list.scrollHeight;
        }
    }
})();
