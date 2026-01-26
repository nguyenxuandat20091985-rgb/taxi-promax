// Taxi Promax v5.1 - Storage Management
const Storage = {
    // Simple encryption
    encrypt: function(text, key = 'taxi-promax-v5.1-secure-key-2023') {
        try {
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return btoa(result);
        } catch (error) {
            return text;
        }
    },
    
    decrypt: function(encryptedText, key = 'taxi-promax-v5.1-secure-key-2023') {
        try {
            const text = atob(encryptedText);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (error) {
            return encryptedText;
        }
    },
    
    // Save data
    save: function(key, data, encrypt = true) {
        try {
            const dataStr = JSON.stringify(data);
            const processedData = encrypt ? this.encrypt(dataStr) : dataStr;
            localStorage.setItem(key, processedData);
            return true;
        } catch (error) {
            return false;
        }
    },
    
    // Load data
    load: function(key, encrypted = true) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            
            const processedData = encrypted ? this.decrypt(data) : data;
            return JSON.parse(processedData);
        } catch (error) {
            return null;
        }
    },
    
    // Trip history
    saveTrip: function(tripData) {
        try {
            const trips = this.load('trip_history', true) || [];
            const enhancedTrip = {
                ...tripData,
                id: 'TRIP-' + Date.now(),
                savedAt: new Date().toISOString(),
                deviceId: Security.getDeviceId()
            };
            
            trips.unshift(enhancedTrip);
            if (trips.length > 100) trips.splice(100);
            
            this.save('trip_history', trips, true);
            return enhancedTrip.id;
        } catch (error) {
            return null;
        }
    },
    
    getTrips: function(limit = 50) {
        try {
            const trips = this.load('trip_history', true) || [];
            return trips.slice(0, limit);
        } catch (error) {
            return [];
        }
    },
    
    clearTrips: function() {
        return this.save('trip_history', [], true);
    },
    
    // Settings
    saveSettings: function(settings) {
        try {
            const currentSettings = this.load('app_settings', true) || {};
            const mergedSettings = { ...currentSettings, ...settings };
            return this.save('app_settings', mergedSettings, true);
        } catch (error) {
            return false;
        }
    },
    
    getSettings: function() {
        try {
            const defaultSettings = {
                pricePerKm: 12000,
                pricePerMinute: 500,
                baseFee: 10000,
                autoStart: false,
                soundEnabled: true
            };
            
            const savedSettings = this.load('app_settings', true) || {};
            return { ...defaultSettings, ...savedSettings };
        } catch (error) {
            return defaultSettings;
        }
    },
    
    // License
    getCurrentLicense: function() {
        try {
            return this.load('taxi_licenses', true) || null;
        } catch (error) {
            return null;
        }
    }
};
