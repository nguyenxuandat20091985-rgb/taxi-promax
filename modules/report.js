        case 'financial':
            return this.generateFinancialReport(options);
            
        case 'user_activity':
            return this.generateUserActivityReport(options);
            
        case 'system_status':
            return this.generateSystemStatusReport(options);
            
        case 'license_summary':
            return this.generateLicenseSummaryReport(options);
            
        case 'full':
        default:
            return this.generateFullReport(options);
    }
},

// Generate trip summary report
generateTripSummaryReport: function(options) {
    const trips = HistoryModule.getDetailedHistory(options.filters || {});
    const stats = HistoryModule.getHistoryStatistics(trips);
    
    return {
        reportType: 'trip_summary',
        generatedAt: new Date().toISOString(),
        period: options.period || 'all',
        filters: options.filters || {},
        
        summary: {
            totalTrips: stats.totalTrips,
            totalDistance: stats.totalDistance,
            totalFare: stats.totalFare,
            totalDuration: stats.totalDuration,
            averagePerTrip: {
                distance: stats.averageDistance,
                fare: stats.averageFare,
                duration: stats.averageDuration
            },
            formatted: stats.formatted
        },
        
        trends: {
            byHour: stats.byHour,
            byWeekday: stats.byWeekday,
            byDay: stats.byDay
        },
        
        topTrips: trips.slice(0, options.limit || 10).map(trip => ({
            id: trip.id,
            date: new Date(trip.savedAt || trip.startTime).toLocaleString('vi-VN'),
            distance: trip.distance,
            fare: trip.fare,
            duration: trip.duration,
            deviceId: trip.deviceId
        })),
        
        deviceDistribution: this.getDeviceDistribution(trips)
    };
},

// Generate financial report
generateFinancialReport: function(options) {
    const trips = HistoryModule.getDetailedHistory(options.filters || {});
    const stats = HistoryModule.getHistoryStatistics(trips);
    
    // Get payments
    const payments = Payment.getPaymentHistory(1000);
    
    // Filter payments by date if needed
    let filteredPayments = payments;
    if (options.startDate || options.endDate) {
        filteredPayments = payments.filter(payment => {
            const paymentDate = new Date(payment.timestamp || payment.completedAt);
            if (options.startDate && paymentDate < new Date(options.startDate)) return false;
            if (options.endDate) {
                const endDate = new Date(options.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (paymentDate > endDate) return false;
            }
            return true;
        });
    }
    
    const paymentStats = this.calculatePaymentStats(filteredPayments);
    
    return {
        reportType: 'financial',
        generatedAt: new Date().toISOString(),
        period: options.period || 'all',
        
        revenue: {
            fromTrips: stats.totalFare,
            fromPayments: paymentStats.totalAmount,
            total: stats.totalFare + paymentStats.totalAmount,
            formatted: {
                fromTrips: Pricing.formatCurrency(stats.totalFare),
                fromPayments: Pricing.formatCurrency(paymentStats.totalAmount),
                total: Pricing.formatCurrency(stats.totalFare + paymentStats.totalAmount)
            }
        },
        
        paymentBreakdown: {
            byMethod: paymentStats.byMethod,
            byStatus: paymentStats.byStatus,
            byPackage: paymentStats.byPackage
        },
        
        expenses: {
            // In real app, this would include costs, commissions, etc.
            estimatedProfit: (stats.totalFare + paymentStats.totalAmount) * 0.7, // 70% margin for demo
            commissionRate: 0.3 // 30% commission
        },
        
        topPayments: filteredPayments.slice(0, options.limit || 10).map(payment => ({
            orderId: payment.orderId,
            amount: payment.amount,
            method: Payment.formatPaymentMethod(payment.method),
            status: payment.status,
            timestamp: new Date(payment.timestamp || payment.completedAt).toLocaleString('vi-VN'),
            description: payment.description
        })),
        
        trends: {
            dailyRevenue: this.getDailyRevenue(trips, filteredPayments, options.days || 30)
        }
    };
},

// Generate user activity report
generateUserActivityReport: function(options) {
    const trips = HistoryModule.getDetailedHistory(options.filters || {});
    const devices = new Set();
    const activeDevices = new Set();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    trips.forEach(trip => {
        if (trip.deviceId) {
            devices.add(trip.deviceId);
            
            const tripDate = new Date(trip.savedAt || trip.startTime);
            if (tripDate > thirtyDaysAgo) {
                activeDevices.add(trip.deviceId);
            }
        }
    });
    
    // Get device statistics
    const deviceStats = {};
    trips.forEach(trip => {
        if (!trip.deviceId) return;
        
        if (!deviceStats[trip.deviceId]) {
            deviceStats[trip.deviceId] = {
                deviceId: trip.deviceId,
                firstSeen: trip.savedAt || trip.startTime,
                lastSeen: trip.savedAt || trip.startTime,
                tripCount: 0,
                totalSpent: 0,
                totalDistance: 0
            };
        }
        
        const stats = deviceStats[trip.deviceId];
        stats.lastSeen = trip.savedAt || trip.startTime;
        stats.tripCount++;
        stats.totalSpent += trip.fare || 0;
        stats.totalDistance += trip.distance || 0;
    });
    
    const deviceList = Object.values(deviceStats);
    deviceList.sort((a, b) => b.tripCount - a.tripCount);
    
    return {
        reportType: 'user_activity',
        generatedAt: new Date().toISOString(),
        
        userCounts: {
            total: devices.size,
            active: activeDevices.size,
            inactive: devices.size - activeDevices.size,
            activePercentage: devices.size > 0 ? (activeDevices.size / devices.size * 100).toFixed(1) : 0
        },
        
        userSegmentation: {
            byTripCount: {
                frequent: deviceList.filter(d => d.tripCount >= 10).length,
                regular: deviceList.filter(d => d.tripCount >= 3 && d.tripCount < 10).length,
                occasional: deviceList.filter(d => d.tripCount < 3).length
            },
            bySpending: {
                high: deviceList.filter(d => d.totalSpent >= 500000).length,
                medium: deviceList.filter(d => d.totalSpent >= 100000 && d.totalSpent < 500000).length,
                low: deviceList.filter(d => d.totalSpent < 100000).length
            }
        },
        
        topUsers: deviceList.slice(0, options.limit || 10).map(device => ({
            deviceId: device.deviceId,
            tripCount: device.tripCount,
            totalSpent: device.totalSpent,
            formattedSpent: Pricing.formatCurrency(device.totalSpent),
            totalDistance: device.totalDistance.toFixed(2) + ' km',
            firstSeen: new Date(device.firstSeen).toLocaleDateString('vi-VN'),
            lastSeen: new Date(device.lastSeen).toLocaleDateString('vi-VN'),
            daysActive: Math.ceil((new Date(device.lastSeen) - new Date(device.firstSeen)) / (1000 * 60 * 60 * 24))
        })),
        
        activityTrends: this.getUserActivityTrends(trips, options.days || 30)
    };
},

// Generate system status report
generateSystemStatusReport: function(options) {
    const deviceInfo = DeviceModule.getInfo();
    const capabilities = DeviceModule.checkCapabilities();
    const networkInfo = DeviceModule.getNetworkInfo();
    const trustedDevice = DeviceModule.isTrustedDevice();
    
    // Get storage info
    const trips = Storage.getTrips();
    const payments = Payment.getPaymentHistory();
    const settings = Storage.getSettings();
    
    return {
        reportType: 'system_status',
        generatedAt: new Date().toISOString(),
        
        device: {
            id: deviceInfo.deviceId,
            type: DeviceModule.isMobile() ? 'mobile' : DeviceModule.isTablet() ? 'tablet' : 'desktop',
            platform: deviceInfo.platform,
            browser: deviceInfo.userAgent.split(' ').slice(-2).join(' '),
            screen: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
            trusted: trustedDevice.trusted
        },
        
        capabilities: {
            geolocation: capabilities.geolocation,
            notifications: capabilities.notifications,
            camera: capabilities.camera,
            microphone: capabilities.microphone,
            push: capabilities.pushManager
        },
        
        network: networkInfo,
        
        storage: {
            trips: trips.length,
            payments: payments.length,
            license: Storage.getCurrentLicense() ? 'active' : 'none',
            estimatedSize: this.estimateStorageSize(trips, payments, settings)
        },
        
        performance: {
            loadTime: window.performance ? window.performance.timing.loadEventEnd - window.performance.timing.navigationStart : 0,
            memory: DeviceModule.getMemoryInfo(),
            cores: navigator.hardwareConcurrency || 'unknown'
        },
        
        security: {
            https: window.location.protocol === 'https:',
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            cookies: navigator.cookieEnabled
        },
        
        recommendations: this.generateSystemRecommendations(deviceInfo, capabilities, networkInfo)
    };
},

// Generate license summary report
generateLicenseSummaryReport: function(options) {
    // Get licenses from admin module
    const licenses = Admin.getAllLicenses ? Admin.getAllLicenses() : [];
    
    const packageCount = {
        FREE: 0,
        BASIC: 0,
        PRO: 0,
        VIP: 0
    };
    
    const statusCount = {
        active: 0,
        expired: 0,
        unused: 0
    };
    
    const now = new Date();
    
    licenses.forEach(license => {
        // Count by package
        if (packageCount.hasOwnProperty(license.package)) {
            packageCount[license.package]++;
        }
        
        // Count by status
        const expires = new Date(license.expires);
        if (!license.deviceId) {
            statusCount.unused++;
        } else if (expires > now) {
            statusCount.active++;
        } else {
            statusCount.expired++;
        }
    });
    
    // Calculate revenue
    const monthlyRevenue = 
        packageCount.BASIC * CONFIG.PACKAGES.BASIC.price +
        packageCount.PRO * CONFIG.PACKAGES.PRO.price +
        packageCount.VIP * CONFIG.PACKAGES.VIP.price;
    
    const annualRevenue = monthlyRevenue * 12;
    
    return {
        reportType: 'license_summary',
        generatedAt: new Date().toISOString(),
        
        totals: {
            issued: licenses.length,
            active: statusCount.active,
            expired: statusCount.expired,
            unused: statusCount.unused
        },
        
        packages: packageCount,
        
        revenue: {
            monthly: monthlyRevenue,
            annual: annualRevenue,
            potential: (licenses.length - statusCount.unused) * CONFIG.PACKAGES.BASIC.price * 12,
            formatted: {
                monthly: Pricing.formatCurrency(monthlyRevenue),
                annual: Pricing.formatCurrency(annualRevenue)
            }
        },
        
        trends: {
            byMonth: this.getLicenseIssuanceTrend(licenses, 12),
            activationRate: licenses.length > 0 ? 
                ((licenses.length - statusCount.unused) / licenses.length * 100).toFixed(1) + '%' : '0%'
        },
        
        topLicenses: licenses.slice(0, options.limit || 10).map(license => ({
            key: license.key,
            package: license.package,
            deviceId: license.deviceId || 'unassigned',
            issued: new Date(license.created).toLocaleDateString('vi-VN'),
            expires: new Date(license.expires).toLocaleDateString('vi-VN'),
            status: !license.deviceId ? 'unused' : new Date(license.expires) > now ? 'active' : 'expired',
            value: CONFIG.PACKAGES[license.package].price
        }))
    };
},

// Generate full report
generateFullReport: function(options) {
    const tripReport = this.generateTripSummaryReport(options);
    const financialReport = this.generateFinancialReport(options);
    const userReport = this.generateUserActivityReport(options);
    const systemReport = this.generateSystemStatusReport(options);
    const licenseReport = this.generateLicenseSummaryReport(options);
    
    return {
        reportType: 'full',
        generatedAt: new Date().toISOString(),
        version: CONFIG.VERSION,
        
        executiveSummary: {
            totalRevenue: financialReport.revenue.total,
            totalTrips: tripReport.summary.totalTrips,
            totalUsers: userReport.userCounts.total,
            totalLicenses: licenseReport.totals.issued,
            systemStatus: systemReport.recommendations.overallStatus
        },
        
        sections: {
            trips: tripReport,
            financial: financialReport,
            users: userReport,
            system: systemReport,
            licenses: licenseReport
        },
        
        recommendations: this.generateOverallRecommendations(
            tripReport,
            financialReport,
            userReport,
            systemReport,
            licenseReport
        ),
        
        metadata: {
            generatedBy: Security.getDeviceId(),
            duration: 'full',
            filters: options.filters || 'none'
        }
    };
},

// Helper methods
getDeviceDistribution: function(trips) {
    const distribution = {};
    
    trips.forEach(trip => {
        if (!trip.deviceId) return;
        
        if (!distribution[trip.deviceId]) {
            distribution[trip.deviceId] = 0;
        }
        distribution[trip.deviceId]++;
    });
    
    return Object.entries(distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([deviceId, count]) => ({ deviceId, count }));
},

calculatePaymentStats: function(payments) {
    const stats = {
        totalAmount: 0,
        byMethod: {},
        byStatus: {},
        byPackage: {},
        count: payments.length
    };
    
    payments.forEach(payment => {
        // Total amount
        stats.totalAmount += payment.amount || 0;
        
        // By method
        const method = payment.method || 'unknown';
        if (!stats.byMethod[method]) {
            stats.byMethod[method] = { count: 0, amount: 0 };
        }
        stats.byMethod[method].count++;
        stats.byMethod[method].amount += payment.amount || 0;
        
        // By status
        const status = payment.status || 'unknown';
        if (!stats.byStatus[status]) {
            stats.byStatus[status] = { count: 0, amount: 0 };
        }
        stats.byStatus[status].count++;
        stats.byStatus[status].amount += payment.amount || 0;
        
        // By package (extract from description)
        const desc = payment.description || '';
        let pkg = 'unknown';
        if (desc.includes('FREE') || desc.includes('free')) pkg = 'FREE';
        else if (desc.includes('BASIC') || desc.includes('basic')) pkg = 'BASIC';
        else if (desc.includes('PRO') || desc.includes('pro')) pkg = 'PRO';
        else if (desc.includes('VIP') || desc.includes('vip')) pkg = 'VIP';
        
        if (!stats.byPackage[pkg]) {
            stats.byPackage[pkg] = { count: 0, amount: 0 };
        }
        stats.byPackage[pkg].count++;
        stats.byPackage[pkg].amount += payment.amount || 0;
    });
    
    return stats;
},

getDailyRevenue: function(trips, payments, days) {
    const dailyRevenue = {};
    const now = new Date();
    
    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyRevenue[dateStr] = { trips: 0, payments: 0, total: 0 };
    }
    
    // Add trip revenue
    trips.forEach(trip => {
        const date = new Date(trip.savedAt || trip.startTime);
        const dateStr = date.toISOString().split('T')[0];
        
        if (dailyRevenue[dateStr]) {
            dailyRevenue[dateStr].trips += trip.fare || 0;
            dailyRevenue[dateStr].total += trip.fare || 0;
        }
    });
    
    // Add payment revenue
    payments.forEach(payment => {
        if (payment.status !== 'completed') return;
        
        const date = new Date(payment.timestamp || payment.completedAt);
        const dateStr = date.toISOString().split('T')[0];
        
        if (dailyRevenue[dateStr]) {
            dailyRevenue[dateStr].payments += payment.amount || 0;
            dailyRevenue[dateStr].total += payment.amount || 0;
        }
    });
    
    // Convert to array
    return Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        trips: revenue.trips,
        payments: revenue.payments,
        total: revenue.total,
        formatted: {
            trips: Pricing.formatCurrency(revenue.trips),
            payments: Pricing.formatCurrency(revenue.payments),
            total: Pricing.formatCurrency(revenue.total)
        }
    }));
},

getUserActivityTrends: function(trips, days) {
    const dailyUsers = {};
    const now = new Date();
    
    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyUsers[dateStr] = new Set();
    }
    
    // Add users for each day
    trips.forEach(trip => {
        if (!trip.deviceId) return;
        
        const date = new Date(trip.savedAt || trip.startTime);
        const dateStr = date.toISOString().split('T')[0];
        
        if (dailyUsers[dateStr]) {
            dailyUsers[dateStr].add(trip.deviceId);
        }
    });
    
    // Convert to array
    return Object.entries(dailyUsers).map(([date, users]) => ({
        date,
        userCount: users.size,
        activeUsers: Array.from(users)
    }));
},

estimateStorageSize: function(trips, payments, settings) {
    const tripSize = JSON.stringify(trips).length;
    const paymentSize = JSON.stringify(payments).length;
    const settingsSize = JSON.stringify(settings).length;
    const totalBytes = tripSize + paymentSize + settingsSize;
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = totalBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return {
        bytes: totalBytes,
        formatted: `${size.toFixed(2)} ${units[unitIndex]}`,
        breakdown: {
            trips: tripSize,
            payments: paymentSize,
            settings: settingsSize
        }
    };
},

generateSystemRecommendations: function(deviceInfo, capabilities, networkInfo) {
    const recommendations = [];
    let overallStatus = 'good';
    
    // Check geolocation
    if (!capabilities.geolocation) {
        recommendations.push({
            type: 'warning',
            message: 'Trình duyệt không hỗ trợ định vị GPS',
            action: 'Sử dụng trình duyệt khác hoặc cấp quyền định vị'
        });
        overallStatus = 'warning';
    }
    
    // Check network
    if (!networkInfo.online) {
        recommendations.push({
            type: 'error',
            message: 'Thiết bị đang offline',
            action: 'Kết nối internet để sử dụng đầy đủ tính năng'
        });
        overallStatus = 'error';
    } else if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
        recommendations.push({
            type: 'warning',
            message: 'Kết nối internet chậm',
            action: 'Chuyển sang mạng WiFi hoặc 4G/5G'
        });
        overallStatus = 'warning';
    }
    
    // Check storage
    if (!capabilities.localStorage) {
        recommendations.push({
            type: 'warning',
            message: 'Trình duyệt không hỗ trợ localStorage',
            action: 'Dữ liệu sẽ không được lưu trữ khi đóng trình duyệt'
        });
    }
    
    // Check screen size for mobile
    if (DeviceModule.isMobile() && deviceInfo.screenWidth < 320) {
        recommendations.push({
            type: 'info',
            message: 'Màn hình nhỏ',
            action: 'Xoay ngang thiết bị để có trải nghiệm tốt hơn'
        });
    }
    
    return {
        recommendations: recommendations,
        overallStatus: overallStatus,
        count: recommendations.length
    };
},

getLicenseIssuanceTrend: function(licenses, months) {
    const trend = {};
    const now = new Date();
    
    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        trend[monthKey] = { issued: 0, activated: 0 };
    }
    
    // Count licenses
    licenses.forEach(license => {
        const date = new Date(license.created);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (trend[monthKey]) {
            trend[monthKey].issued++;
            if (license.deviceId) {
                trend[monthKey].activated++;
            }
        }
    });
    
    // Convert to array
    return Object.entries(trend).map(([month, stats]) => ({
        month,
        issued: stats.issued,
        activated: stats.activated,
        activationRate: stats.issued > 0 ? ((stats.activated / stats.issued) * 100).toFixed(1) + '%' : '0%'
    }));
},

generateOverallRecommendations: function(tripReport, financialReport, userReport, systemReport, licenseReport) {
    const recommendations = [];
    
    // Based on trip data
    if (tripReport.summary.totalTrips === 0) {
        recommendations.push({
            area: 'trips',
            priority: 'high',
            message: 'Chưa có chuyến xe nào được ghi nhận',
            action: 'Khuyến khích người dùng bắt đầu chuyến xe đầu tiên'
        });
    } else if (tripReport.summary.averagePerTrip.fare < 20000) {
        recommendations.push({
            area: 'trips',
            priority: 'medium',
            message: 'Giá trị trung bình mỗi chuyến thấp',
            action: 'Xem xét điều chỉnh giá cước hoặc khuyến mãi cho chuyến dài'
        });
    }
    
    // Based on user data
    if (userReport.userCounts.activePercentage < 30) {
        recommendations.push({
            area: 'users',
            priority: 'high',
            message: 'Tỷ lệ người dùng hoạt động thấp',
            action: 'Triển khai chiến dịch kích hoạt người dùng'
        });
    }
    
    // Based on financial data
    if (licenseReport.revenue.monthly === 0 && licenseReport.totals.issued > 0) {
        recommendations.push({
            area: 'licenses',
            priority: 'high',
            message: 'Có license nhưng chưa có doanh thu',
            action: 'Kiểm tra cơ chế kích hoạt và thanh toán license'
        });
    }
    
    // Based on system status
    if (systemReport.recommendations.overallStatus === 'error') {
        recommendations.push({
            area: 'system',
            priority: 'critical',
            message: 'Hệ thống có vấn đề nghiêm trọng',
            action: 'Kiểm tra kết nối và cấu hình hệ thống ngay'
        });
    }
    
    return {
        recommendations: recommendations,
        prioritySummary: {
            critical: recommendations.filter(r => r.priority === 'critical').length,
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
        }
    };
},

// Export report to file
exportReportToFile: function(report, format = 'json', filename = null) {
    let content, mimeType, extension;
    
    switch (format.toLowerCase()) {
        case 'json':
            content = JSON.stringify(report, null, 2);
            mimeType = 'application/json';
            extension = 'json';
            break;
            
        case 'html':
            content = this.convertReportToHTML(report);
            mimeType = 'text/html';
            extension = 'html';
            break;
            
        case 'csv':
            content = this.convertReportToCSV(report);
            mimeType = 'text/csv';
            extension = 'csv';
            break;
            
        default:
            content = JSON.stringify(report);
            mimeType = 'application/json';
            extension = 'json';
    }
    
    if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `taxi-promax-report-${timestamp}.${extension}`;
    }
    
    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return filename;
},

// Convert report to HTML
convertReportToHTML: function(report) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Taxi Promax Report - ${report.reportType}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
                .section { margin: 30px 0; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; }
                .section-title { color: #007bff; margin-top: 0; border-bottom: 1px solid #dee2e6; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
                .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
                .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
                .stat-label { color: #6c757d; font-size: 14px; }
                .recommendation { background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 10px 0; }
                .recommendation.critical { background: #f8d7da; border-color: #dc3545; }
                .recommendation.high { background: #fff3cd; border-color: #ffc107; }
                .footer { margin-top: 40px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Taxi Promax v${CONFIG.VERSION}</h1>
                <h2>Báo cáo: ${report.reportType}</h2>
                <p>Ngày xuất: ${new Date(report.generatedAt).toLocaleString('vi-VN')}</p>
                <p>Thiết bị: ${report.metadata?.generatedBy || 'Unknown'}</p>
            </div>
            
            ${this.generateReportHTML(report)}
            
            <div class="footer">
                <p>Taxi Promax v${CONFIG.VERSION} &copy; 2023 - Hệ thống quản lý taxi chuyên nghiệp</p>
                <p>Báo cáo được tạo tự động. Thông tin có thể thay đổi theo thời gian thực.</p>
            </div>
        </body>
        </html>
    `;
},

// Generate HTML for report
generateReportHTML: function(report) {
    // This is a simplified version - in production, generate proper HTML for each report type
    let html = '';
    
    if (report.reportType === 'full' && report.sections) {
        // Full report
        html += `
            <div class="section">
                <h3 class="section-title">Tổng quan</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${Pricing.formatCurrency(report.executiveSummary.totalRevenue)}</div>
                        <div class="stat-label">Tổng doanh thu</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${report.executiveSummary.totalTrips}</div>
                        <div class="stat-label">Tổng chuyến xe</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${report.executiveSummary.totalUsers}</div>
                        <div class="stat-label">Tổng người dùng</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${report.executiveSummary.totalLicenses}</div>
                        <div class="stat-label">License đã phát hành</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add sections
        for (const [sectionName, sectionData] of Object.entries(report.sections)) {
            html += `
                <div class="section">
                    <h3 class="section-title">${sectionName.toUpperCase()}</h3>
                    <p><em>Dữ liệu chi tiết có sẵn trong bản export JSON</em></p>
                </div>
            `;
        }
    } else {
        // Single report
        html += `
            <div class="section">
                <h3 class="section-title">Thông tin chính</h3>
                <p>Loại báo cáo: ${report.reportType}</p>
                <p>Thời gian: ${report.period || 'Toàn thời gian'}</p>
                <p>Ngày tạo: ${new Date(report.generatedAt).toLocaleString('vi-VN')}</p>
            </div>
            
            <div class="section">
                <h3 class="section-title">Dữ liệu thống kê</h3>
                <p><em>Dữ liệu chi tiết có sẵn trong bản export JSON</em></p>
            </div>
        `;
    }
    
    // Add recommendations if available
    if (report.recommendations) {
        html += `
            <div class="section">
                <h3 class="section-title">Khuyến nghị</h3>
        `;
        
        if (report.recommendations.recommendations) {
            report.recommendations.recommendations.forEach(rec => {
                html += `
                    <div class="recommendation ${rec.priority}">
                        <strong>[${rec.priority?.toUpperCase()}] ${rec.area}:</strong> ${rec.message}<br>
                        <em>Hành động: ${rec.action}</em>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
    }
    
    return html;
},

// Convert report to CSV
convertReportToCSV: function(report) {
    // Simplified CSV conversion
    const rows = [];
    
    // Add header
    rows.push(['Taxi Promax Report', report.reportType, report.generatedAt]);
    rows.push([]);
    rows.push(['Section', 'Metric', 'Value', 'Unit']);
    
    // Add data based on report type
    if (report.reportType === 'trip_summary' && report.summary) {
        rows.push(['Summary', 'Total Trips', report.summary.totalTrips, '']);
        rows.push(['Summary', 'Total Distance', report.summary.totalDistance, 'km']);
        rows.push(['Summary', 'Total Fare', report.summary.totalFare, 'VND']);
        rows.push(['Summary', 'Total Duration', report.summary.totalDuration, 'seconds']);
    }
    
    if (report.reportType === 'financial' && report.revenue) {
        rows.push(['Revenue', 'From Trips', report.revenue.fromTrips, 'VND']);
        rows.push(['Revenue', 'From Payments', report.revenue.fromPayments, 'VND']);
        rows.push(['Revenue', 'Total', report.revenue.total, 'VND']);
    }
    
    return rows.map(row => row.join(',')).join('\n');
}
