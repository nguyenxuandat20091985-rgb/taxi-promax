# TAXI PROMAX DATABASE SCHEMA

## DATABASE

Firebase Realtime Database

---

# ROOT

drivers/
orders/
trips/
ratings/
payments/
subscriptions/
admin/
analytics/

---

# DRIVERS

drivers/

driverId/

    profile/
        name
        phone
        avatar
        vehicleType
        vehiclePlate

    status/
        online
        available
        currentTripId

    gps/
        lat
        lng
        accuracy
        speed
        heading
        timestamp

    statistics/
        totalTrips
        completedTrips
        cancelledTrips
        rating
        earnings

---

# CUSTOMERS

customers/

customerId/

    profile/
        name
        phone
        avatar

    statistics/
        totalTrips
        cancelledTrips

---

# ORDERS

orders/

orderId/

    customerId

    driverId

    status

    pickup/

        lat
        lng
        address

    destination/

        lat
        lng
        address

    pricing/

        baseFare
        distanceFare
        totalFare

    createdAt

    acceptedAt

    completedAt

---

# TRIPS

trips/

tripId/

    customerId

    driverId

    orderId

    status

    startTime

    endTime

    route/

    distanceKm

    durationMinute

    totalFare

---

# RATINGS

ratings/

ratingId/

    tripId

    customerId

    driverId

    stars

    comment

    createdAt

---

# PAYMENTS

payments/

paymentId/

    tripId

    customerId

    amount

    paymentMethod

    transactionId

    status

    createdAt

---

# SUBSCRIPTIONS

subscriptions/

driverId/

    packageName

    startDate

    expireDate

    status

---

# ADMIN

admin/

dashboard/

    totalDrivers

    totalCustomers

    totalTrips

    totalRevenue

---

# ANALYTICS

analytics/

daily/

monthly/

yearly/

---

# ORDER STATUS

PENDING

MATCHING

ASSIGNED

ACCEPTED

ARRIVING

IN_PROGRESS

COMPLETED

CANCELLED

---

# DRIVER STATUS

OFFLINE

ONLINE

BUSY

SUSPENDED

---

# PAYMENT STATUS

PENDING

PAID

FAILED

REFUNDED

---

# QUY TẮC DATABASE

1. Không đổi tên node gốc.

2. Không tạo dữ liệu ngoài schema.

3. Mọi tính năng mới phải mở rộng từ schema hiện tại.

4. Không lưu dữ liệu trùng lặp.

5. Không lưu dữ liệu nhạy cảm.

6. Mọi truy vấn phải tối ưu cho Firebase.

7. Ưu tiên Realtime Listener thay vì polling.

8. Mọi trường thời gian sử dụng Unix Timestamp.

9. Mọi ID sử dụng Firebase Push ID hoặc UUID.

10. Mọi thay đổi schema phải ghi vào CHANGELOG.md.