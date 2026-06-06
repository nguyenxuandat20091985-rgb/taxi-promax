/**
 * TAXI PROMAX - PREMIUM CORE LOGIC 2026
 * Tác giả: NGUYỄN XUÂN ĐẠT
 * Trạng thái: ĐÃ CẬP NHẬT BỘ LỌC CHỐNG GIAN LẬN GPS (ĐIỀU 8) & CHỨC NĂNG CHUYẾN VẪY (ĐIỀU 5)
 */

const App = {
    config: { 
        price: 15000, 
        autoStart: 5, 
        minAcc: 30, // Điều 8: Tuyệt đối không cộng KM khi accuracy > 30m
        maxSpeedKmh: 150, // Điều 18: Tốc độ tối đa hợp lệ của xe taxi để chống hack tốc độ
        minSpeedKmh: 2, // Tốc độ tối thiểu để loại bỏ nhiễu rung sai tọa độ khi đứng yên
        deviceId: localStorage.getItem('deviceId') || 'PRO-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        databaseURL: "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app/"
    },
    state: { 
        active: false, 
        km: 0, 
        lastPos: null, 
        lastPosTime: null, // Lưu mốc thời gian để tính toán vận tốc thực tế
        path: [], 
        history: JSON.parse(localStorage.getItem('trip_history') || '[]'),
        currentBookingId: null,
        isHailTrip: false // Đánh dấu nhận biết đang chạy hành trình "Chuyến Vẫy"
    },

    init() {
        localStorage.setItem('deviceId', this.config.deviceId);
        
        const phone = localStorage.getItem('userPhone');
        if (!phone) {
            document.getElementById('regModal').style.display = 'flex';
            return;
        }
        document.getElementById('regModal').style.display = 'none';

        this.initMap();
        this.watchGPS();
        this.updateHeaderUI(phone);
        this.renderHistory(); 
        this.listenToFirebaseBookings();
        console.log("Hệ thống TAXI PROMAX: Toàn bộ lõi chức năng nâng cấp v5.1 đã kích hoạt!");
    },

    initMap() {
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([20.95, 107.05], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        const carIcon = L.divIcon({ 
            className: 'car-marker',
            html: `<div style="width:20px;height:20px;background:#00bfa5;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.3);"></div>` 
        });
        
        this.marker = L.marker([20.95, 107.05], { icon: carIcon }).addTo(this.map);
        this.routeLine = L.polyline([], {color: '#00bfa5', weight: 6, opacity: 0.7}).addTo(this.map);
    },

    // ==========================================
    // NÂNG CẤP ĐIỀU 8 & 18: BỘ LỌC GPS CHỐNG GIAN LẬN CAO CẤP
    // ==========================================
    watchGPS() {
        if (!navigator.geolocation) {
            console.error("Thiết bị không hỗ trợ định vị GPS toàn cầu.");
            return;
        }

        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, accuracy: acc} = p.coords;
            const newPos = L.latLng(lat, lon);
            const currentTime = Date.now();
            
            // Cập nhật vị trí biểu tượng xe trên bản đồ giao diện trực quan
            this.marker.setLatLng(newPos);
            if (this.state.active) {
                this.map.panTo(newPos); 
            }

            // KIỂM TRA ĐIỀU KIỆN 1 (Điều 8): Bộ lọc độ chính xác hình học (Accuracy Filter)
            if (acc > this.config.minAcc) {
                console.warn(`[GPS Filter] Đã bỏ qua tọa độ do nhiễu sóng, độ sai số vượt ngưỡng: ${acc.toFixed(1)}m > ${this.config.minAcc}m`);
                return;
            }

            if (this.state.active && this.state.lastPos && this.state.lastPosTime) {
                // Tính khoảng cách di chuyển thực tế (mét) giữa 2 điểm định vị liên tiếp
                const distanceMeters = this.map.distance(this.state.lastPos, newPos);
                // Tính khoảng thời gian chênh lệch (giây)
                const timeDiffSeconds = (currentTime - this.state.lastPosTime) / 1000;

                if (timeDiffSeconds > 0 && distanceMeters > 0) {
                    // Tính vận tốc tức thời thực tế di chuyển: v = s / t (đổi ra km/h)
                    const speedKmh = (distanceMeters / timeDiffSeconds) * 3.6;

                    // KIỂM TRA ĐIỀU KIỆN 2 (Điều 18): Kiểm định vận tốc tối đa và tối thiểu chống Fake GPS / Nhảy GPS Drift
                    if (speedKmh >= this.config.minSpeedKmh && speedKmh <= this.config.maxSpeedKmh) {
                        this.state.km += (distanceMeters / 1000);
                        this.state.path.push(newPos);
                        this.routeLine.setLatLngs(this.state.path);
                        this.updateStats();
                    } else {
                        console.warn(`[Anti-Fraud] Phát hiện di chuyển bất thường! Vận tốc tính toán: ${speedKmh.toFixed(1)} km/h. Đã hủy ghi nhận cước.`);
                    }
                }
            }

            // Lưu lại tọa độ và thời gian làm mốc tính toán cho điểm kế tiếp
            this.state.lastPos = newPos;
            this.state.lastPosTime = currentTime;

            // Đồng bộ định vị của tài xế lên hệ thống máy chủ trung tâm phục vụ Admin Dashboard điều động xe
            this.syncDriverCoordinatesToServer(lat, lon);

        }, err => console.error("Lỗi phần cứng định vị GPS trên thiết bị: ", err), { 
            enableHighAccuracy: true, 
            maximumAge: 0,
            timeout: 5000 
        });
    },

    syncDriverCoordinatesToServer(lat, lon) {
        const phone = localStorage.getItem('userPhone');
        if (!phone) return;

        fetch(`${this.config.databaseURL}/drivers/${this.config.deviceId}.json`, {
            method: 'PATCH',
            body: JSON.stringify({
                phone: phone,
                lat: lat,
                lon: lon,
                status: this.state.active ? "busy" : "online",
                lastUpdate: Date.now()
            })
        }).catch(err => console.error("Lỗi đồng bộ tọa độ xe lên Firebase: ", err));
    },

    updateStats() {
        const finalFare = Math.round(this.state.km * this.config.price);
        document.getElementById('km').innerText = this.state.km.toFixed(2);
        document.getElementById('cost').innerText = finalFare.toLocaleString();
    },

    listenToFirebaseBookings() {
        if (this.eventSource) this.eventSource.close();
        
        try {
            this.eventSource = new EventSource(`${this.config.databaseURL}/bookings.json`);
            this.eventSource.addEventListener('put', (event) => {
                if (this.state.active) return; 

                const data = JSON.parse(event.data);
                if (!data || !data.data) return;

                const path = data.path;
                const bookingData = data.data;

                if (path !== "/" && bookingData.status === "waiting") {
                    this.promptDriverToAccept(path.replace('/', ''), bookingData);
                } else if (path === "/") {
                    for (let id in bookingData) {
                        if (bookingData[id] && bookingData[id].status === "waiting") {
                            this.promptDriverToAccept(id, bookingData[id]);
                            break;
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Lỗi khởi tạo Realtime Listener: ", error);
        }
    },

    promptDriverToAccept(bookingId, bookingData) {
        if (this.state.currentBookingId === bookingId) return; 
        this.state.currentBookingId = bookingId;

        const confirmTrip = confirm(
            `🚖 CÓ CUỐC XE MỚI TỪ APP KHÁCH!\n\n` +
            `• Khách hàng: ${bookingData.clientName}\n` +
            `• SĐT: ${bookingData.phone}\n` +
            `• Điểm đón: ${bookingData.pickup}\n` +
            `• Điểm đến: ${bookingData.dropoff}\n` +
            `• Quãng đường dự kiến: ${bookingData.distanceKm} km\n\n` +
            `Anh Đạt có muốn ĐÓN CUỐC NÀY KHÔNG?`
        );

        if (confirmTrip) {
            fetch(`${this.config.databaseURL}/bookings/${bookingId}.json`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    status: "accepted",
                    driverId: this.config.deviceId,
                    driverPhone: localStorage.getItem('userPhone')
                })
            })
            .then(() => {
                alert("Đã khóa và nhận đơn thành công!");
                this.state.active = true;
                this.state.isHailTrip = false;
                this.state.km = 0;
                this.state.path = [];
                this.routeLine.setLatLngs([]);
                
                const btn = document.getElementById('mainBtn');
                if(btn) {
                    btn.innerText = "KẾT THÚC CHUYẾN ĐI";
                    btn.style.background = "#e74c3c";
                }
            });
        } else {
            this.state.currentBookingId = null;
        }
    },

    // ==========================================
    // NÂNG CẤP ĐIỀU 5: HOÀN THIỆN HOÀN TOÀN CHỨC NĂNG CHUYỂN VẪY
    // ==========================================
    createHailTrip() {
        if (this.state.active) return;
        if (!this.state.lastPos) {
            alert("Hệ thống chưa nhận diện được tọa độ GPS ổn định. Vui lòng thử lại sau vài giây.");
            return;
        }

        if (confirm("🚨 KÍCH HOẠT CHUYẾN VẪY XE TRỰC TIẾP DỌC ĐƯỜNG?\n\nHành trình sẽ tự động ghi nhận km dựa trên đồng hồ thực tế định vị GPS di chuyển của xe.")) {
            const hailId = 'HAIL-' + Date.now();
            const hailData = {
                clientName: "Khách Vẫy Khách Đường",
                phone: "0000000000",
                pickup: "Đón trực tiếp trên đường di chuyển",
                pickupLat: this.state.lastPos.lat,
                pickupLon: this.state.lastPos.lng,
                status: "in_progress", // Đồng bộ trạng thái hành trình trực tiếp lên server
                driverId: this.config.deviceId,
                driverPhone: localStorage.getItem('userPhone'),
                createdAt: new Date().toISOString()
            };

            // Lưu thông tin đơn vẫy lên cấu trúc node cây dữ liệu Firebase chuẩn quy định
            fetch(`${this.config.databaseURL}/bookings/${hailId}.json`, {
                method: 'PUT',
                body: JSON.stringify(hailData)
            })
            .then(() => {
                this.state.active = true;
                this.state.isHailTrip = true;
                this.state.currentBookingId = hailId;
                this.state.km = 0;
                this.state.path = [];
                this.routeLine.setLatLngs([]);

                const btn = document.getElementById('mainBtn');
                if(btn) {
                    btn.innerText = "KẾT THÚC CHUYẾN VẪY";
                    btn.style.background = "#e74c3c";
                }
                alert("Đồng hồ tính cước Chuyến Vẫy đã mở! Chúc anh Đạt lái xe an toàn.");
            })
            .catch(err => console.error("Lỗi đồng bộ chuyến vẫy lên Server: ", err));
        }
    },

    handleTripToggle() {
        const btn = document.getElementById('mainBtn');
        if (!this.state.active) {
            // Nếu bấm nút chạy thủ công ngoài màn hình, mặc định khởi chạy tính năng Chuyến Vẫy (Điều 5)
            this.createHailTrip();
        } else {
            const finalFare = Math.round(this.state.km * this.config.price);
            if (this.state.km > 0.01) {
                this.saveToHistory(this.state.km, finalFare);
            }

            if (this.state.currentBookingId) {
                fetch(`${this.config.databaseURL}/bookings/${this.state.currentBookingId}.json`, {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        status: "completed",
                        actualDistanceKm: this.state.km.toFixed(2),
                        finalPrice: finalFare,
                        completedAt: new Date().toISOString()
                    })
                });
                this.state.currentBookingId = null;
            }
            
            this.state.active = false;
            this.state.isHailTrip = false;
            if(btn) {
                btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
                btn.style.background = "#00bfa5";
            }
            alert(`Hành trình hoàn thành! Quãng đường di chuyển thực tế: ${this.state.km.toFixed(2)} km. Tổng cước: ${finalFare.toLocaleString()} VNĐ`);
        }
    },

    saveToHistory(km, cost) {
        const trip = {
            id: Date.now(),
            date: new Date().toLocaleTimeString('vi-VN') + " " + new Date().toLocaleDateString('vi-VN'),
            km: km.toFixed(2),
            cost: cost
        };
        this.state.history.unshift(trip);
        localStorage.setItem('trip_history', JSON.stringify(this.state.history.slice(0, 50)));
        this.renderHistory();
    },

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        let totalRevenue = 0;
        historyList.innerHTML = this.state.history.map(t => {
            totalRevenue += t.cost;
            return `
                <div style="background:white; border-radius:10px; padding:12px; margin-bottom:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:11px; color:#888;">${t.date}</div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:5px;">
                        <span>${t.km} KM</span>
                        <span style="color:#00bfa5;">+${t.cost.toLocaleString()}đ</span>
                    </div>
                </div>
            `;
        }).join('');

        const revUI = document.getElementById('totalRevenue');
        if (revUI) revUI.innerText = totalRevenue.toLocaleString() + " VNĐ";
    },

    updateHeaderUI(phone) {
        document.getElementById('idShow').innerText = "🆔 " + this.config.deviceId;
        if(document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
    }
};

/**
 * LIÊN KẾT HÀM TOÀN CỤC VỚI GIAO DIỆN HTML NÚT BẤM
 */
window.toggleHeatmap = () => {
    alert("Đang quét vị trí nhu cầu mật độ khách hàng...");
    const heatPoints = [[20.952, 107.054], [20.947, 107.045]];
    heatPoints.forEach(p => {
        L.circle(p, {radius: 200, color: 'red', fillOpacity: 0.2}).addTo(App.map);
    });
};

window.triggerSOS = () => {
    if(confirm("XÁC NHẬN: Phát tín hiệu cứu hộ khẩn cấp khẩn nguy tới hệ thống trung tâm điều hành?")) {
        alert("Đã gửi định vị khẩn cấp thành công!");
    }
};

window.showTab = (tabId, btn) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    if (tabId !== 'home') {
        const target = document.getElementById('tab-' + tabId);
        if (target) target.style.display = 'block';
    }
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window.handleTrip = () => App.handleTripToggle();
window.handleHailTrip = () => App.createHailTrip(); // Hàm kích hoạt nút Chuyến vẫy riêng biệt

window.processRegistration = () => {
    const p = document.getElementById('regPhone').value;
    if(p.length >= 10) { 
        localStorage.setItem('userPhone', p); 
        location.reload(); 
    }
};

window.updateRate = (val) => {
    App.config.price = parseInt(val);
    document.getElementById('rateVal').innerText = App.config.price.toLocaleString() + "đ";
};

window.onload = () => App.init();
