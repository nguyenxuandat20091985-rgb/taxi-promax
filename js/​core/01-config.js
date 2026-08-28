// ============================================================
// 01-config.js - Firebase config + Biến global + Hằng số
// ============================================================
'use strict';

const FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";
if (!firebase.apps.length) {
  firebase.initializeApp({
    databaseURL: FIREBASE_URL,
    storageBucket: "taxipromax-new.appspot.com"
  });
}
const db = firebase.database();
const storage = firebase.storage();
let messaging = null;

// Biến toàn cục
let map, driverMarker, customerMarker, routeLayer;
let currentLat = null, currentLng = null;
let currentHeading = 0;
let isRunning = false;
let hasPickedUp = false;
let totalKm = 0;
let lastValidPos = null;
let lastValidTime = 0;
let currentRate = 15000;
let currentOrderId = null;
let currentCustomerData = null;
let orderListener = null;
let chatListener = null;
let cancelListener = null;
let wakeLock = null;
let countdownInterval = null;
let _isModalOpening = false;
let _processedOrders = new Set();
let isStreetHail = false;
let lastDisplayedFare = 0;
let isGapMode = false;
let isDriverOnline = true;
let locationPushInterval = null;
let soundEnabled = true;
let isDarkMode = localStorage.getItem('promax_dark') === 'true';
let isLocked = false;

let driverInfo = {
  uid: null, name: '', phone: '', plate: '', carModel: '', fuelType: 'xang', carClass: '4_seats'
};

// Cầu nối window.driverInfo
try {
  Object.defineProperty(window, 'driverInfo', {
    configurable: true,
    get: function(){ return driverInfo; },
    set: function(v){ driverInfo = v; }
  });
} catch(e) { window.driverInfo = driverInfo; }

// Hằng số
const GAP_THRESHOLD = 15000;
const ACCURACY_STRICT = 80;
const ACCURACY_NORMAL = 150;
const ACCURACY_MAX = 300;
const MIN_DISTANCE_DELTA = 0.008;
const MAX_HISTORY_SIZE = 500;
const MIN_FARE = 20000;
const MAX_SPEED_KMH = 140;
const BASE_RATE = 15000;

let gpsWatchId = null;
let gpsFirstFixTime = null;
let gpsRetryCount = 0;
let lastAccuracy = 999;
let hasCenteredMap = false;
let curSpeed = 0;

console.log('✅ 01-config.js loaded');