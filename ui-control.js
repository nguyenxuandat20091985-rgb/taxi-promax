// BẢO MẬT & ID
const TX_ID = localStorage.getItem('tx_id') || 'PRO-' + Math.random().toString(36).substr(2, 5).toUpperCase();
localStorage.setItem('tx_id', TX_ID);
document.getElementById('idShow').innerText = "🆔 " + TX_ID;
document.getElementById('profileID').innerText = TX_ID; 

function saveHistory(km, cost) {
    const list = document.getElementById('historyList');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = 'history-card';
    item.innerHTML = `<div class="h-info"><b>${time}</b><br><small>${km} KM</small></div><div class="h-price">${cost}đ</div>`;
    list.prepend(item);
} 

function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(tab === 'home') document.getElementById('homeControls').style.display = 'block';
    else {
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tab-' + tab).style.display = 'flex';
        if(tab === 'vi') selectPack(49000, 'VIP 1TH', document.querySelectorAll('.p-card')[2]);
    }
} 

function selectPack(price, name, el) {
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const content = `${TX_ID} NAP ${name}`;
    document.getElementById('qrContent').innerText = content;
    document.getElementById('qrImg').src = `https://img.vietqr.io/image/bidv-4430269669-compact2.png?amount=${price}&addInfo=${encodeURIComponent(content)}`;
} 

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// AUTO CHECK 7 NGÀY
let install = localStorage.getItem('install_date') || Date.now();
localStorage.setItem('install_date', install);
if (Date.now() - install > 7 * 24 * 60 * 60 * 1000) {
    alert("Hết hạn dùng thử!");
    showTab('vi', document.querySelectorAll('.nav-item')[1]);
}
