decrypt: function(encryptedText, key = CONFIG.SYSTEM.ENCRYPTION_KEY) {
    try {
        const text = atob(encryptedText);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedText;
    }
},

// Save data with encryption
save: function(key, data, encrypt = true) {
    try {
        const dataStr = JSON.stringify(data);
        const processedData = encrypt ? this.encrypt(dataStr) : dataStr;
        localStorage.setItem(key, processedData);
        return true;
    } catch (error) {
        console.error('Save error:', error);
        return false;
    }
},

// Load data with decryption
load: function(key, encrypted = true) {
    try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        
        const processedData = encrypted ? this.decrypt(data) : data;
        return JSON.parse(processedData);
    } catch (error) {
        console.error('Load error:', error);
        return null;
    }
},

// Remove data
remove: function(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Remove error:', error);
        return false;
    }
},

// Trip history management
saveTrip: function(tripData) {
    try {
        const trips = this.load('trip_history', true) || [];
        
        // Add metadata
        const enhancedTrip = {
            ...tripData,
            id: 'TRIP-' + Date.now(),
            savedAt: new Date().toISOString(),
            deviceId: Security.getDeviceId()
        };
        
        trips.unshift(enhancedTrip); // Add to beginning
        
        // Keep only last N trips
        const maxTrips = CONFIG.SYSTEM.MAX_TRIP_HISTORY;
        if (trips.length > maxTrips) {
            trips.splice(maxTrips);
        }
        
        this.save('trip_history', trips, true);
        return enhancedTrip.id;
    } catch (error) {
        console.error('Save trip error:', error);
        return null;
    }
},

getTrips: function(limit = 50) {
    try {
        const trips = this.load('trip_history', true) || [];
        return trips.slice(0, limit);
    } catch (error) {
        console.error('Get trips error:', error);
        return [];
    }
},

clearTrips: function() {
    return this.save('trip_history', [], true);
},

// Settings management
saveSettings: function(settings) {
    try {
        const currentSettings = this.load('app_settings', true) || {};
        const mergedSettings = { ...currentSettings, ...settings };
        return this.save('app_settings', mergedSettings, true);
    } catch (error) {
        console.error('Save settings error:', error);
        return false;
    }
},

getSettings: function() {
    try {
        const defaultSettings = {
            pricePerKm: CONFIG.PRICING.PRICE_PER_KM,
            pricePerMinute: CONFIG.PRICING.PRICE_PER_MINUTE,
            baseFee: CONFIG.PRICING.BASE_FEE,
            autoStart: false,
            soundEnabled: true,
            darkMode: false
        };
        
        const savedSettings = this.load('app_settings', true) || {};
        return { ...defaultSettings, ...savedSettings };
    } catch (error) {
        console.error('Get settings error:', error);
        return defaultSettings;
    }
},

// License management
getCurrentLicense: function() {
    try {
        return this.load('taxi_licenses', true) || null;
    } catch (error) {
        console.error('Get license error:', error);
        return null;
    }
},

// Statistics
saveStatistic: function(type, value) {
    try {
        const stats = this.load('app_statistics', true) || {};
        const today = new Date().toISOString().split('T')[0];
        
        if (!stats[today]) {
            stats[today] = { date: today, trips: 0, distance: 0, revenue: 0 };
        }
        
        switch (type) {
            case 'trip':
                stats[today].trips += 1;
                break;
            case 'distance':
                stats[today].distance += value;
                break;
            case 'revenue':
                stats[today].revenue += value;
                break;
        }
        
        return this.save('app_statistics', stats, true);
    } catch (error) {
        console.error('Save statistic error:', error);
        return false;
    }
},

getStatistics: function(days = 30) {
    try {
        const stats = this.load('app_statistics', true) || {};
        const result = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            result.push({
                date: dateStr,
                trips: stats[dateStr]?.trips || 0,
                distance: stats[dateStr]?.distance || 0,
                revenue: stats[dateStr]?.revenue || 0
            });
        }
        
        return result;
    } catch (error) {
        console.error('Get statistics error:', error);
        return [];
    }
},

// Backup and restore
backupData: function() {
    try {
        const backup = {
            version: CONFIG.VERSION,
            timestamp: new Date().toISOString(),
            deviceId: Security.getDeviceId(),
            data: {
                trips: this.load('trip_history', true) || [],
                settings: this.load('app_settings', true) || {},
                statistics: this.load('app_statistics', true) || {},
                license: this.load('taxi_licenses', true) || null
            }
        };
        
        return JSON.stringify(backup);
    } catch (error) {
        console.error('Backup error:', error);
        return null;
    }
},

restoreData: function(backupString) {
    try {
        const backup = JSON.parse(backupString);
        
        if (backup.version !== CONFIG.VERSION) {
            throw new Error(`Version mismatch: ${backup.version} != ${CONFIG.VERSION}`);
        }
        
        if (backup.data.trips) this.save('trip_history', backup.data.trips, true);
        if (backup.data.settings) this.save('app_settings', backup.data.settings, true);
        if (backup.data.statistics) this.save('app_statistics', backup.data.statistics, true);
        if (backup.data.license) this.save('taxi_licenses', backup.data.license, true);
        
        return true;
    } catch (error) {
        console.error('Restore error:', error);
        return false;
    }
},

// Clear all data
clearAllData: function() {
    try {
        const keysToKeep = ['device_id']; // Keep device ID
        const allKeys = Object.keys(localStorage);
        
        for (const key of allKeys) {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Clear all data error:', error);
        return false;
    }
}
