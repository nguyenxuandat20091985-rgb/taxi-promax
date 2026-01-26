    console.log('Admin module initialized');
},

// Load statistics
loadStatistics: function() {
    const stats = Storage.getStatistics(30);
    const totalTrips = stats.reduce((sum, day) => sum + day.trips, 0);
    const totalRevenue = stats.reduce((sum, day) => sum + day.revenue, 0);
    const totalDistance = stats.reduce((sum, day) => sum + day.distance, 0);
    
    // Update quick stats
    document.getElementById('quick-total-licenses').textContent = this.getLicenseCount();
    document.getElementById('quick-total-revenue').textContent = Pricing.formatCurrency(totalRevenue);
    document.getElementById('quick-active-users').textContent = this.getActiveUserCount();
    
    // Update dashboard stats
    document.getElementById('admin-revenue').textContent = Pricing.formatCurrency(totalRevenue);
    document.getElementById('admin-licenses-sold').textContent = this.getLicenseCount();
    document.getElementById('admin-users').textContent = this.getUserCount();
    document.getElementById('admin-trips').textContent = totalTrips;
},

// Get license count
getLicenseCount: function() {
    // In a real app, this would come from a database
    const licenses = JSON.parse(localStorage.getItem('admin_licenses') || '[]');
    return licenses.length;
},

// Get user count
getUserCount: function() {
    // Count unique device IDs from trips
    const trips = Storage.getTrips(1000);
    const deviceIds = new Set();
    
    trips.forEach(trip => {
        if (trip.deviceId) {
            deviceIds.add(trip.deviceId);
        }
    });
    
    return deviceIds.size;
},

// Get active user count (last 30 days)
getActiveUserCount: function() {
    const trips = Storage.getTrips(1000);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDevices = new Set();
    
    trips.forEach(trip => {
        if (trip.savedAt && new Date(trip.savedAt) > thirtyDaysAgo && trip.deviceId) {
            activeDevices.add(trip.deviceId);
        }
    });
    
    return activeDevices.size;
},

// Load recent activities
loadRecentActivities: function() {
    const activities = this.getRecentActivities(20);
    const tableBody = document.getElementById('admin-activities');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(activity.timestamp).toLocaleString('vi-VN')}</td>
            <td>${activity.deviceId || 'N/A'}</td>
            <td>${activity.event}</td>
            <td>${activity.details || ''}</td>
        `;
        tableBody.appendChild(row);
    });
},

// Get recent activities
getRecentActivities: function(limit = 50) {
    try {
        // Get security logs
        const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        
        // Get trip logs
        const trips = Storage.getTrips(limit);
        const tripLogs = trips.map(trip => ({
            timestamp: trip.savedAt || trip.startTime,
            event: 'TRIP_COMPLETED',
            details: `Chuyến xe ${trip.id}: ${trip.distance?.toFixed(2)}km, ${Pricing.formatCurrency(trip.fare || 0)}`,
            deviceId: trip.deviceId
        }));
        
        // Get payment logs
        const payments = Payment.getPaymentHistory(limit);
        const paymentLogs = payments.map(payment => ({
            timestamp: payment.timestamp || payment.completedAt,
            event: 'PAYMENT_' + payment.status.toUpperCase(),
            details: `Thanh toán ${payment.orderId}: ${Pricing.formatCurrency(payment.amount)}`,
            deviceId: 'N/A'
        }));
        
        // Combine and sort by timestamp
        const allLogs = [...securityLogs, ...tripLogs, ...paymentLogs];
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return allLogs.slice(0, limit);
    } catch (error) {
        console.error('Get activities error:', error);
        return [];
    }
},

// Load licenses
loadLicenses: function() {
    const licenses = this.getAllLicenses();
    const tableBody = document.getElementById('licenses-table');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    licenses.forEach(license => {
        const expires = new Date(license.expires);
        const now = new Date();
        const status = now > expires ? 'Hết hạn' : 'Đang hoạt động';
        const statusClass = now > expires ? 'danger' : 'success';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${license.key}</code></td>
            <td><span class="badge bg-info">${license.package}</span></td>
            <td><small>${license.deviceId || 'Chưa kích hoạt'}</small></td>
            <td>${new Date(license.created).toLocaleDateString('vi-VN')}</td>
            <td>${expires.toLocaleDateString('vi-VN')}</td>
            <td><span class="badge bg-${statusClass}">${status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="Admin.revokeLicense('${license.key}')">
                    <i class="fas fa-ban"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
},

// Get all licenses
getAllLicenses: function() {
    // In a real app, this would come from a database
    let licenses = JSON.parse(localStorage.getItem('admin_licenses') || '[]');
    
    // Add user's current license if exists
    const userLicense = Storage.getCurrentLicense();
    if (userLicense && !licenses.find(l => l.key === userLicense.key)) {
        licenses.push({
            key: userLicense.key,
            package: userLicense.package,
            deviceId: userLicense.deviceId,
            created: userLicense.activated,
            expires: userLicense.expires
        });
    }
    
    return licenses.sort((a, b) => new Date(b.created) - new Date(a.created));
},

// Generate new licenses
generateLicenses: function(packageType, durationDays = 30, count = 1) {
    const licenses = [];
    
    for (let i = 0; i < count; i++) {
        const licenseKey = Security.generateLicense(packageType);
        const created = new Date();
        const expires = new Date(created);
        expires.setDate(expires.getDate() + durationDays);
        
        licenses.push({
            key: licenseKey,
            package: packageType,
            created: created.toISOString(),
            expires: expires.toISOString(),
            deviceId: null,
            used: false
        });
    }
    
    // Save to admin storage
    const existingLicenses = JSON.parse(localStorage.getItem('admin_licenses') || '[]');
    const allLicenses = [...existingLicenses, ...licenses];
    localStorage.setItem('admin_licenses', JSON.stringify(allLicenses));
    
    return licenses;
},

// Revoke license
revokeLicense: function(licenseKey) {
    let licenses = JSON.parse(localStorage.getItem('admin_licenses') || '[]');
    licenses = licenses.filter(l => l.key !== licenseKey);
    localStorage.setItem('admin_licenses', JSON.stringify(licenses));
    
    // Also remove from user storage if active
    if (Storage.getCurrentLicense()?.key === licenseKey) {
        Storage.remove('taxi_licenses');
    }
    
    this.loadLicenses();
    this.showMessage(`Đã thu hồi license: ${licenseKey}`, 'success');
},

// Initialize charts
initCharts: function() {
    this.initRevenueChart();
    this.initPackageChart();
},

// Initialize revenue chart
initRevenueChart: function() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const stats = Storage.getStatistics(30);
    const labels = stats.map(stat => stat.date.slice(5)); // MM-DD
    const revenueData = stats.map(stat => stat.revenue);
    const tripData = stats.map(stat => stat.trips);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doanh thu (VND)',
                    data: revenueData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    yAxisID: 'y'
                },
                {
                    label: 'Số chuyến',
                    data: tripData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Doanh thu (VND)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Số chuyến'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
},

// Initialize package distribution chart
initPackageChart: function() {
    const ctx = document.getElementById('packageChart');
    if (!ctx) return;
    
    const licenses = this.getAllLicenses();
    const packageCount = {
        FREE: 0,
        BASIC: 0,
        PRO: 0,
        VIP: 0
    };
    
    licenses.forEach(license => {
        if (packageCount.hasOwnProperty(license.package)) {
            packageCount[license.package]++;
        }
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['FREE', 'BASIC', 'PRO', 'VIP'],
            datasets: [{
                data: [packageCount.FREE, packageCount.BASIC, packageCount.PRO, packageCount.VIP],
                backgroundColor: [
                    'rgb(108, 117, 125)',
                    'rgb(13, 110, 253)',
                    'rgb(255, 193, 7)',
                    'rgb(220, 53, 69)'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
},

// Setup event listeners
setupEventListeners: function() {
    // Navigation
    document.querySelectorAll('.list-group-item-action').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all
            document.querySelectorAll('.list-group-item-action').forEach(i => {
                i.classList.remove('active');
            });
            
            // Add active class to clicked
            item.classList.add('active');
            
            // Show corresponding section
            const target = item.id.replace('nav-admin-', '');
            this.showSection(target);
        });
    });
    
    // Generate license button
    const btnGenerate = document.getElementById('btn-generate-license');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            const packageType = document.getElementById('license-package').value;
            const duration = parseInt(document.getElementById('license-duration').value);
            const count = parseInt(document.getElementById('license-count').value);
            
            const licenses = this.generateLicenses(packageType, duration, count);
            
            this.showMessage(`Đã tạo ${count} license gói ${packageType}`, 'success');
            this.loadLicenses();
            
            // Show license keys
            let licenseList = 'License keys đã tạo:\n';
            licenses.forEach(license => {
                licenseList += `${license.key}\n`;
            });
            
            setTimeout(() => {
                if (confirm('Copy license keys vào clipboard?')) {
                    navigator.clipboard.writeText(licenseList);
                }
            }, 500);
        });
    }
    
    // Refresh licenses button
    const btnRefresh = document.getElementById('btn-refresh-licenses');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            this.loadLicenses();
        });
    }
    
    // Export report button
    const btnExport = document.getElementById('btn-export-report');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            this.exportReport();
        });
    }
    
    // Save settings button
    const btnSaveSettings = document.getElementById('btn-save-settings-admin');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            this.saveAdminSettings();
        });
    }
    
    // Reset system button
    const btnReset = document.getElementById('btn-reset-system');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn reset toàn bộ hệ thống? Hành động này không thể hoàn tác.')) {
                Storage.clearAllData();
                localStorage.removeItem('admin_licenses');
                this.showMessage('Đã reset toàn bộ hệ thống', 'success');
                setTimeout(() => location.reload(), 2000);
            }
        });
    }
    
    // Backup data button
    const btnBackup = document.getElementById('btn-backup-data');
    if (btnBackup) {
        btnBackup.addEventListener('click', () => {
            this.backupData();
        });
    }
    
    // Restore data button
    const btnRestore = document.getElementById('btn-restore-data');
    if (btnRestore) {
        btnRestore.addEventListener('click', () => {
            this.restoreData();
        });
    }
    
    // Clear all data button
    const btnClearAll = document.getElementById('btn-clear-all-data');
    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            if (confirm('Xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.')) {
                Storage.clearAllData();
                this.showMessage('Đã xóa toàn bộ dữ liệu', 'success');
            }
        });
    }
},

// Show section
showSection: function(sectionId) {
    // Hide all sections
    document.querySelectorAll('main > div[id^="admin-"]').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const targetSection = document.getElementById(`admin-${sectionId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update charts if needed
    if (sectionId === 'dashboard') {
        this.initCharts();
    } else if (sectionId === 'licenses') {
        this.loadLicenses();
    }
},

// Export report
exportReport: function() {
    const reportType = document.getElementById('report-type').value;
    const fromDate = document.getElementById('report-from').value;
    const toDate = document.getElementById('report-to').value;
    
    let reportData;
    let filename;
    
    switch (reportType) {
        case 'revenue':
            reportData = this.generateRevenueReport(fromDate, toDate);
            filename = `bao-cao-doanh-thu-${fromDate}-${toDate}.json`;
            break;
        case 'users':
            reportData = this.generateUserReport(fromDate, toDate);
            filename = `bao-cao-nguoi-dung-${fromDate}-${toDate}.json`;
            break;
        case 'trips':
            reportData = this.generateTripReport(fromDate, toDate);
            filename = `bao-cao-chuyen-xe-${fromDate}-${toDate}.json`;
            break;
        case 'licenses':
            reportData = this.generateLicenseReport(fromDate, toDate);
            filename = `bao-cao-license-${fromDate}-${toDate}.json`;
            break;
        default:
            reportData = { error: 'Loại báo cáo không hợp lệ' };
            filename = 'report.json';
    }
    
    // Create download link
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
    
    this.showMessage(`Đã xuất báo cáo: ${filename}`, 'success');
},

// Generate revenue report
generateRevenueReport: function(fromDate, toDate) {
    const stats = Storage.getStatistics(365); // Last year
    const filtered = stats.filter(stat => {
        if (fromDate && stat.date < fromDate) return false;
        if (toDate && stat.date > toDate) return false;
        return true;
    });
    
    const totalRevenue = filtered.reduce((sum, day) => sum + day.revenue, 0);
    const totalTrips = filtered.reduce((sum, day) => sum + day.trips, 0);
    const totalDistance = filtered.reduce((sum, day) => sum + day.distance, 0);
    
    return {
        reportType: 'revenue',
        period: { from: fromDate || 'all', to: toDate || 'all' },
        summary: {
            totalRevenue: totalRevenue,
            formattedTotalRevenue: Pricing.formatCurrency(totalRevenue),
            totalTrips: totalTrips,
            totalDistance: totalDistance.toFixed(2) + ' km',
            averagePerTrip: totalTrips > 0 ? Pricing.formatCurrency(totalRevenue / totalTrips) : '0 đ'
        },
        dailyData: filtered,
        generatedAt: new Date().toISOString()
    };
},

// Generate user report
generateUserReport: function(fromDate, toDate) {
    const trips = Storage.getTrips(1000);
    const users = {};
    
    trips.forEach(trip => {
        if (!trip.deviceId) return;
        
        if (!users[trip.deviceId]) {
            users[trip.deviceId] = {
                deviceId: trip.deviceId,
                firstSeen: trip.savedAt || new Date().toISOString(),
                lastSeen: trip.savedAt || new Date().toISOString(),
                totalTrips: 0,
                totalSpent: 0,
                totalDistance: 0
            };
        }
        
        const user = users[trip.deviceId];
        user.lastSeen = trip.savedAt || user.lastSeen;
        user.totalTrips++;
        user.totalSpent += trip.fare || 0;
        user.totalDistance += trip.distance || 0;
    });
    
    const userList = Object.values(users);
    
    return {
        reportType: 'users',
        period: { from: fromDate || 'all', to: toDate || 'all' },
        summary: {
            totalUsers: userList.length,
            activeUsers: userList.filter(u => {
                const lastSeen = new Date(u.lastSeen);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return lastSeen > thirtyDaysAgo;
            }).length
        },
        users: userList,
        generatedAt: new Date().toISOString()
    };
},

// Generate trip report
generateTripReport: function(fromDate, toDate) {
    const trips = Storage.getTrips(1000);
    
    const filteredTrips = trips.filter(trip => {
        const tripDate = trip.savedAt ? trip.savedAt.split('T')[0] : new Date().toISOString().split('T')[0];
        if (fromDate && tripDate < fromDate) return false;
        if (toDate && tripDate > toDate) return false;
        return true;
    });
    
    return {
        reportType: 'trips',
        period: { from: fromDate || 'all', to: toDate || 'all' },
        summary: {
            totalTrips: filteredTrips.length,
            totalRevenue: filteredTrips.reduce((sum, trip) => sum + (trip.fare || 0), 0),
            totalDistance: filteredTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0)
        },
        trips: filteredTrips,
        generatedAt: new Date().toISOString()
    };
},

// Generate license report
generateLicenseReport: function(fromDate, toDate) {
    const licenses = this.getAllLicenses();
    
    const filteredLicenses = licenses.filter(license => {
        const createdDate = license.created.split('T')[0];
        if (fromDate && createdDate < fromDate) return false;
        if (toDate && createdDate > toDate) return false;
        return true;
    });
    
    const packageSummary = {
        FREE: 0,
        BASIC: 0,
        PRO: 0,
        VIP: 0
    };
    
    filteredLicenses.forEach(license => {
        if (packageSummary.hasOwnProperty(license.package)) {
            packageSummary[license.package]++;
        }
    });
    
    return {
        reportType: 'licenses',
        period: { from: fromDate || 'all', to: toDate || 'all' },
        summary: {
            totalLicenses: filteredLicenses.length,
            activeLicenses: filteredLicenses.filter(l => {
                const expires = new Date(l.expires);
                return expires > new Date();
            }).length,
            packageDistribution: packageSummary
        },
        licenses: filteredLicenses,
        generatedAt: new Date().toISOString()
    };
},

// Backup data
backupData: function() {
    const backup = Storage.backupData();
    if (!backup) {
        this.showMessage('Lỗi khi backup dữ liệu', 'danger');
        return;
    }
    
    const filename = `taxi-promax-backup-${new Date().toISOString().split('T')[0]}.json`;
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(backup);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    link.click();
    
    this.showMessage(`Đã backup dữ liệu: ${filename}`, 'success');
},

// Restore data
restoreData: function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const success = Storage.restoreData(event.target.result);
                if (success) {
                    this.showMessage('Đã restore dữ liệu thành công', 'success');
                    setTimeout(() => location.reload(), 2000);
                } else {
                    this.showMessage('Lỗi khi restore dữ liệu', 'danger');
                }
            } catch (error) {
                this.showMessage(`Lỗi: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
},

// Save admin settings
saveAdminSettings: function() {
    const settings = {
        pricePerKm: parseFloat(document.getElementById('setting-price-per-km').value),
        pricePerMinute: parseFloat(document.getElementById('setting-price-per-minute').value),
        baseFee: parseFloat(document.getElementById('setting-base-fee').value),
        peakFactor: parseFloat(document.getElementById('setting-peak-factor').value),
        priceBasic: parseFloat(document.getElementById('setting-price-basic').value),
        pricePro: parseFloat(document.getElementById('setting-price-pro').value)
    };
    
    // Update CONFIG
    CONFIG.PRICING.PRICE_PER_KM = settings.pricePerKm;
    CONFIG.PRICING.PRICE_PER_MINUTE = settings.pricePerMinute;
    CONFIG.PRICING.BASE_FEE = settings.baseFee;
    CONFIG.PRICING.PEAK_HOUR_MULTIPLIER = settings.peakFactor;
    CONFIG.PACKAGES.BASIC.price = settings.priceBasic;
    CONFIG.PACKAGES.PRO.price = settings.pricePro;
    
    // Save to storage
    Storage.saveSettings(settings);
    
    this.showMessage('Đã lưu cài đặt hệ thống', 'success');
},

// Show message
showMessage: function(message, type = 'info') {
    const modalBody = document.getElementById('admin-modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();
    } else {
        alert(message);
    }
}
