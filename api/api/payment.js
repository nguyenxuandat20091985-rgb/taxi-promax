import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  Vibration, 
  Platform 
} from 'react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { db } from '../config/firebase'; // Đường dẫn tới file cấu hình firebase của anh
import { ref, onValue, update, off } from 'firebase/database';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  // --- Các trạng thái hệ thống ---
  const [driverLocation, setDriverLocation] = useState(null);
  const [newTrip, setNewTrip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isDriving, setIsDriving] = useState(false);
  const [currentTripData, setCurrentTripData] = useState(null);

  // --- Khai báo Refs để quản lý hiệu ứng realtime ---
  const soundObjectRef = useRef(new Audio.Sound());
  const countdownTimerRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const tripKeyRef = useRef(null);

  // ID định danh của tài xế (Có thể đồng bộ theo số điện thoại của anh)
  const driverId = "TAIXE_XANHSM_01"; 

  // --- 1. CHỨC NĂNG CẬP NHẬT GPS TÀI XẾ LIÊN TỤC ---
  useEffect(() => {
    let isMounted = true;

    async function startLocationTracking() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Anh Đạt ơi, ứng dụng cần quyền truy cập vị trí để quét tìm khách hàng ở gần nhé!');
        return;
      }

      // Định kỳ lấy tọa độ GPS mới và cập nhật trực tiếp lên Firebase
      locationIntervalRef.current = setInterval(async () => {
        try {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          const coords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            lastUpdated: Date.now(),
            status: isDriving ? "busy" : "ready",
            carType: "4_seats"
          };

          if (isMounted) setDriverLocation(coords);

          // Cập nhật trạng thái hoạt động lên nhánh tài xế online trên hệ thống tổng đài
          await update(ref(db, `tai_xe_online/${driverId}`), coords);
          console.log("=== Đã cập nhật tọa độ GPS tài xế ===");
        } catch (error) {
          console.error("Lỗi cập nhật định vị toàn cầu:", error);
        }
      }, 15000); // Tự động cập nhật mỗi 15 giây
    }

    startLocationTracking();

    return () => {
      isMounted = false;
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [isDriving]);


  // --- 2. LẮNG NGHE ĐƠN HÀNG MỚI TỪ FIREBASE REALTIME ---
  useEffect(() => {
    const datxeRef = ref(db, 'datxe');

    onValue(datxeRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.val();
      
      // Quét liên tục danh sách đơn để tìm lệnh đặt xe đang ở trạng thái chờ "waiting"
      Object.keys(data).forEach((key) => {
        const trip = data[key];
        
        if (trip.status === "waiting" && !showModal && !isDriving) {
          tripKeyRef.current = key; // Ghi nhớ mã chuyến đi để cập nhật trạng thái nhận đơn
          setNewTrip(trip);
          setShowModal(true);
          setCountdown(15); 
          
          // Kích hoạt hệ thống chuông báo động và rung máy lập tức
          playNotificationSound();
          startVibration();
          startCountdown();
        }
      });
    });

    return () => {
      off(datxeRef);
    };
  }, [showModal, isDriving]);


  // --- 3. BỘ ĐẾM NGƯỢC THỜI GIAN NHẬN CHUYẾN (15 GIÂY) ---
  const startCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleDecline(); // Tự động bỏ qua đơn hàng nếu hết thời gian chờ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };


  // --- 4. QUẢN LÝ HIỆU ỨNG ÂM THANH & RUNG PHẦN CỨNG ---
  const playNotificationSound = async () => {
    try {
      await soundObjectRef.current.unloadAsync();
      await soundObjectRef.current.loadAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2051/2051-84.wav' }
      );
      await soundObjectRef.current.setIsLoopingAsync(true);
      await soundObjectRef.current.playAsync();
    } catch (error) {
      console.log("Không khởi tạo được âm thanh báo động:", error);
    }
  };

  const stopNotificationEffects = async () => {
    try {
      clearInterval(countdownTimerRef.current);
      Vibration.cancel();
      await soundObjectRef.current.stopAsync();
    } catch (error) {
      console.log(error);
    }
  };

  const startVibration = () => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate([1000, 1000], true); // Chế độ rung lặp theo chu kỳ
    }
  };


  // --- 5. HÀNH ĐỘNG: XỬ LÝ NHẬN CHUYẾN ĐI ---
  const handleAccept = async () => {
    await stopNotificationEffects();
    setShowModal(false);
    setIsDriving(true);
    setCurrentTripData(newTrip);

    if (tripKeyRef.current) {
      await update(ref(db, `datxe/${tripKeyRef.current}`), {
        status: "driving",
        driverId: driverId,
        driverPhone: "0985190985" // Đồng bộ số điện thoại của anh Đạt lên đơn khách
      });
      alert("➔ Chấp nhận đơn hàng thành công! Anh hãy liên hệ với khách hàng để đón nhé.");
    }
  };


  // --- 6. HÀNH ĐỘNG: XỬ LÝ BỎ QUA ĐƠN HÀNG ---
  const handleDecline = async () => {
    await stopNotificationEffects();
    setShowModal(false);
    setNewTrip(null);
    tripKeyRef.current = null;
  };

  // --- 7. HÀNH ĐỘNG: KẾT THÚC CHUYẾN ĐI ---
  const handleCompleteTrip = async () => {
    setIsDriving(false);
    setCurrentTripData(null);
    if (tripKeyRef.current) {
      await update(ref(db, `datxe/${tripKeyRef.current}`), {
        status: "completed"
      });
      tripKeyRef.current = null;
      alert("✅ Chuyến đi đã hoàn thành xuất sắc! Chúc anh Đạt ngày mới bão đơn.");
    }
  };


  // --- GIAO DIỆN CHÍNH ---
  return (
    <View style={styles.container}>
      <View style={styles.statusBanner}>
        <Text style={styles.statusTitle}>TAXI PROMAX - NETWORK</Text>
        <Text style={[styles.statusMode, { color: isDriving ? '#ff4a4a' : '#00ffaa' }]}>
          Trạng thái: {isDriving ? "ĐANG THỰC HIỆN HÀNH TRÌNH ➔" : "ĐANG QUÉT TÌM ĐƠN HÀNG MỚI..."}
        </Text>
        {driverLocation && (
          <Text style={styles.gpsText}>GPS Realtime: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</Text>
        )}
      </View>

      {isDriving && currentTripData && (
        <View style={styles.activeTripCard}>
          <Text style={styles.activeTripTitle}>🚖 THÔNG TIN HÀNH TRÌNH</Text>
          <Text style={styles.tripInfo}>📍 Đón: {currentTripData.pickup}</Text>
          <Text style={styles.tripInfo}>🏁 Đến: {currentTripData.dropoff}</Text>
          <Text style={styles.tripInfo}>📞 Điện thoại khách: {currentTripData.phone}</Text>
          <Text style={styles.tripInfo}>👥 Số lượng khách: {currentTripData.passengers} hành khách</Text>
          
          <TouchableOpacity style={styles.btnComplete} onPress={handleCompleteTrip}>
            <Text style={styles.btnCompleteText}>HOÀN THÀNH CHUYẾN ĐI</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================================== */}
      {/* POP-UP GIAO DIỆN NỔ ĐƠN RỰC RỠ NEON KHI CÓ KHÁCH ĐẶT XE */}
      {/* ======================================================== */}
      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}</Text>
              <Text style={styles.countdownSub}>Giây</Text>
            </View>

            <Text style={styles.modalHeader}>💥 PHÁT HIỆN ĐƠN MỚI! 💥</Text>
            <Text style={styles.distanceAlert}>Hệ thống đã định vị khách hàng ở gần vị trí của anh</Text>

            {newTrip && (
              <View style={styles.tripDetailBox}>
                <View style={styles.locationLine}>
                  <Text style={styles.iconDot}>🟢</Text>
                  <Text style={styles.locationText}>
                    <Text style={{fontWeight: '800', color: '#00ffaa'}}>ĐIỂM ĐÓN: </Text>
                    {newTrip.pickup}
                  </Text>
                </View>

                <View style={[styles.locationLine, { marginTop: 15 }]}>
                  <Text style={styles.iconDot}>🔴</Text>
                  <Text style={styles.locationText}>
                    <Text style={{fontWeight: '800', color: '#ff4a4a'}}>ĐIỂM ĐẾN: </Text>
                    {newTrip.dropoff}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaBadge}>👥 {newTrip.passengers} Người</Text>
                  <Text style={[styles.metaBadge, { borderColor: '#00ffaa', color: '#00ffaa' }]}>
                    🚗 Xe {newTrip.carType === '4_seats' ? '4 Chỗ' : '7 Chỗ'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.btnDecline} onPress={handleDecline}>
                <Text style={styles.btnText}>BỎ QUA</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnAccept} onPress={handleAccept}>
                <Text style={[styles.btnText, { color: '#030712' }]}>NHẬN CHUYẾN</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- HỆ THỐNG PHONG CÁCH GIAO DIỆN NEON CAO CẤP ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040a08',
    padding: 16,
  },
  statusBanner: {
    backgroundColor: '#0d1613',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 170, 0.2)',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    color: '#00ffaa',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusMode: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  gpsText: {
    color: '#a3b8b3',
    fontSize: 11,
    marginTop: 6,
  },
  activeTripCard: {
    backgroundColor: '#111e1a',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#00ffaa',
  },
  activeTripTitle: {
    color: '#00ffaa',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  tripInfo: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  btnComplete: {
    backgroundColor: '#ff4a4a',
    padding: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 15,
  },
  btnCompleteText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#0d1613',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ffaa',
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#00ffaa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 255, 170, 0.05)',
  },
  countdownText: {
    color: '#00ffaa',
    fontSize: 28,
    fontWeight: '800',
  },
  countdownSub: {
    color: '#a3b8b3',
    fontSize: 10,
    marginTop: -4,
  },
  modalHeader: {
    color: '#00ffaa',
    fontSize: 22,
    fontWeight: '800',
  },
  distanceAlert: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  tripDetailBox: {
    width: '100%',
    backgroundColor: '#162420',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconDot: {
    marginRight: 10,
    marginTop: 2,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 14,
  },
  metaBadge: {
    flex: 1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 6,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  btnDecline: {
    flex: 1,
    backgroundColor: '#1f2937',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnAccept: {
    flex: 1,
    backgroundColor: '#00ffaa',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  }
});
