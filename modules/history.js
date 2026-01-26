    // Apply filters
    if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        trips = trips.filter(trip => new Date(trip.savedAt || trip.startTime) >= startDate);
    }
    
    if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        trips = trips.filter(trip => new Date(trip.savedAt || trip.startTime) <= endDate);
    }
    
    if (filters.minDistance) {
        trips = trips.filter(trip => trip.distance >= filters.minDistance);
    }
    
    if (filters.maxDistance) {
        trips = trips.filter(trip => trip.distance <= filters.maxDistance);
    }
    
    if (filters.minFare) {
        trips = trips.filter(trip => trip.fare >= filters.minFare);
    }
    
    if (filters.maxFare) {
        trips = trips.filter(trip => trip.fare <= filters.maxFare);
    }
    
    if (filters.deviceId) {
        trips = trips.filter(trip => trip.deviceId === filters.deviceId);
    }
    
    // Sort
    const sortField = filters.sortBy || 'date';
    const sortDirection = filters.sortDirection || 'desc';
    
    trips.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
            case 'date':
                aValue = new Date(a.savedAt || a.startTime);
                bValue = new Date(b.savedAt || b.startTime);
                break;
            case 'distance':
                aValue = a.distance || 0;
                bValue = b.distance || 0;
                break;
            case 'fare':
                aValue = a.fare || 0;
                bValue = b.fare || 0;
                break;
            case 'duration':
                aValue = a.duration || 0;
                bValue = b.duration || 0;
                break;
            default:
                aValue = new Date(a.savedAt || a.startTime);
                bValue = new Date(b.savedAt || b.startTime);
        }
        
        if (sortDirection === 'asc') {
            return aValue - bValue;
        } else {
            return bValue - aValue;
        }
    });
    
    return trips;
},

// Get statistics from history
getHistoryStatistics: function(trips = null) {
    const tripList = trips || Storage.getTrips(1000);
    
    if (tripList.length === 0) {
        return {
            totalTrips: 0,
            totalDistance: 0,
            totalFare: 0,
            totalDuration: 0,
            averageDistance: 0,
            averageFare: 0,
            averageDuration: 0
        };
    }
    
    const stats = {
        totalTrips: tripList.length,
        totalDistance: 0,
        totalFare: 0,
        totalDuration: 0,
        byDay: {},
        byHour: {},
        byWeekday: {}
    };
    
    tripList.forEach(trip => {
        stats.totalDistance += trip.distance || 0;
        stats.totalFare += trip.fare || 0;
        stats.totalDuration += trip.duration || 0;
        
        // Group by day
        const date = new Date(trip.savedAt || trip.startTime);
        const dayKey = date.toISOString().split('T')[0];
        const hour = date.getHours();
        const weekday = date.getDay();
        
        if (!stats.byDay[dayKey]) {
            stats.byDay[dayKey] = { trips: 0, distance: 0, fare: 0 };
        }
        stats.byDay[dayKey].trips++;
        stats.byDay[dayKey].distance += trip.distance || 0;
        stats.byDay[dayKey].fare += trip.fare || 0;
        
        // Group by hour
        if (!stats.byHour[hour]) {
            stats.byHour[hour] = 0;
        }
        stats.byHour[hour]++;
        
        // Group by weekday
        if (!stats.byWeekday[weekday]) {
            stats.byWeekday[weekday] = 0;
        }
        stats.byWeekday[weekday]++;
    });
    
    // Calculate averages
    stats.averageDistance = stats.totalDistance / stats.totalTrips;
    stats.averageFare = stats.totalFare / stats.totalTrips;
    stats.averageDuration = stats.totalDuration / stats.totalTrips;
    
    // Format for display
    stats.formatted = {
        totalDistance: stats.totalDistance.toFixed(2) + ' km',
        totalFare: Pricing.formatCurrency(stats.totalFare),
        totalDuration: this.formatDuration(stats.totalDuration),
        averageDistance: stats.averageDistance.toFixed(2) + ' km',
        averageFare: Pricing.formatCurrency(stats.averageFare),
        averageDuration: this.formatDuration(stats.averageDuration)
    };
    
    return stats;
},

// Format duration in seconds to HH:MM:SS
formatDuration: function(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
},

// Export history to various formats
exportHistory: function(format = 'json', trips = null) {
    const tripList = trips || Storage.getTrips(1000);
    
    switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify(tripList, null, 2);
            
        case 'csv':
            return this.convertToCSV(tripList);
            
        case 'html':
            return this.convertToHTML(tripList);
            
        case 'pdf':
            // In real app, generate PDF
            console.log('PDF export would be generated here');
            return this.convertToHTML(tripList);
            
        default:
            return JSON.stringify(tripList);
    }
},

// Convert trips to CSV
convertToCSV: function(trips) {
    if (trips.length === 0) return '';
    
    const headers = ['Date', 'Distance (km)', 'Duration', 'Fare (VND)', 'Start Time', 'End Time', 'Device ID'];
    
    const rows = trips.map(trip => {
        const date = new Date(trip.savedAt || trip.startTime);
        return [
            date.toLocaleDateString('vi-VN'),
            (trip.distance || 0).toFixed(2),
            trip.formattedDuration || this.formatDuration(trip.duration || 0),
            (trip.fare || 0).toString(),
            new Date(trip.startTime).toLocaleString('vi-VN'),
            trip.endTime ? new Date(trip.endTime).toLocaleString('vi-VN') : '',
            trip.deviceId || ''
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
},

// Convert trips to HTML
convertToHTML: function(trips) {
    const stats = this.getHistoryStatistics(trips);
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Taxi Promax - Lịch sử chuyến xe</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Taxi Promax v5.1</h1>
                <h2>Báo cáo lịch sử chuyến xe</h2>
                <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            
            <div class="stats">
                <h3>Thống kê tổng quan</h3>
                <p><strong>Tổng số chuyến:</strong> ${stats.totalTrips}</p>
                <p><strong>Tổng quãng đường:</strong> ${stats.formatted.totalDistance}</p>
                <p><strong>Tổng doanh thu:</strong> ${stats.formatted.totalFare}</p>
                <p><strong>Tổng thời gian:</strong> ${stats.formatted.totalDuration}</p>
                <p><strong>Trung bình mỗi chuyến:</strong> ${stats.formatted.averageDistance} | ${stats.formatted.averageFare} | ${stats.formatted.averageDuration}</p>
            </div>
            
            <h3>Chi tiết chuyến xe</h3>
            <table>
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Quãng đường (km)</th>
                        <th>Thời gian</th>
                        <th>Tổng tiền (VND)</th>
                        <th>Thời gian bắt đầu</th>
                        <th>Thời gian kết thúc</th>
                    </tr>
                </thead>
                <tbody>
                    ${trips.map(trip => {
                        const date = new Date(trip.savedAt || trip.startTime);
                        return `
                            <tr>
                                <td>${date.toLocaleDateString('vi-VN')}</td>
                                <td>${(trip.distance || 0).toFixed(2)}</td>
                                <td>${trip.formattedDuration || this.formatDuration(trip.duration || 0)}</td>
                                <td>${Pricing.formatCurrency(trip.fare || 0)}</td>
                                <td>${new Date(trip.startTime).toLocaleString('vi-VN')}</td>
                                <td>${trip.endTime ? new Date(trip.endTime).toLocaleString('vi-VN') : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
                <p>Taxi Promax v5.1 &copy; 2023 - Hệ thống quản lý taxi chuyên nghiệp</p>
            </div>
        </body>
        </html>
    `;
    
    return html;
},

// Search trips
searchTrips: function(query, field = 'all') {
    const trips = Storage.getTrips(1000);
    
    if (!query) return trips;
    
    const searchTerm = query.toLowerCase();
    
    return trips.filter(trip => {
        switch (field) {
            case 'date':
                const dateStr = new Date(trip.savedAt || trip.startTime).toLocaleString('vi-VN').toLowerCase();
                return dateStr.includes(searchTerm);
                
            case 'distance':
                return trip.distance && trip.distance.toString().includes(searchTerm);
                
            case 'fare':
                return trip.fare && trip.fare.toString().includes(searchTerm);
                
            case 'device':
                return trip.deviceId && trip.deviceId.toLowerCase().includes(searchTerm);
                
            case 'all':
            default:
                const allText = [
                    new Date(trip.savedAt || trip.startTime).toLocaleString('vi-VN'),
                    trip.distance?.toString(),
                    trip.fare?.toString(),
                    trip.deviceId,
                    trip.id
                ].join(' ').toLowerCase();
                
                return allText.includes(searchTerm);
        }
    });
},

// Get trips by date range
getTripsByDateRange: function(startDate, endDate) {
    const trips = Storage.getTrips(1000);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return trips.filter(trip => {
        const tripDate = new Date(trip.savedAt || trip.startTime);
        return tripDate >= start && tripDate <= end;
    });
},

// Get monthly summary
getMonthlySummary: function(year = null, month = null) {
    const trips = Storage.getTrips(1000);
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== null ? month : now.getMonth();
    
    const filteredTrips = trips.filter(trip => {
        const tripDate = new Date(trip.savedAt || trip.startTime);
        return tripDate.getFullYear() === targetYear && tripDate.getMonth() === targetMonth;
    });
    
    const stats = this.getHistoryStatistics(filteredTrips);
    
    // Group by day
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const dailyStats = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayTrips = filteredTrips.filter(trip => {
            const tripDate = new Date(trip.savedAt || trip.startTime);
            return tripDate.getDate() === day;
        });
        
        const dayStats = this.getHistoryStatistics(dayTrips);
        dailyStats.push({
            day: day,
            trips: dayStats.totalTrips,
            distance: dayStats.totalDistance,
            fare: dayStats.totalFare,
            formattedFare: Pricing.formatCurrency(dayStats.totalFare)
        });
    }
    
    return {
        year: targetYear,
        month: targetMonth + 1, // 1-based for display
        trips: filteredTrips,
        summary: stats,
        dailyStats: dailyStats
    };
},

// Delete trip by ID
deleteTrip: function(tripId) {
    const trips = Storage.getTrips(1000);
    const filteredTrips = trips.filter(trip => trip.id !== tripId);
    
    // Save back to storage
    Storage.save('trip_history', filteredTrips, true);
    
    return trips.length - filteredTrips.length; // Number of trips deleted
},

// Backup history
backupHistory: function() {
    const trips = Storage.getTrips(1000);
    const backup = {
        version: CONFIG.VERSION,
        exportDate: new Date().toISOString(),
        count: trips.length,
        trips: trips
    };
    
    return JSON.stringify(backup, null, 2);
},

// Restore history
restoreHistory: function(backupData) {
    try {
        const backup = JSON.parse(backupData);
        
        if (backup.version !== CONFIG.VERSION) {
            throw new Error(`Version mismatch: ${backup.version} != ${CONFIG.VERSION}`);
        }
        
        if (!backup.trips || !Array.isArray(backup.trips)) {
            throw new Error('Invalid backup format');
        }
        
        // Merge with existing trips
        const existingTrips = Storage.getTrips(1000);
        const allTrips = [...backup.trips, ...existingTrips];
        
        // Remove duplicates by ID
        const uniqueTrips = [];
        const seenIds = new Set();
        
        allTrips.forEach(trip => {
            if (!seenIds.has(trip.id)) {
                seenIds.add(trip.id);
                uniqueTrips.push(trip);
            }
        });
        
        // Sort by date
        uniqueTrips.sort((a, b) => {
            const dateA = new Date(a.savedAt || a.startTime);
            const dateB = new Date(b.savedAt || b.startTime);
            return dateB - dateA;
        });
        
        // Save to storage
        Storage.save('trip_history', uniqueTrips, true);
        
        return uniqueTrips.length;
    } catch (error) {
        console.error('Restore history error:', error);
        throw error;
    }
}
