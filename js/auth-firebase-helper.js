/**
 * Taxi ProMax — Firebase Auth helper (browser)
 * Không dùng top-level import URL để tránh fail `node --check` trên CI.
 * Load Firebase Auth SDK trước khi gọi các hàm này.
 *
 * Yêu cầu global: window.firebase / firebase.auth đã init, hoặc truyền auth instance.
 */
(function (global) {
  'use strict';

  var currentUser = null;
  var currentClaims = {};

  function getAuth() {
    if (global.firebase && global.firebase.auth) return global.firebase.auth();
    if (global.auth) return global.auth;
    throw new Error('Firebase Auth chưa được khởi tạo');
  }

  function initAuth(onReady) {
    var auth = getAuth();
    return auth.onAuthStateChanged(function (user) {
      currentUser = user;
      if (user) {
        user.getIdTokenResult(true).then(function (tokenResult) {
          currentClaims = tokenResult.claims || {};
          if (typeof onReady === 'function') onReady(user, currentClaims);
        }).catch(function () {
          currentClaims = {};
          if (typeof onReady === 'function') onReady(user, currentClaims);
        });
      } else {
        currentClaims = {};
        if (typeof onReady === 'function') onReady(null, currentClaims);
      }
    });
  }

  function getCurrentUser() { return currentUser; }
  function getCurrentClaims() {
    var out = {};
    for (var k in currentClaims) if (Object.prototype.hasOwnProperty.call(currentClaims, k)) out[k] = currentClaims[k];
    return out;
  }
  function isAdmin() { return currentClaims.admin === true; }
  function getDriverId() { return currentClaims.driverId || null; }
  function getCustomerId() { return currentClaims.customerId || null; }

  function loginWithPhone(phone, appVerifier) {
    var auth = getAuth();
    var e164 = String(phone).replace(/\D/g, '');
    if (e164.charAt(0) === '0' && e164.length === 10) e164 = '+84' + e164.slice(1);
    else if (e164.charAt(0) !== '+') e164 = '+' + e164;
    return auth.signInWithPhoneNumber(e164, appVerifier);
  }

  function confirmOtp(confirmationResult, otp) {
    return confirmationResult.confirm(otp).then(function (result) {
      currentUser = result.user;
      return result.user.getIdTokenResult(true).then(function (tokenResult) {
        currentClaims = tokenResult.claims || {};
        return { user: result.user, claims: currentClaims };
      });
    });
  }

  function logout() {
    var auth = getAuth();
    return auth.signOut().then(function () {
      currentUser = null;
      currentClaims = {};
      try {
        localStorage.removeItem('driverInfo');
        localStorage.removeItem('customerInfo');
        localStorage.removeItem('adminToken');
      } catch (e) {}
    });
  }

  function getIdToken(forceRefresh) {
    if (!currentUser) return Promise.resolve(null);
    return currentUser.getIdToken(!!forceRefresh);
  }

  global.PromaxAuth = {
    initAuth: initAuth,
    getCurrentUser: getCurrentUser,
    getCurrentClaims: getCurrentClaims,
    isAdmin: isAdmin,
    getDriverId: getDriverId,
    getCustomerId: getCustomerId,
    loginWithPhone: loginWithPhone,
    confirmOtp: confirmOtp,
    logout: logout,
    getIdToken: getIdToken
  };
})(typeof window !== 'undefined' ? window : globalThis);
