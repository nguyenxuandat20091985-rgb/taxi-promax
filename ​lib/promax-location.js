import { detectGpsTeleportation, weightedMovingAverage } from './autonomous-engine.js';

const MAX_HISTORY = 50;
const MAX_COORDINATE = 180;

function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function normalizePoint(point = {}) {
    const lat = finite(point.lat);
    const lng = finite(point.lng ?? point.lon);
    const timestamp = finite(point.timestamp ?? point.ts);
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > MAX_COORDINATE) return null;
    return { lat, lng, timestamp: timestamp === null ? Date.now() : timestamp };
}

export function assessLocation({ previous, current, history = [], maxSpeedKph = 160, maxJumpKm = 2.5 } = {}) {
    const before = normalizePoint(previous);
    const now = normalizePoint(current);
    if (!before || !now) return { valid: false, suspicious: true, reason: 'invalid_coordinates' };
    const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY).map(normalizePoint).filter(Boolean) : [];
    const integrity = detectGpsTeleportation(before, now, { maxSpeedKph, maxJumpKm });
    const smoothed = weightedMovingAverage([...safeHistory, now]);
    return { ...integrity, smoothed, sampleSize: safeHistory.length + 1 };
}

export function createLocationEvent({ driverId, current, previous, history, ...options } = {}) {
    return {
        driverId: typeof driverId === 'string' ? driverId.slice(0, 120) : null,
        observedAt: Date.now(),
        result: assessLocation({ previous, current, history, ...options })
    };
}
