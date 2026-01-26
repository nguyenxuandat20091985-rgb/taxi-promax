// Initialize application
init: function() {
    console.log('Taxi Promax v5.1 Initializing...');
    
    // Initialize modules
    GPS.init();
    PackageManager.init();
    Security.createSession();
    
    // Load settings
    this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update device info
    this.updateDeviceInfo();
    
    // Load trip history
    this.loadTripHistory();
    
    // Check for payment callback
    Payment.handlePaymentCallback();
    
    console.log('App initialized successfully');
},

// Load settings from storage
loadSettings: function() {
    const settings = Storage.getSettings();
    
    // Update UI with saved settings
    document.getElementById('price-per-km').value = settings.pricePerKm;
    document.getElementById('price-per-minute').value = settings.pricePerMinute;
    document.getElementById('base-fee').value = settings.baseFee;
    
    // Apply dark mode if enabled
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }
},

// Setup event listeners
setupEventListeners: function() {
    // Navigation
    document.getElementById('nav-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('dashboard');
    });
    
    document.getElementById('nav-booking').addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('booking');
    });
    
    document.getElementById('nav-history').addEventListener('click', (e) => {
        e.preventDefault();
        this.loadTripHistory();
        this.showPage('history');
    });
    
    document.getElementById('nav-package').addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('package');
    });
    
    document.getElementById('nav-payment').addEventListener('click', (e) => {
        e.preventDefault();
        this.showPage('payment');
    });
    
    // Trip controls
    document.getElementById('btn-start').addEventListener('click', () => {
        this.startTrip();
    });
    
    document.getElementById('btn-stop').addEventListener('click', () => {
        this.stopTrip();
    });
    
    document.getElementById('btn-location').addEventListener('click', () => {
        this.getCurrentLocation();
    });
    
    // Settings
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        this.saveSettings();
    });
    
    // Booking
    document.getElementById('btn-book-ride').addEventListener('click', () => {
        this.bookRide();
    });
    
    // Package upgrade buttons
    document.querySelectorAll('[data-package]').forEach(button => {
        button.addEventListener('click', (e) => {
            const packageType = e.target.getAttribute('data-package');
            PackageManager.showUpgradeModal(packageType.toUpperCase());
        });
    });
    
    // License activation
    document.getElementById('btn-activate').addEventListener('click', () => {
        this.activateLicense();
    });
    
    // Payment
    document.getElementById('btn-generate-payment').addEventListener('click', () => {
        this.generatePayment();
    });
    
    // History
    document.getElementById('btn-clear-history').addEventListener('click', () => {
        this.clearHistory();
    });
    
    // Device ID copy
    document.getElementById('btn-copy-id').addEventListener('click', () => {
        this.copyDeviceId();
    });
    
    // Input events for fare estimation
    document.getElementById('pickup-location').addEventListener('input', () => {
        this.updateFareEstimate();
    });
    
    document.getElementById('dropoff-location').addEventListener('input', () => {
        this.updateFareEstimate();
    });
    
    document.getElementById('car-type').addEventListener('change', () => {
        this.updateFareEstimate();
    });
},

// Show page
showPage: function(pageName) {
    // Hide all pages
    document.querySelectorAll('main > div[id$="-page"]').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${pageName}-page`);
    if (pageElement) {
        pageElement.style.display = 'block';
    }
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'booking': 'Đặt xe',
        'history': 'Lịch sử',
        'package': 'Gói dịch vụ',
        'payment': 'Thanh toán'
    };
    
    document.getElementById('page-title').textContent = titles[pageName] || 'Dashboard';
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navElement = document.getElementById(`nav-${pageName}`);
    if (navElement) {
        navElement.classList.add('active');
    }
},

// Start trip
startTrip: function() {
    if (this.isRunning) {
        this.showMessage('Chuyến xe đang chạy!', 'warning');
        return;
    }
    
    // Check package limits
    const packageValidation = PackageManager.validateTrip(0, 0);
    if (!packageValidation.allowed) {
        this.showMessage(packageValidation.reason, 'danger');
        return;
    }
    
    // Start GPS tracking
    GPS.startTracking((position, distance) => {
        this.updateTripDisplay(position, distance);
    });
    
    // Initialize trip data
    this.currentTrip = {
        startTime: new Date(),
        positions: [],
        distance: 0,
        duration: 0,
        fare: 0
    };
    
    this.isRunning = true;
    
    // Update UI
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    document.getElementById('status-value').textContent = 'Đang chạy';
    
    // Start update interval
    this.updateInterval = setInterval(() => {
        this.updateTrip();
    }, 1000);
    
    this.showMessage('Bắt đầu chuyến xe thành công!', 'success');
},

// Stop trip
stopTrip: function() {
    if (!this.isRunning) {
        this.showMessage('Không có chuyến xe nào đang chạy!', 'warning');
        return;
    }
    
    // Stop GPS tracking
    const tripSummary = GPS.stopTracking();
    
    // Stop update interval
    if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
    }
    
    // Calculate final fare
    const finalFare = Pricing.calculateLiveFare(tripSummary, PackageManager.currentPackage);
    
    // Complete trip data
    this.currentTrip.endTime = new Date();
    this.currentTrip.distance = tripSummary.distance;
    this.currentTrip.duration = tripSummary.duration;
    this.currentTrip.fare = finalFare;
    this.currentTrip.positions = tripSummary.positions;
    
    // Save trip
    const tripId = Storage.saveTrip(this.currentTrip);
    
    // Update statistics
    Storage.saveStatistic('trip', 1);
    Storage.saveStatistic('distance', this.currentTrip.distance);
    Storage.saveStatistic('revenue', this.currentTrip.fare);
    
    // Reset state
    this.isRunning = false;
    
    // Update UI
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('status-value').textContent = 'Hoàn thành';
    
    // Show trip summary
    this.showTripSummary(tripId);
    
    // Reset display
    setTimeout(() => {
        document.getElementById('distance-value').textContent = '0.00 km';
        document.getElementById('time-value').textContent = '00:00:00';
        document.getElementById('price-value').textContent = '0 đ';
        document.getElementById('status-value').textContent = 'Đang chờ';
        document.getElementById('current-location').textContent = 'Chưa xác định';
        document.getElementById('coordinates').textContent = '0, 0';
    }, 3000);
},

// Update trip display
updateTripDisplay: function(position, distance) {
    if (!position || !this.isRunning) return;
    
    // Update distance
    document.getElementById('distance-value').textContent = distance.toFixed(2) + ' km';
    
    // Update time
    const duration = GPS.getFormattedDuration();
    document.getElementById('time-value').textContent = duration.formatted;
    
    // Update location
    document.getElementById('coordinates').textContent = 
        `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
    
    // Get address (simulated)
    GPS.getAddressFromCoords(position.latitude, position.longitude, (address) => {
        document.getElementById('current-location').textContent = address;
    });
    
    // Update fare
    const tripData = {
        distance: distance,
        duration: GPS.getTripDuration()
    };
    
    const currentFare = Pricing.calculateLiveFare(tripData, PackageManager.currentPackage);
    document.getElementById('price-value').textContent = Pricing.formatCurrency(currentFare);
},

// Update trip data
updateTrip: function() {
    if (!this.isRunning || !this.currentTrip) return;
    
    // Update trip duration
    this.currentTrip.duration = GPS.getTripDuration();
    this.currentTrip.distance = GPS.totalDistance;
    
    // Check package limits
    const packageValidation = PackageManager.validateTrip(
        this.currentTrip.distance,
        this.currentTrip.duration / 60
    );
    
    if (!packageValidation.allowed) {
        this.showMessage(`Đã đạt giới hạn gói: ${packageValidation.reason}`, 'warning');
        this.stopTrip();
        return;
    }
},

// Get current location
getCurrentLocation: function() {
    if (!navigator.geolocation) {
        this.showMessage('Trình duyệt không hỗ trợ định vị', 'danger');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            document.getElementById('coordinates').textContent = 
                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            GPS.getAddressFromCoords(lat, lng, (address) => {
                document.getElementById('current-location').textContent = address;
                this.showMessage('Đã lấy vị trí hiện tại', 'success');
            });
        },
        (error) => {
            this.showMessage('Không thể lấy vị trí: ' + error.message, 'danger');
        },
        { enableHighAccuracy: true }
    );
},

// Save settings
saveSettings: function() {
    const settings = {
        pricePerKm: parseFloat(document.getElementById('price-per-km').value),
        pricePerMinute: parseFloat(document.getElementById('price-per-minute').value),
        baseFee: parseFloat(document.getElementById('base-fee').value)
    };
    
    Storage.saveSettings(settings);
    this.showMessage('Đã lưu cài đặt', 'success');
},

// Book a ride
bookRide: function() {
    const pickup = document.getElementById('pickup-location').value;
    const dropoff = document.getElementById('dropoff-location').value;
    const carType = document.getElementById('car-type').value;
    
    if (!pickup || !dropoff) {
        this.showMessage('Vui lòng nhập đầy đủ điểm đón và điểm đến', 'warning');
        return;
    }
    
    // Estimate fare
    const estimate = Pricing.estimateFare(pickup, dropoff, carType);
    
    // Show confirmation
    const confirmMessage = `
        Xác nhận đặt xe:
        - Điểm đón: ${pickup}
        - Điểm đến: ${dropoff}
        - Loại xe: ${carType === 'standard' ? 'Tiêu chuẩn' : carType === 'premium' ? 'Cao cấp' : 'SUV'}
        - Ước tính: ${Pricing.formatCurrency(estimate.fare)}
        - Khoảng cách: ${estimate.distance.toFixed(2)} km
        - Thời gian: ${Math.round(estimate.duration)} phút
        
        Bạn có muốn đặt xe ngay?
    `;
    
    if (confirm(confirmMessage)) {
        this.showMessage('Đã đặt xe thành công! Tài xế sẽ liên hệ với bạn sớm.', 'success');
        
        // Reset form
        document.getElementById('pickup-location').value = '';
        document.getElementById('dropoff-location').value = '';
        document.getElementById('car-type').value = 'standard';
        
        // Return to dashboard
        this.showPage('dashboard');
    }
},

// Update fare estimate
updateFareEstimate: function() {
    const pickup = document.getElementById('pickup-location').value;
    const dropoff = document.getElementById('dropoff-location').value;
    const carType = document.getElementById('car-type').value;
    
    if (!pickup || !dropoff) {
        document.getElementById('fare-estimate').innerHTML = 
            '<p class="text-muted">Nhập địa chỉ để xem ước tính</p>';
        return;
    }
    
    const estimate = Pricing.estimateFare(pickup, dropoff, carType);
    
    const html = `
        <div class="fare-breakdown">
            <p><strong>Khoảng cách ước tính:</strong> ${estimate.distance.toFixed(2)} km</p>
            <p><strong>Thời gian ước tính:</strong> ${Math.round(estimate.duration)} phút</p>
            <p><strong>Giá ước tính:</strong> <span class="text-success">${Pricing.formatCurrency(estimate.fare)}</span></p>
            <hr>
            <p class="small text-muted">* Giá có thể thay đổi theo lộ trình thực tế</p>
        </div>
    `;
    
    document.getElementById('fare-estimate').innerHTML = html;
},

// Load trip history
loadTripHistory: function() {
    const trips = Storage.getTrips(50);
    const tableBody = document.getElementById('history-table');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (trips.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Chưa có chuyến xe nào
                </td>
            </tr>
        `;
        return;
    }
    
    trips.forEach(trip => {
        const date = new Date(trip.savedAt || trip.startTime);
        const formattedDate = date.toLocaleString('vi-VN');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${trip.distance ? trip.distance.toFixed(2) + ' km' : 'N/A'}</td>
            <td>${trip.formattedDuration || 'N/A'}</td>
            <td>${trip.fare ? Pricing.formatCurrency(trip.fare) : 'N/A'}</td>
            <td><span class="badge bg-success">Hoàn thành</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="App.viewTripDetails('${trip.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
},

// View trip details
viewTripDetails: function(tripId) {
    const trips = Storage.getTrips(1000);
    const trip = trips.find(t => t.id === tripId);
    
    if (!trip) {
        this.showMessage('Không tìm thấy thông tin chuyến xe', 'warning');
        return;
    }
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h5>Chi tiết chuyến xe</h5>
        <p><strong>ID:</strong> ${trip.id}</p>
        <p><strong>Thời gian bắt đầu:</strong> ${new Date(trip.startTime).toLocaleString('vi-VN')}</p>
        <p><strong>Thời gian kết thúc:</strong> ${trip.endTime ? new Date(trip.endTime).toLocaleString('vi-VN') : 'N/A'}</p>
        <p><strong>Quãng đường:</strong> ${trip.distance ? trip.distance.toFixed(2) + ' km' : 'N/A'}</p>
        <p><strong>Thời gian:</strong> ${trip.formattedDuration || 'N/A'}</p>
        <p><strong>Tổng tiền:</strong> <span class="text-success">${trip.fare ? Pricing.formatCurrency(trip.fare) : 'N/A'}</span></p>
        <p><strong>Số điểm GPS:</strong> ${trip.positions ? trip.positions.length : 0}</p>
        <p><strong>Thiết bị:</strong> ${trip.deviceId || 'N/A'}</p>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
},

// Clear history
clearHistory: function() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử?')) {
        Storage.clearTrips();
        this.loadTripHistory();
        this.showMessage('Đã xóa toàn bộ lịch sử', 'success');
    }
},

// Activate license
activateLicense: function() {
    const licenseKey = document.getElementById('license-input').value.trim();
    
    if (!licenseKey) {
        this.showMessage('Vui lòng nhập license key', 'warning');
        return;
    }
    
    const result = Security.activateLicense(licenseKey);
    
    if (result.success) {
        this.showMessage(result.message, 'success');
        
        // Update package manager
        PackageManager.init();
        
        // Clear input
        document.getElementById('license-input').value = '';
        
        // Show package page
        this.showPage('package');
    } else {
        this.showMessage(result.message, 'danger');
    }
},

// Generate payment
generatePayment: function() {
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const method = document.getElementById('payment-method').value;
    const description = document.getElementById('payment-description').value;
    
    if (!amount || amount <= 0) {
        this.showMessage('Vui lòng nhập số tiền hợp lệ', 'warning');
        return;
    }
    
    // Generate payment data
    const paymentData = Payment.generatePaymentData(amount, description);
    
    // Update payment info
    document.getElementById('payment-info').textContent = 
        `Mã đơn hàng: ${paymentData.orderId} - Số tiền: ${Pricing.formatCurrency(amount)}`;
    
    // Generate QR code
    Payment.generateQRCode(paymentData.qrData, 'qrcode', CONFIG.PAYMENT.QR_CODE_SIZE);
    
    this.showMessage('Đã tạo QR thanh toán', 'success');
},

// Copy device ID
copyDeviceId: function() {
    const deviceId = Security.getDeviceId();
    navigator.clipboard.writeText(deviceId);
    this.showMessage('Đã copy Device ID vào clipboard', 'success');
},

// Update device info
updateDeviceInfo: function() {
    const deviceId = Security.getDeviceId();
    document.getElementById('device-id').textContent = deviceId;
    
    const license = Storage.getCurrentLicense();
    if (license) {
        document.getElementById('license-key').textContent = license.key;
    } else {
        document.getElementById('license-key').textContent = 'Chưa kích hoạt';
    }
},

// Show trip summary
showTripSummary: function(tripId) {
    const trips = Storage.getTrips(1);
    const trip = trips.find(t => t.id === tripId);
    
    if (!trip) return;
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="text-center">
            <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
            <h4>Chuyến xe hoàn thành!</h4>
        </div>
        
        <div class="trip-summary mt-3">
            <p><strong>Quãng đường:</strong> ${trip.distance.toFixed(2)} km</p>
            <p><strong>Thời gian:</strong> ${trip.formattedDuration}</p>
            <p><strong>Tổng tiền:</strong> <span class="text-success h5">${Pricing.formatCurrency(trip.fare)}</span></p>
            <p><strong>Gói sử dụng:</strong> <span class="badge bg-info">${PackageManager.currentPackage}</span></p>
            
            <div class="mt-4">
                <p class="text-muted small">Chuyến xe đã được lưu vào lịch sử</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
},

// Show message
showMessage: function(message, type = 'info') {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
}
