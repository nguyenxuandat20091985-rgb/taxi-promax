// js/app.js - Module vận hành Taxi ProMax
class TaxiOperation {
    constructor() {
        this.basePrice = 12000; // Giá mở cửa
        this.pricePerKm = 12000; // Giá mỗi km
        this.waitingPricePerMinute = 500; // Giá chờ mỗi phút
        this.minimumDistance = 0.5; // KM tối thiểu
        this.currentLocation = null;
        this.isTracking = false;
        this.tripHistory = [];
        this.currentTrip = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚕 Khởi động module vận hành Taxi ProMax...');
        
        // Load cấu hình từ localStorage
        this.loadConfiguration();
        
        // Khởi tạo GPS
        await this.initGPS();
        
        // Khởi tạo UI
        this.initUI();
        
        console.log('✅ Module vận hành đã sẵn sàng');
    }
    
    // Load cấu hình từ localStorage
    loadConfiguration() {
        const savedConfig = localStorage.getItem('taxi_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            this.basePrice = config.basePrice || 12000;
            this.pricePerKm = config.pricePerKm || 12000;
            this.waitingPricePerMinute = config.waitingPricePerMinute || 500;
            this.minimumDistance = config.minimumDistance || 0.5;
        }
        
        console.log('📋 Cấu hình giá:', {
            basePrice: this.basePrice,
            pricePerKm: this.pricePerKm,
            waitingPricePerMinute: this.waitingPricePerMinute,
            minimumDistance: this.minimumDistance
        });
    }
    
    // Lưu cấu hình
    saveConfiguration(config) {
        const newConfig = {
            basePrice: config.basePrice || this.basePrice,
            pricePerKm: config.pricePerKm || this.pricePerKm,
            waitingPricePerMinute: config.waitingPricePerMinute || this.waitingPricePerMinute,
            minimumDistance: config.minimumDistance || this.minimumDistance
        };
        
        localStorage.setItem('taxi_config', JSON.stringify(newConfig));
        
        // Cập nhật biến
        this.basePrice = newConfig.basePrice;
        this.pricePerKm = newConfig.pricePerKm;
        this.waitingPricePerMinute = newConfig.waitingPricePerMinute;
        this.minimumDistance = newConfig.minimumDistance;
        
        console.log('💾 Đã lưu cấu hình mới:', newConfig);
        return newConfig;
    }
    
    // Khởi tạo GPS
    async initGPS() {
        if (!navigator.geolocation) {
            console.error('❌ Trình duyệt không hỗ trợ GPS');
            return;
        }
        
        try {
            // Lấy vị trí hiện tại
            await this.getCurrentPosition();
            
            // Theo dõi vị trí liên tục
            this.startTracking();
            
        } catch (error) {
            console.error('❌ Lỗi khởi tạo GPS:', error);
        }
    }
    
    // Lấy vị trí hiện tại
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date(position.timestamp)
                    };
                    
                    console.log('📍 Vị trí hiện tại:', this.currentLocation);
                    this.updateLocationUI();
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.error('❌ Lỗi lấy vị trí:', error);
                    
                    // Fallback: Sử dụng vị trí mặc định (Hà Nội)
                    this.currentLocation = {
                        lat: 21.0285,
                        lng: 105.8542,
                        accuracy: 1000,
                        timestamp: new Date()
                    };
                    
                    this.updateLocationUI();
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        });
    }
    
    // Bắt đầu theo dõi vị trí
    startTracking() {
        if (this.isTracking) return;
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    speed: position.coords.speed || 0,
                    timestamp: new Date(position.timestamp)
                };
                
                // Cập nhật UI
                this.updateLocationUI();
                
                // Nếu đang có chuyến đi, cập nhật thông tin
                if (this.currentTrip && this.currentTrip.status === 'ongoing') {
                    this.updateTripDistance();
                }
            },
            (error) => {
                console.error('❌ Lỗi theo dõi vị trí:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000
            }
        );
        
        this.isTracking = true;
        console.log('🛰️ Đã bắt đầu theo dõi vị trí');
    }
    
    // Dừng theo dõi vị trí
    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.isTracking = false;
            console.log('🛑 Đã dừng theo dõi vị trí');
        }
    }
    
    // Tính toán khoảng cách giữa 2 điểm (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Bán kính Trái Đất tính bằng km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return Math.max(distance, this.minimumDistance);
    }
    
    toRad(degrees) {
        return degrees * (Math.PI/180);
    }
    
    // Tính cước phí
    calculateFare(distanceKm, waitingMinutes = 0) {
        // Tính phí di chuyển
        let distanceFare = this.basePrice;
        if (distanceKm > this.minimumDistance) {
            distanceFare += Math.ceil(distanceKm - this.minimumDistance) * this.pricePerKm;
        }
        
        // Tính phí chờ đợi
        const waitingFare = Math.ceil(waitingMinutes) * this.waitingPricePerMinute;
        
        // Tổng cước
        const totalFare = distanceFare + waitingFare;
        
        // Phí dịch vụ (10%)
        const serviceFee = Math.round(totalFare * 0.1);
        
        // Tổng thanh toán
        const finalTotal = totalFare + serviceFee;
        
        return {
            distance: distanceKm.toFixed(2),
            waitingMinutes: waitingMinutes,
            baseFare: this.basePrice,
            distanceFare: distanceFare,
            waitingFare: waitingFare,
            subtotal: totalFare,
            serviceFee: serviceFee,
            serviceFeePercent: 10,
            total: finalTotal,
            breakdown: {
                base: this.basePrice,
                distance: Math.ceil(distanceKm - this.minimumDistance) * this.pricePerKm,
                waiting: waitingFare,
                service: serviceFee
            }
        };
    }
    
    // Bắt đầu chuyến đi
    startTrip(pickupLocation, destination, customerInfo = {}) {
        const tripId = 'TRIP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        this.currentTrip = {
            id: tripId,
            pickup: pickupLocation,
            destination: destination,
            customer: customerInfo,
            startTime: new Date(),
            startLocation: { ...this.currentLocation },
            distance: 0,
            waitingMinutes: 0,
            status: 'ongoing',
            fare: null,
            payments: []
        };
        
        console.log('🚖 Bắt đầu chuyến đi:', this.currentTrip.id);
        
        // Lưu vào lịch sử
        this.tripHistory.push(this.currentTrip);
        
        // Cập nhật UI
        this.updateTripUI();
        
        // Tạo thông báo
        this.showNotification(`Đã bắt đầu chuyến #${tripId}`, 'info');
        
        return this.currentTrip;
    }
    
    // Kết thúc chuyến đi
    endTrip() {
        if (!this.currentTrip || this.currentTrip.status !== 'ongoing') {
            console.error('❌ Không có chuyến đi đang diễn ra');
            return null;
        }
        
        const endTime = new Date();
        const duration = (endTime - this.currentTrip.startTime) / (1000 * 60); // Phút
        
        // Tính toán chờ đợi (giả định 10% thời gian là chờ đợi)
        const waitingMinutes = Math.round(duration * 0.1);
        
        // Tính cước phí
        const fare = this.calculateFare(this.currentTrip.distance, waitingMinutes);
        
        // Cập nhật thông tin chuyến đi
        this.currentTrip.endTime = endTime;
        this.currentTrip.duration = duration;
        this.currentTrip.waitingMinutes = waitingMinutes;
        this.currentTrip.fare = fare;
        this.currentTrip.status = 'completed';
        this.currentTrip.endLocation = { ...this.currentLocation };
        
        console.log('🏁 Kết thúc chuyến đi:', this.currentTrip.id, fare);
        
        // Lưu vào lịch sử
        this.saveTripHistory();
        
        // Cập nhật UI
        this.updateTripUI();
        
        // Hiển thị hóa đơn
        this.showInvoice(this.currentTrip);
        
        // Reset chuyến hiện tại
        const completedTrip = { ...this.currentTrip };
        this.currentTrip = null;
        
        return completedTrip;
    }
    
    // Hủy chuyến đi
    cancelTrip(reason = 'Khách hủy') {
        if (!this.currentTrip) return;
        
        this.currentTrip.endTime = new Date();
        this.currentTrip.status = 'cancelled';
        this.currentTrip.cancelReason = reason;
        
        console.log('❌ Hủy chuyến đi:', this.currentTrip.id, reason);
        
        // Lưu vào lịch sử
        this.saveTripHistory();
        
        // Cập nhật UI
        this.updateTripUI();
        
        // Reset
        this.currentTrip = null;
        
        this.showNotification('Đã hủy chuyến đi', 'warning');
    }
    
    // Cập nhật quãng đường chuyến đi
    updateTripDistance() {
        if (!this.currentTrip || !this.currentTrip.startLocation) return;
        
        const distance = this.calculateDistance(
            this.currentTrip.startLocation.lat,
            this.currentTrip.startLocation.lng,
            this.currentLocation.lat,
            this.currentLocation.lng
        );
        
        this.currentTrip.distance = distance;
        
        // Cập nhật UI realtime
        this.updateCurrentTripUI();
    }
    
    // Lưu lịch sử chuyến đi
    saveTripHistory() {
        try {
            // Chỉ lưu 100 chuyến gần nhất
            if (this.tripHistory.length > 100) {
                this.tripHistory = this.tripHistory.slice(-100);
            }
            
            localStorage.setItem('taxi_trip_history', JSON.stringify(this.tripHistory));
            console.log('💾 Đã lưu lịch sử chuyến đi:', this.tripHistory.length, 'chuyến');
        } catch (error) {
            console.error('❌ Lỗi lưu lịch sử:', error);
        }
    }
    
    // Load lịch sử chuyến đi
    loadTripHistory() {
        try {
            const savedHistory = localStorage.getItem('taxi_trip_history');
            if (savedHistory) {
                this.tripHistory = JSON.parse(savedHistory);
                console.log('📋 Đã load lịch sử:', this.tripHistory.length, 'chuyến');
            }
        } catch (error) {
            console.error('❌ Lỗi load lịch sử:', error);
        }
    }
    
    // Hiển thị hóa đơn
    showInvoice(trip) {
        const invoiceHTML = `
            <div class="invoice-modal">
                <div class="invoice-header">
                    <h3><i class="fas fa-receipt"></i> HÓA ĐƠN TAXI PROMAX</h3>
                    <p>Mã chuyến: ${trip.id}</p>
                </div>
                <div class="invoice-body">
                    <div class="invoice-section">
                        <h4>Thông tin chuyến đi</h4>
                        <p><strong>Điểm đón:</strong> ${trip.pickup}</p>
                        <p><strong>Điểm đến:</strong> ${trip.destination}</p>
                        <p><strong>Thời gian bắt đầu:</strong> ${new Date(trip.startTime).toLocaleString('vi-VN')}</p>
                        <p><strong>Thời gian kết thúc:</strong> ${new Date(trip.endTime).toLocaleString('vi-VN')}</p>
                        <p><strong>Quãng đường:</strong> ${trip.distance} km</p>
                        <p><strong>Thời gian chờ:</strong> ${trip.waitingMinutes} phút</p>
                    </div>
                    <div class="invoice-section">
                        <h4>Chi tiết cước phí</h4>
                        <table class="fare-table">
                            <tr>
                                <td>Giá mở cửa:</td>
                                <td class="text-right">${trip.fare.baseFare.toLocaleString('vi-VN')}đ</td>
                            </tr>
                            <tr>
                                <td>Phí di chuyển (${trip.distance} km):</td>
                                <td class="text-right">${(trip.fare.distanceFare - trip.fare.baseFare).toLocaleString('vi-VN')}đ</td>
                            </tr>
                            <tr>
                                <td>Phí chờ đợi (${trip.waitingMinutes} phút):</td>
                                <td class="text-right">${trip.fare.waitingFare.toLocaleString('vi-VN')}đ</td>
                            </tr>
                            <tr class="subtotal">
                                <td><strong>Tạm tính:</strong></td>
                                <td class="text-right"><strong>${trip.fare.subtotal.toLocaleString('vi-VN')}đ</strong></td>
                            </tr>
                            <tr>
                                <td>Phí dịch vụ (${trip.fare.serviceFeePercent}%):</td>
                                <td class="text-right">${trip.fare.serviceFee.toLocaleString('vi-VN')}đ</td>
                            </tr>
                            <tr class="total">
                                <td><strong>TỔNG CƯỚC:</strong></td>
                                <td class="text-right"><strong class="total-amount">${trip.fare.total.toLocaleString('vi-VN')}đ</strong></td>
                            </tr>
                        </table>
                    </div>
                    <div class="invoice-footer">
                        <p><i class="fas fa-info-circle"></i> Cảm ơn quý khách đã sử dụng dịch vụ Taxi ProMax</p>
                        <p class="small">Taxi ProMax v5.1 - Bản quyền thuộc về NGUYEN XUAN ĐAT</p>
                    </div>
                </div>
                <div class="invoice-actions">
                    <button onclick="window.print()" class="btn-print">
                        <i class="fas fa-print"></i> In hóa đơn
                    </button>
                    <button onclick="this.closest('.invoice-modal').remove()" class="btn-close">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                </div>
            </div>
        `;
        
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'invoice-modal-container';
        modal.innerHTML = invoiceHTML;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            padding: 20px;
        `;
        
        modal.querySelector('.invoice-modal').style.cssText = `
            background: white;
            border-radius: 15px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(modal);
        
        // Lưu hóa đơn
        this.saveInvoice(trip);
    }
    
    // Lưu hóa đơn
    saveInvoice(trip) {
        try {
            const invoices = JSON.parse(localStorage.getItem('taxi_invoices') || '[]');
            invoices.push({
                ...trip,
                printedAt: new Date().toISOString()
            });
            
            // Chỉ lưu 50 hóa đơn gần nhất
            if (invoices.length > 50) {
                invoices.shift();
            }
            
            localStorage.setItem('taxi_invoices', JSON.stringify(invoices));
        } catch (error) {
            console.error('❌ Lỗi lưu hóa đơn:', error);
        }
    }
    
    // Khởi tạo UI
    initUI() {
        // Tạo các phần tử UI nếu chưa có
        this.createOperationUI();
        
        // Load lịch sử
        this.loadTripHistory();
        
        // Cập nhật UI ban đầu
        this.updateLocationUI();
        this.updateTripUI();
    }
    
    // Tạo UI vận hành
    createOperationUI() {
        const operationHTML = `
            <div class="operation-panel" id="operation-panel">
                <h3><i class="fas fa-tachometer-alt"></i> Bảng điều khiển vận hành</h3>
                
                <div class="location-info">
                    <h4><i class="fas fa-map-marker-alt"></i> Vị trí hiện tại</h4>
                    <div class="coordinates">
                        <p><strong>Kinh độ:</strong> <span id="current-lng">--</span></p>
                        <p><strong>Vĩ độ:</strong> <span id="current-lat">--</span></p>
                        <p><strong>Độ chính xác:</strong> <span id="location-accuracy">--</span>m</p>
                    </div>
                    <button onclick="taxiOperation.getCurrentPosition()" class="btn-refresh">
                        <i class="fas fa-sync-alt"></i> Làm mới vị trí
                    </button>
                </div>
                
                <div class="current-trip" id="current-trip-panel">
                    <h4><i class="fas fa-car"></i> Chuyến đi hiện tại</h4>
                    <p class="no-trip" id="no-trip-message">Chưa có chuyến đi nào</p>
                    <div class="trip-details hidden" id="trip-details">
                        <p><strong>Mã chuyến:</strong> <span id="trip-id">--</span></p>
                        <p><strong>Quãng đường:</strong> <span id="trip-distance">0</span> km</p>
                        <p><strong>Thời gian:</strong> <span id="trip-duration">0</span> phút</p>
                        <p><strong>Trạng thái:</strong> <span class="status-ongoing" id="trip-status">--</span></p>
                        <div class="trip-actions">
                            <button onclick="taxiOperation.endTrip()" class="btn-end-trip">
                                <i class="fas fa-flag-checkered"></i> Kết thúc chuyến
                            </button>
                            <button onclick="taxiOperation.cancelTrip()" class="btn-cancel-trip">
                                <i class="fas fa-times"></i> Hủy chuyến
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="fare-config">
                    <h4><i class="fas fa-cog"></i> Cấu hình giá cước</h4>
                    <form id="fare-config-form">
                        <div class="form-group">
                            <label>Giá mở cửa (VNĐ):</label>
                            <input type="number" id="config-basePrice" value="${this.basePrice}" min="5000" step="1000">
                        </div>
                        <div class="form-group">
                            <label>Giá mỗi km (VNĐ):</label>
                            <input type="number" id="config-pricePerKm" value="${this.pricePerKm}" min="5000" step="1000">
                        </div>
                        <div class="form-group">
                            <label>Giá chờ mỗi phút (VNĐ):</label>
                            <input type="number" id="config-waitingPrice" value="${this.waitingPricePerMinute}" min="100" step="100">
                        </div>
                        <div class="form-group">
                            <label>KM tối thiểu:</label>
                            <input type="number" id="config-minDistance" value="${this.minimumDistance}" min="0.1" step="0.1">
                        </div>
                        <button type="submit" class="btn-save-config">
                            <i class="fas fa-save"></i> Lưu cấu hình
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        // Thêm vào trang nếu chưa có
        if (!document.getElementById('operation-panel')) {
            const container = document.querySelector('.main-content');
            if (container) {
                const div = document.createElement('div');
                div.innerHTML = operationHTML;
                container.appendChild(div);
            }
        }
        
        // Thêm event listener cho form
        setTimeout(() => {
            const form = document.getElementById('fare-config-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveConfigFromForm();
                });
            }
        }, 100);
    }
    
    // Lưu cấu hình từ form
    saveConfigFromForm() {
        const config = {
            basePrice: parseInt(document.getElementById('config-basePrice').value),
            pricePerKm: parseInt(document.getElementById('config-pricePerKm').value),
            waitingPricePerMinute: parseInt(document.getElementById('config-waitingPrice').value),
            minimumDistance: parseFloat(document.getElementById('config-minDistance').value)
        };
        
        this.saveConfiguration(config);
        this.showNotification('Đã lưu cấu hình giá cước!', 'success');
    }
    
    // Cập nhật UI vị trí
    updateLocationUI() {
        if (!this.currentLocation) return;
        
        const elements = {
            'current-lat': this.currentLocation.lat.toFixed(6),
            'current-lng': this.currentLocation.lng.toFixed(6),
            'location-accuracy': Math.round(this.currentLocation.accuracy || 0)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    // Cập nhật UI chuyến đi
    updateTripUI() {
        const noTripMsg = document.getElementById('no-trip-message');
        const tripDetails = document.getElementById('trip-details');
        
        if (!this.currentTrip) {
            if (noTripMsg) noTripMsg.style.display = 'block';
            if (tripDetails) tripDetails.classList.add('hidden');
            return;
        }
        
        if (noTripMsg) noTripMsg.style.display = 'none';
        if (tripDetails) {
            tripDetails.classList.remove('hidden');
            
            // Cập nhật thông tin
            document.getElementById('trip-id').textContent = this.currentTrip.id;
            document.getElementById('trip-status').textContent = this.currentTrip.status === 'ongoing' ? 'Đang diễn ra' : this.currentTrip.status;
        }
    }
    
    // Cập nhật UI chuyến đi hiện tại (realtime)
    updateCurrentTripUI() {
        if (!this.currentTrip) return;
        
        const distanceElement = document.getElementById('trip-distance');
        const durationElement = document.getElementById('trip-duration');
        
        if (distanceElement) {
            distanceElement.textContent = this.currentTrip.distance.toFixed(2);
        }
        
        if (durationElement && this.currentTrip.startTime) {
            const duration = (new Date() - new Date(this.currentTrip.startTime)) / (1000 * 60);
            durationElement.textContent = Math.round(duration);
        }
    }
    
    // Hiển thị thông báo
    showNotification(message, type = 'info') {
        // Sử dụng hệ thống notification có sẵn từ security.js
        if (window.taxiSecurity && window.taxiSecurity.showNotification) {
            window.taxiSecurity.showNotification(message, type);
        } else {
            // Fallback
            alert(message);
        }
    }
    
    // API public
    startNewTrip(pickup, destination, customerInfo = {}) {
        return this.startTrip(pickup, destination, customerInfo);
    }
    
    getCurrentFare(distance, waitingMinutes = 0) {
        return this.calculateFare(distance, waitingMinutes);
    }
    
    getTripHistory() {
        return this.tripHistory;
    }
    
    getCurrentTrip() {
        return this.currentTrip;
    }
    
    isOnTrip() {
        return this.currentTrip && this.currentTrip.status === 'ongoing';
    }
}

// Khởi tạo toàn cục
window.taxiOperation = new TaxiOperation();