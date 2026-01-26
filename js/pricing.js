// Taxi Promax v5.1 - Pricing Calculator
const Pricing = {
    calculateFare: function(distanceKm, durationMinutes, options = {}) {
        let fare = 10000; // base fee
        
        // Distance cost
        fare += distanceKm * 12000;
        
        // Time cost if speed is low
        if (options.speed && options.speed < 5) {
            fare += durationMinutes * 500;
        }
        
        // Peak hour multiplier
        if (options.isPeakHour) {
            fare *= 1.2;
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
            fare *= 0.9;
        } else if (options.package === 'PRO') {
            fare *= 0.95;
        }
        
        // Round to nearest 1000
        fare = Math.round(fare / 1000) * 1000;
        
        return fare;
    },
    
    estimateFare: function(pickup, dropoff, carType = 'standard') {
        const baseDistance = 5;
        const randomFactor = 0.5 + Math.random();
        const estimatedDistance = baseDistance * randomFactor;
        const estimatedMinutes = estimatedDistance * 3;
        
        const fare = this.calculateFare(estimatedDistance, estimatedMinutes, {
            carType: carType,
            isPeakHour: false,
            speed: 20
        });
        
        return {
            distance: estimatedDistance,
            duration: estimatedMinutes,
            fare: fare
        };
    },
    
    calculateLiveFare: function(tripData, currentPackage = 'FREE') {
        if (!tripData || tripData.distance === undefined) return 0;
        
        const durationMinutes = (tripData.duration || 0) / 60;
        const fare = this.calculateFare(tripData.distance, durationMinutes, {
            package: currentPackage
        });
        
        return fare;
    },
    
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    }
};
