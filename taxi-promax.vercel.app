<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADMIN - QUẢN LÝ TAXI PROMAX</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        :root { --admin-red: #d32f2f; --admin-dark: #1a1a1a; }
        body { margin: 0; display: flex; height: 100vh; font-family: sans-serif; background: #000; color: white; }
        
        /* Sidebar quản lý */
        #sidebar { width: 350px; background: var(--admin-dark); border-right: 2px solid #333; display: flex; flex-direction: column; }
        .stat-card { padding: 15px; border-bottom: 1px solid #333; background: #252525; }
        
        /* Bản đồ theo dõi khách */
        #admin-map { flex: 1; position: relative; }
        
        /* Danh sách khách hàng nạp tiền */
        .customer-list { flex: 1; overflow-y: auto; padding: 10px; }
        .customer-item { 
            background: #333; margin-bottom: 8px; padding: 10px; border-radius: 8px;
            border-left: 4px solid #ffc107; font-size: 13px;
        }
        .status-paid { color: #00bfa5; font-weight: bold; }
        .status-pending { color: #ffc107; }

        h2 { color: var(--admin-red); text-align: center; font-size: 18px; text-transform: uppercase; }
    </style>
</head>
<body>

    <div id="sidebar">
        <h2>☢️ ADMIN CONTROL PANEL</h2>
        
        <div class="stat-card">
            <div>Tổng doanh thu (BIDV): <b id="total-revenue" style="color:#00bfa5">0đ</b></div>
            <div>Số khách đang Online: <b id="online-count">0</b></div>
        </div>

        <div class="customer-list" id="customer-list">
            <p style="text-align:center; color:#888;">Đang quét tín hiệu Webhook...</p>
        </div>

        <button onclick="syncNow()" style="margin:10px; padding:12px; background:var(--admin-red); color:white; border:none; cursor:pointer; font-weight:bold;">LÀM MỚI HỆ THỐNG</button>
    </div>

    <div id="admin-map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const ADMIN_CONFIG = {
            WEBHOOK_GET: "https://taxi-promax.vercel.app/api/customers",
            CHECKSUM: "309f930afb5691846cd5abbbd3624d507fa8fb5d715d9da03474a711cf262fb2"
        };

        let adminMap = L.map('admin-map').setView([21.0285, 105.8542], 13);
        L.tileLayer('https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_KEY').addTo(adminMap);

        let customerMarkers = {};

        // 1. HÀM ĐỒNG BỘ DỮ LIỆU VỚI FILE KHACH.HTML
        async function syncNow() {
            try {
                // Fetch dữ liệu từ Webhook mà file Khách đã gửi lên
                const res = await fetch(`${ADMIN_CONFIG.WEBHOOK_GET}?token=${ADMIN_CONFIG.CHECKSUM}`);
                const data = await res.json();
                
                updateUI(data.customers);
                updateMap(data.customers);
                
                document.getElementById('total-revenue').innerText = data.total_revenue + "đ";
                document.getElementById('online-count').innerText = data.customers.length;
            } catch (e) {
                console.error("Lỗi đồng bộ Admin:", e);
            }
        }

        // 2. CẬP NHẬT DANH SÁCH KHÁCH HÀNG & TRẠNG THÁI GÓI
        function updateUI(customers) {
            const list = document.getElementById('customer-list');
            list.innerHTML = "";
            
            customers.forEach(c => {
                const item = document.createElement('div');
                item.className = 'customer-item';
                item.innerHTML = `
                    <div><b>ID: ${c.id}</b> | Gói: <span class="status-paid">${c.package}</span></div>
                    <div>Vị trí: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}</div>
                    <div style="font-size:10px; margin-top:5px; color:#aaa;">Giao dịch cuối: ${c.last_seen}</div>
                `;
                list.appendChild(item);
            });
        }

        // 3. THEO DÕI VỊ TRÍ KHÁCH THỰC TẾ TRÊN BẢN ĐỒ
        function updateMap(customers) {
            customers.forEach(c => {
                if (customerMarkers[c.id]) {
                    customerMarkers[c.id].setLatLng([c.lat, c.lng]);
                } else {
                    customerMarkers[c.id] = L.marker([c.lat, c.lng])
                        .addTo(adminMap)
                        .bindPopup(`Khách hàng: ${c.id}<br>Gói: ${c.package}`);
                }
            });
        }

        // Tự động đồng bộ mỗi 10 giây
        setInterval(syncNow, 10000);
        window.onload = syncNow;
    </script>
</body>
</html>
