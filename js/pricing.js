    // Base calculation
    let fare = settings.baseFee || CONFIG.PRICING.BASE_FEE;
    
    // Distance cost
    fare += distanceKm * (settings.pricePerKm || CONFIG.PRICING.PRICE_PER_KM);
    
    // Time cost (only if speed is low or stopped)
    if (options.speed && options.speed < 5) { // Less than 5 km/h
        fare += durationMinutes * (settings.pricePerMinute || CONFIG.PRICING.PRICE_PER_MINUTE);
    }
    
    // Peak hour multiplier
    if (options.isPeakHour) {
        fare *= CONFIG.PRICING.PEAK_HOUR_MULTIPLIER;
    }
    
    // Car type multiplier
    if (options.carType) {
        const multipliers = {
            'standard': 1.0,
            'premium': 1.5,
            'suv': 1.8
        };
        fare *= multipliers[options.carType] || 1.0;
    }
    
    // Package discount
    if (options.package === 'VIP') {
        fare *= 0.9; // 10% discount for VIP
    } else if (options.package === 'PRO') {
        fare *= 0.95; // 5% discount for PRO
    }
    
    // Round to nearest 1000
    fare = Math.round(fare / 1000) * 1000;
    
    return fare;
},

// Estimate fare for booking
estimateFare: function(pickup, dropoff, carType = 'standard') {
    // Simulated distance calculation (in real app, use routing API)
    const baseDistance = 5; // km
    const randomFactor = 0.5 + Math.random();
    const estimatedDistance = baseDistance * randomFactor;
    
    // Simulated time estimation
    const estimatedMinutes = estimatedDistance * 3; // Assuming 20 km/h average speed
    
    // Calculate estimated fare
    const fare = this.calculateFare(estimatedDistance, estimatedMinutes, {
        carType: carType,
        isPeakHour: GPS.isPeakHour(),
        speed: 20 // Estimated average speed
    });
    
    return {
        distance: estimatedDistance,
        duration: estimatedMinutes,
        fare: fare,
        breakdown: {
            baseFee: CONFIG.PRICING.BASE_FEE,
            distanceCost: estimatedDistance * CONFIG.PRICING.PRICE_PER_KM,
            timeCost: 0, // Not included in estimate
            peakSurcharge: GPS.isPeakHour() ? fare * 0.2 : 0,
            carTypeSurcharge: carType !== 'standard' ? fare * 0.3 : 0
        }
    };
},

// Calculate trip cost in real-time
calculateLiveFare: function(tripData, currentPackage = 'FREE') {
    if (!tripData || tripData.distance === undefined) {
        return 0;
    }
    
    // Convert duration from seconds to minutes
    const durationMinutes = (tripData.duration || 0) / 60;
    
    // Get current speed
    const currentSpeed = GPS.getCurrentSpeed();
    
    const fare = this.calculateFare(tripData.distance, durationMinutes, {
        speed: currentSpeed,
        isPeakHour: GPS.isPeakHour(),
        package: currentPackage
    });
    
    return fare;
},

// Format currency
formatCurrency: function(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(amount);
},

// Get pricing breakdown for display
getPricingBreakdown: function(distanceKm, durationMinutes, options = {}) {
    const settings = Storage.getSettings();
    const breakdown = [];
    
    // Base fee
    breakdown.push({
        name: 'Phí mở cửa',
        amount: settings.baseFee || CONFIG.PRICING.BASE_FEE
    });
    
    // Distance cost
    const distanceCost = distanceKm * (settings.pricePerKm || CONFIG.PRICING.PRICE_PER_KM);
    breakdown.push({
        name: `Quãng đường (${distanceKm.toFixed(2)} km)`,
        amount: Math.round(distanceCost)
    });
    
    // Time cost if applicable
    if (options.speed && options.speed < 5) {
        const timeCost = durationMinutes * (settings.pricePerMinute || CONFIG.PRICING.PRICE_PER_MINUTE);
        breakdown.push({
            name: `Thời gian (${Math.round(durationMinutes)} phút)`,
            amount: Math.round(timeCost)
        });
    }
    
    // Peak hour surcharge
    if (options.isPeakHour) {
        const subtotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
        const peakSurcharge = subtotal * (CONFIG.PRICING.PEAK_HOUR_MULTIPLIER - 1);
        breakdown.push({
            name: 'Phụ thu giờ cao điểm (+20%)',
            amount: Math.round(peakSurcharge)
        });
    }
    
    // Car type surcharge
    if (options.carType && options.carType !== 'standard') {
        const multipliers = { 'premium': 0.5, 'suv': 0.8 };
        const subtotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
        const carSurcharge = subtotal * (multipliers[options.carType] || 0);
        breakdown.push({
            name: `Phụ thu xe ${options.carType === 'premium' ? 'cao cấp' : 'SUV'}`,
            amount: Math.round(carSurcharge)
        });
    }
    
    // Package discount
    if (options.package && options.package !== 'FREE') {
        const subtotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
        const discounts = { 'BASIC': 0, 'PRO': 0.05, 'VIP': 0.1 };
        const discount = subtotal * (discounts[options.package] || 0);
        if (discount > 0) {
            breakdown.push({
                name: `Giảm giá gói ${options.package} (${discounts[options.package] * 100}%)`,
                amount: -Math.round(discount)
            });
        }
    }
    
    // Calculate total
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    return {
        breakdown: breakdown,
        subtotal: breakdown.filter(item => item.amount > 0).reduce((sum, item) => sum + item.amount, 0),
        total: Math.round(total / 1000) * 1000, // Round to nearest 1000
        formattedTotal: this.formatCurrency(Math.round(total / 1000) * 1000)
    };
},

// Validate package limits
checkPackageLimit: function(currentPackage, distanceKm, tripDuration) {
    const packageConfig = CONFIG.PACKAGES[currentPackage];
    
    if (!packageConfig) {
        return { allowed: false, reason: 'Gói không hợp lệ' };
    }
    
    // Check distance limit
    if (distanceKm > packageConfig.maxDistance) {
        return {
            allowed: false,
            reason: `Gói ${currentPackage} giới hạn ${packageConfig.maxDistance}km. Quãng đường hiện tại: ${distanceKm.toFixed(2)}km`
        };
    }
    
    // Check for other limits (can be expanded)
    return { allowed: true };
},

// Calculate package price
getPackagePrice: function(packageType, durationMonths = 1) {
    const packageConfig = CONFIG.PACKAGES[packageType];
    if (!packageConfig) return 0;
    
    let price = packageConfig.price * durationMonths;
    
    // Apply discounts for longer durations
    if (durationMonths >= 12) {
        price *= 0.8; // 20% discount for annual payment
    } else if (durationMonths >= 6) {
        price *= 0.9; // 10% discount for 6 months
    } else if (durationMonths >= 3) {
        price *= 0.95; // 5% discount for 3 months
    }
    
    return Math.round(price / 1000) * 1000;
}
