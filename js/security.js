        // Simple hash function
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        deviceId = 'DEV-' + Math.abs(hash).toString(16).toUpperCase();
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
},

// License validation
validateLicense: function(licenseKey) {
    if (!licenseKey) return { valid: false, package: 'FREE' };
    
    try {
        // Check format
        if (!licenseKey.startsWith(CONFIG.LICENSE_PREFIX)) {
            return { valid: false, package: 'FREE' };
        }
        
        // Get license from storage
        const licenses = JSON.parse(localStorage.getItem('taxi_licenses') || '[]');
        const licenseData = licenses.find(l => l.key === licenseKey);
        
        if (!licenseData) {
            return { valid: false, package: 'FREE' };
        }
        
        // Check expiration
        const now = new Date();
        const expires = new Date(licenseData.expires);
        if (now > expires) {
            return { valid: false, package: 'FREE', expired: true };
        }
        
        // Check device binding
        const deviceId = this.getDeviceId();
        if (licenseData.deviceId && licenseData.deviceId !== deviceId) {
            return { valid: false, package: 'FREE', wrongDevice: true };
        }
        
        return {
            valid: true,
            package: licenseData.package,
            expires: licenseData.expires,
            activated: licenseData.activated,
            deviceId: licenseData.deviceId
        };
    } catch (error) {
        console.error('License validation error:', error);
        return { valid: false, package: 'FREE' };
    }
},

// Generate license key
generateLicense: function(packageType, durationDays = 30) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = CONFIG.LICENSE_PREFIX;
    
    // Generate random part
    for (let i = 0; i < 12; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add package identifier
    const packageCodes = { FREE: 'F', BASIC: 'B', PRO: 'P', VIP: 'V' };
    key += '-' + (packageCodes[packageType.toUpperCase()] || 'F');
    
    // Add checksum
    let checksum = 0;
    for (let i = 0; i < key.length; i++) {
        checksum += key.charCodeAt(i);
    }
    key += '-' + (checksum % 100).toString().padStart(2, '0');
    
    return key;
},

// Activate license
activateLicense: function(licenseKey) {
    try {
        // Validate format
        if (!licenseKey.startsWith(CONFIG.LICENSE_PREFIX)) {
            return { success: false, message: 'License key không đúng định dạng' };
        }
        
        // Parse package from key
        const parts = licenseKey.split('-');
        if (parts.length !== 4) {
            return { success: false, message: 'License key không hợp lệ' };
        }
        
        const packageCode = parts[2];
        const packageMap = { 'F': 'FREE', 'B': 'BASIC', 'P': 'PRO', 'V': 'VIP' };
        const packageType = packageMap[packageCode] || 'FREE';
        
        // Verify checksum
        const checksum = parseInt(parts[3]);
        let calculatedChecksum = 0;
        for (let i = 0; i < parts[0].length + parts[1].length + parts[2].length + 2; i++) {
            calculatedChecksum += licenseKey.charCodeAt(i);
        }
        calculatedChecksum = calculatedChecksum % 100;
        
        if (checksum !== calculatedChecksum) {
            return { success: false, message: 'License key không hợp lệ' };
        }
        
        // Create license data
        const deviceId = this.getDeviceId();
        const now = new Date();
        const expires = new Date(now);
        expires.setDate(expires.getDate() + 30); // 30 days default
        
        const licenseData = {
            key: licenseKey,
            package: packageType,
            deviceId: deviceId,
            activated: now.toISOString(),
            expires: expires.toISOString()
        };
        
        // Save to storage
        let licenses = JSON.parse(localStorage.getItem('taxi_licenses') || '[]');
        licenses = licenses.filter(l => l.key !== licenseKey); // Remove existing
        licenses.push(licenseData);
        localStorage.setItem('taxi_licenses', JSON.stringify(licenseData)); // Store single license
        
        return {
            success: true,
            message: 'Kích hoạt thành công!',
            package: packageType,
            expires: expires.toISOString()
        };
        
    } catch (error) {
        console.error('License activation error:', error);
        return { success: false, message: 'Lỗi kích hoạt license' };
    }
},

// Check feature access based on package
checkFeatureAccess: function(feature, currentPackage) {
    const packageConfig = CONFIG.PACKAGES[currentPackage];
    if (!packageConfig) return false;
    
    switch (feature) {
        case 'unlimited_distance':
            return packageConfig.maxDistance > 50;
        case 'export_report':
            return packageConfig.exportReport;
        case 'priority_support':
            return packageConfig.prioritySupport;
        case 'extended_history':
            return packageConfig.historyDays > 30;
        case 'api_access':
            return packageConfig.apiAccess || false;
        case 'custom_ui':
            return packageConfig.customUI || false;
        default:
            return true;
    }
},

// Session management
createSession: function() {
    const sessionId = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const sessionData = {
        id: sessionId,
        created: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        lastActivity: new Date().toISOString()
    };
    
    localStorage.setItem('current_session', JSON.stringify(sessionData));
    return sessionId;
},

updateSessionActivity: function() {
    const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');
    if (sessionData.id) {
        sessionData.lastActivity = new Date().toISOString();
        localStorage.setItem('current_session', JSON.stringify(sessionData));
    }
},

validateSession: function() {
    const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');
    if (!sessionData.id) return true;
    
    const lastActivity = new Date(sessionData.lastActivity);
    const now = new Date();
    const diffMinutes = (now - lastActivity) / (1000 * 60);
    
    return diffMinutes < 30; // Session expires after 30 minutes of inactivity
},

// Security logging
logSecurityEvent: function(event, details) {
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    logs.push({
        timestamp: new Date().toISOString(),
        event: event,
        details: details,
        deviceId: this.getDeviceId(),
        ip: 'local' // In real app, get from server
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.shift();
    }
    
    localStorage.setItem('security_logs', JSON.stringify(logs));
}
