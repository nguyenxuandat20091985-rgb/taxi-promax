/**
 * js/auth-firebase-helper.js
 *
 * Module hỗ trợ chuyển sang Firebase Authentication.
 * Load sau Firebase SDK.
 */

import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

let auth = null;
let currentUser = null;
let currentClaims = {};
let recaptchaVerifier = null;

export function initAuth(onReady) {
  auth = getAuth();
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult(true);
          currentClaims = tokenResult.claims || {};
        } catch (e) {
          console.warn('[auth] getIdTokenResult failed', e);
          currentClaims = {};
        }
      } else {
        currentClaims = {};
      }
      if (typeof onReady === 'function') onReady(user, currentClaims);
      resolve({ user, claims: currentClaims });
    });
  });
}

export function getCurrentUser() { return currentUser; }
export function getCurrentClaims() { return { ...currentClaims }; }
export function isAdmin() { return currentClaims.admin === true; }
export function getDriverId() { return currentClaims.driverId || null; }
export function getCustomerId() { return currentClaims.customerId || null; }

export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {}
  });
  return recaptchaVerifier;
}

export async function loginWithPhone(phone) {
  if (!auth) throw new Error('initAuth() chưa được gọi');
  let e164 = phone.replace(/\D/g, '');
  if (e164.startsWith('0') && e164.length === 10) e164 = '+84' + e164.slice(1);
  else if (!e164.startsWith('+')) e164 = '+' + e164;
  const verifier = setupRecaptcha();
  return signInWithPhoneNumber(auth, e164, verifier);
}

export async function confirmOtp(confirmationResult, otp) {
  const result = await confirmationResult.confirm(otp);
  const tokenResult = await result.user.getIdTokenResult(true);
  currentUser = result.user;
  currentClaims = tokenResult.claims || {};
  return { user: result.user, claims: currentClaims };
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
  currentUser = null;
  currentClaims = {};
  try {
    localStorage.removeItem('driverInfo');
    localStorage.removeItem('customerInfo');
    localStorage.removeItem('adminToken');
  } catch (_) {}
}

export async function getIdToken(forceRefresh = false) {
  if (!currentUser) return null;
  return currentUser.getIdToken(forceRefresh);
}

window.PromaxAuth = {
  initAuth, getCurrentUser, getCurrentClaims, isAdmin,
  getDriverId, getCustomerId, setupRecaptcha,
  loginWithPhone, confirmOtp, logout, getIdToken
};
