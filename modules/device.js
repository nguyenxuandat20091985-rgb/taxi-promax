        // Screen info
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenColorDepth: screen.colorDepth,
        screenPixelDepth: screen.pixelDepth,
        
        // Window info
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        
        // Timezone
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Online status
        online: navigator.onLine,
        
        // Cookies enabled
        cookiesEnabled: navigator.cookieEnabled,
        
        // Storage
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        
        // Device ID (from security module)
        deviceId: Security.getDeviceId(),
        
        // Timestamp
        timestamp: new Date().toISOString()
    };
},

// Check device capabilities
checkCapabilities: function() {
    const capabilities = {
        geolocation: !!navigator.geolocation,
        notifications: 'Notification' in window,
        vibration: 'vibrate' in navigator,
        battery: 'getBattery' in navigator,
        connection: 'connection' in navigator,
        storageQuota: 'storage' in navigator && 'estimate' in navigator.storage,
        bluetooth: 'bluetooth' in navigator,
        usb: 'usb' in navigator,
        serial: 'serial' in navigator,
        
        // Web APIs
        webWorker: !!window.Worker,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        fetch: !!window.fetch,
        
        // Media
        camera: !!navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
        microphone: !!navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
        
        // Graphics
        webgl: (function() {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        })(),
        
        // Storage
        indexedDB: !!window.indexedDB,
        webSQL: !!window.openDatabase
    };
    
    return capabilities;
},

// Get battery status (if supported)
getBatteryStatus: function() {
    return new Promise((resolve) => {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                resolve({
                    level: battery.level * 100,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                });
            }).catch(() => {
                resolve(null);
            });
        } else {
            resolve(null);
        }
    });
},

// Get network information
getNetworkInfo: function() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
        return {
            online: navigator.onLine,
            type: 'unknown',
            effectiveType: 'unknown',
            downlink: 0,
            rtt: 0,
            saveData: false
        };
    }
    
    return {
        online: navigator.onLine,
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
        downlinkMax: connection.downlinkMax
    };
},

// Get storage usage
getStorageUsage: function() {
    return new Promise((resolve) => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                resolve({
                    quota: estimate.quota,
                    usage: estimate.usage,
                    usageDetails: estimate.usageDetails
                });
            }).catch(() => {
                resolve(null);
            });
        } else {
            resolve(null);
        }
    });
},

// Check if device is mobile
isMobile: function() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
},

// Check if device is tablet
isTablet: function() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
},

// Check if device is desktop
isDesktop: function() {
    return !this.isMobile() && !this.isTablet();
},

// Get device orientation
getOrientation: function() {
    if (screen.orientation) {
        return {
            type: screen.orientation.type,
            angle: screen.orientation.angle
        };
    } else if (window.orientation !== undefined) {
        return {
            type: Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait',
            angle: window.orientation
        };
    } else {
        return {
            type: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            angle: 0
        };
    }
},

// Get memory info (if supported)
getMemoryInfo: function() {
    if ('deviceMemory' in navigator) {
        return {
            deviceMemory: navigator.deviceMemory, // in GB
            hardwareConcurrency: navigator.hardwareConcurrency || 0
        };
    }
    return null;
},

// Get installed PWA status
getPWAStatus: function() {
    return {
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
        minimalUI: window.matchMedia('(display-mode: minimal-ui)').matches,
        browser: window.matchMedia('(display-mode: browser)').matches
    };
},

// Request permission
requestPermission: function(permission) {
    return new Promise((resolve) => {
        if (!navigator.permissions) {
            resolve('not_supported');
            return;
        }
        
        navigator.permissions.query({ name: permission })
            .then(result => {
                resolve(result.state);
            })
            .catch(() => {
                resolve('not_supported');
            });
    });
},

// Get all permissions status
getPermissionsStatus: function() {
    const permissions = [
        'geolocation',
        'notifications',
        'push',
        'midi',
        'camera',
        'microphone',
        'background-sync',
        'persistent-storage'
    ];
    
    const promises = permissions.map(permission => 
        this.requestPermission(permission).then(status => ({
            permission: permission,
            status: status
        }))
    );
    
    return Promise.all(promises);
},

// Get device fingerprint
getFingerprint: function() {
    const components = [];
    
    // Screen
    components.push(`screen:${screen.width}x${screen.height}:${screen.colorDepth}`);
    
    // Timezone
    components.push(`tz:${new Date().getTimezoneOffset()}`);
    
    // Language
    components.push(`lang:${navigator.language}`);
    
    // Platform
    components.push(`platform:${navigator.platform}`);
    
    // User agent (partial)
    const ua = navigator.userAgent;
    components.push(`ua:${ua.substring(0, 50)}`);
    
    // Canvas fingerprint (simplified)
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 50, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('TaxiPromax', 2, 15);
        const dataUrl = canvas.toDataURL();
        components.push(`canvas:${dataUrl.substring(0, 100)}`);
    } catch (e) {
        components.push('canvas:error');
    }
    
    // WebGL fingerprint (simplified)
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                components.push(`webgl_vendor:${vendor}`);
                components.push(`webgl_renderer:${renderer}`);
            }
        }
    } catch (e) {
        components.push('webgl:error');
    }
    
    // Create hash
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return `FP-${Math.abs(hash).toString(16).toUpperCase()}`;
},

// Monitor device changes
startMonitoring: function(callback) {
    const events = [];
    
    // Online/offline
    window.addEventListener('online', () => {
        callback('online', { online: true });
    });
    
    window.addEventListener('offline', () => {
        callback('offline', { online: false });
    });
    
    // Resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            callback('resize', this.getInfo());
        }, 250);
    });
    
    // Orientation change
    window.addEventListener('orientationchange', () => {
        callback('orientationchange', this.getOrientation());
    });
    
    // Battery changes
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            battery.addEventListener('levelchange', () => {
                callback('battery_level', { level: battery.level * 100 });
            });
            
            battery.addEventListener('chargingchange', () => {
                callback('battery_charging', { charging: battery.charging });
            });
        });
    }
    
    // Network changes
    const connection = navigator.connection;
    if (connection) {
        connection.addEventListener('change', () => {
            callback('network_change', this.getNetworkInfo());
        });
    }
    
    return () => {
        // Cleanup function
        events.forEach(event => {
            window.removeEventListener(event.type, event.handler);
        });
    };
},

// Check if device is trusted (based on previous usage)
isTrustedDevice: function() {
    const deviceId = Security.getDeviceId();
    const trips = Storage.getTrips(100);
    
    // Device is trusted if it has completed trips
    const hasTrips = trips.some(trip => trip.deviceId === deviceId);
    
    // Check if device has been used for a while
    const firstTrip = trips.find(trip => trip.deviceId === deviceId);
    if (firstTrip) {
        const firstDate = new Date(firstTrip.savedAt || firstTrip.startTime);
        const now = new Date();
        const daysSinceFirstUse = (now - firstDate) / (1000 * 60 * 60 * 24);
        
        return {
            trusted: hasTrips && daysSinceFirstUse > 1,
            firstUse: firstDate,
            daysSinceFirstUse: Math.floor(daysSinceFirstUse),
            tripCount: trips.filter(trip => trip.deviceId === deviceId).length
        };
    }
    
    return {
        trusted: false,
        firstUse: null,
        daysSinceFirstUse: 0,
        tripCount: 0
    };
}
