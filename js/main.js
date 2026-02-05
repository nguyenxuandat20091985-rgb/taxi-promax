// js/main.js - Khởi tạo và kết nối toàn bộ hệ thống
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Khởi tạo các Core Modules
        const taxi = new TaxiSystem();
        const gps = new GPSTracker(taxi);
        const payment = new PaymentManager(taxi);
        
        // 2. Khởi tạo UI Manager và truyền các module vào
        const ui = new UIManager(taxi, gps, payment);
        
        // 3. Chạy lệnh khởi tạo hệ thống
        await taxi.init();
        
        // 4. Kích hoạt các sự kiện người dùng (Click, Swap tab,...)
        ui.initEvents();

        console.log("🚀 TAXI PROMAX đã sẵn sàng hoạt động!");
    } catch (error) {
        console.error("Lỗi khởi động hệ thống:", error);
    }
});
