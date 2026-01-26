// Generate key from string
generateKey: function(password) {
    // Simple key derivation for demo
    let key = '';
    for (let i = 0; i < 32; i++) {
        const charCode = password.charCodeAt(i % password.length);
        key += String.fromCharCode((charCode + i) % 256);
    }
    return key;
},

// Encrypt text
encrypt: function(text, password = CONFIG.SYSTEM.ENCRYPTION_KEY) {
    try {
        const key = this.generateKey(password);
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        // Add simple integrity check
        const checksum = this.calculateChecksum(text);
        result = checksum + '|' + btoa(result);
        
        return result;
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
},

// Decrypt text
decrypt: function(encryptedText, password = CONFIG.SYSTEM.ENCRYPTION_KEY) {
    try {
        const parts = encryptedText.split('|');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        
        const checksum = parts[0];
        const encryptedData = atob(parts[1]);
        const key = this.generateKey(password);
        let result = '';
        
        for (let i = 0; i < encryptedData.length; i++) {
            const charCode = encryptedData.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        // Verify integrity
        const calculatedChecksum = this.calculateChecksum(result);
        if (calculatedChecksum !== checksum) {
            throw new Error('Integrity check failed');
        }
        
        return result;
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedText;
    }
},

// Calculate simple checksum
calculateChecksum: function(text) {
    let checksum = 0;
    for (let i = 0; i < text.length; i++) {
        checksum = (checksum + text.charCodeAt(i)) % 10000;
    }
    return checksum.toString(16).padStart(4, '0');
},

// Hash function
hash: function(text, algorithm = 'simple') {
    switch (algorithm) {
        case 'simple':
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).toUpperCase();
            
        case 'md5_simulated':
            // Simple simulation of MD5
            let h = 0;
            for (let i = 0; i < text.length; i++) {
                h = (h << 4) + text.charCodeAt(i);
                h = h ^ (h >> 12);
                h = h & 0xffffffff;
            }
            return h.toString(16).padStart(8, '0');
            
        default:
            return this.hash(text, 'simple');
    }
},

// Generate random string
generateRandomString: function(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
},

// Generate license checksum
generateLicenseChecksum: function(licenseKey) {
    let sum = 0;
    for (let i = 0; i < licenseKey.length; i++) {
        sum += licenseKey.charCodeAt(i);
    }
    return (sum % 100).toString().padStart(2, '0');
},

// Verify license checksum
verifyLicenseChecksum: function(licenseKey) {
    const parts = licenseKey.split('-');
    if (parts.length !== 4) return false;
    
    const providedChecksum = parts[3];
    const keyWithoutChecksum = parts[0] + '-' + parts[1] + '-' + parts[2];
    const calculatedChecksum = this.generateLicenseChecksum(keyWithoutChecksum);
    
    return providedChecksum === calculatedChecksum;
},

// Encrypt JSON object
encryptObject: function(obj, password) {
    try {
        const jsonString = JSON.stringify(obj);
        return this.encrypt(jsonString, password);
    } catch (error) {
        console.error('Encrypt object error:', error);
        return null;
    }
},

// Decrypt to JSON object
decryptObject: function(encryptedText, password) {
    try {
        const jsonString = this.decrypt(encryptedText, password);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Decrypt object error:', error);
        return null;
    }
},

// Create digital signature (simulated)
createSignature: function(data, privateKey) {
    // In production, use proper cryptographic signature
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const timestamp = Date.now().toString();
    const signatureData = dataString + timestamp + privateKey;
    
    return {
        signature: this.hash(signatureData, 'md5_simulated'),
        timestamp: timestamp,
        dataHash: this.hash(dataString)
    };
},

// Verify digital signature (simulated)
verifySignature: function(data, signatureObj, privateKey) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const signatureData = dataString + signatureObj.timestamp + privateKey;
    const calculatedSignature = this.hash(signatureData, 'md5_simulated');
    
    return {
        valid: calculatedSignature === signatureObj.signature,
        dataValid: this.hash(dataString) === signatureObj.dataHash,
        age: Date.now() - parseInt(signatureObj.timestamp)
    };
},

// Generate key pair (simulated)
generateKeyPair: function() {
    // In production, use Web Crypto API for real key pairs
    const publicKey = this.generateRandomString(32);
    const privateKey = this.generateRandomString(64);
    
    return {
        publicKey: `PUB-${publicKey}`,
        privateKey: `PRIV-${privateKey}`,
        generatedAt: new Date().toISOString()
    };
},

// Encrypt with public key (simulated)
encryptWithPublicKey: function(text, publicKey) {
    // Simple simulation
    const randomKey = this.generateRandomString(16);
    const encryptedData = this.encrypt(text, randomKey);
    const encryptedKey = this.encrypt(randomKey, publicKey);
    
    return {
        encryptedData: encryptedData,
        encryptedKey: encryptedKey,
        publicKey: publicKey
    };
},

// Decrypt with private key (simulated)
decryptWithPrivateKey: function(encryptedPackage, privateKey) {
    try {
        const decryptedKey = this.decrypt(encryptedPackage.encryptedKey, privateKey);
        const decryptedData = this.decrypt(encryptedPackage.encryptedData, decryptedKey);
        
        return decryptedData;
    } catch (error) {
        console.error('Decrypt with private key error:', error);
        return null;
    }
},

// Create secure token
createSecureToken: function(data, expiresInHours = 24) {
    const payload = {
        data: data,
        expires: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        issued: new Date().toISOString(),
        deviceId: Security.getDeviceId()
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = this.hash(payloadString + CONFIG.SYSTEM.ENCRYPTION_KEY, 'md5_simulated');
    
    return {
        token: btoa(payloadString),
        signature: signature,
        expires: payload.expires
    };
},

// Verify secure token
verifySecureToken: function(tokenObj) {
    try {
        const payloadString = atob(tokenObj.token);
        const payload = JSON.parse(payloadString);
        
        // Check expiration
        if (new Date(payload.expires) < new Date()) {
            return { valid: false, reason: 'Token expired' };
        }
        
        // Verify signature
        const calculatedSignature = this.hash(payloadString + CONFIG.SYSTEM.ENCRYPTION_KEY, 'md5_simulated');
        if (calculatedSignature !== tokenObj.signature) {
            return { valid: false, reason: 'Invalid signature' };
        }
        
        return {
            valid: true,
            payload: payload,
            expiresIn: Math.floor((new Date(payload.expires) - new Date()) / (1000 * 60 * 60)) // hours
        };
    } catch (error) {
        return { valid: false, reason: 'Invalid token' };
    }
},

// Password strength checker
checkPasswordStrength: function(password) {
    let score = 0;
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score++;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score++;
    
    // Contains numbers
    if (/[0-9]/.test(password)) score++;
    
    // Contains special characters
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    // Rating
    let strength = 'Very Weak';
    if (score >= 5) strength = 'Strong';
    else if (score >= 4) strength = 'Good';
    else if (score >= 3) strength = 'Medium';
    else if (score >= 2) strength = 'Weak';
    
    return {
        score: score,
        strength: strength,
        length: password.length,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumbers: /[0-9]/.test(password),
        hasSpecial: /[^a-zA-Z0-9]/.test(password)
    };
},

// Generate secure password
generateSecurePassword: function(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    let password = '';
    
    // Ensure at least one of each type
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill the rest
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return password;
}
