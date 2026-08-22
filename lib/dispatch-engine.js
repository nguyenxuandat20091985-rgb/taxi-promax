import { haversineKm, scoreTripAllocation } from './autonomous-engine.js';

function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export function estimateEtaMinutes(distanceKm, averageSpeedKph = 24) {
    const distance = Math.max(0, finite(distanceKm));
    const speed = clamp(finite(averageSpeedKph, 24), 8, 80);
    return Math.max(1, Math.ceil(distance / speed * 60));
}

export function smartDispatch({ pickup, drivers = [], hotspotWeight = 1, averageSpeedKph = 24 } = {}) {
    const candidates = drivers.slice(0, 50).map(driver => {
        const score = scoreTripAllocation({ driver, pickup, hotspotWeight, now: Date.now() });
        return {
            id: driver.id || driver.uid,
            ...score,
            etaMinutes: estimateEtaMinutes(score.distanceKm, averageSpeedKph)
        };
    }).filter(candidate => candidate.eligible).sort((a, b) => b.score - a.score);
    return { candidates, selected: candidates[0] || null };
}

export function matchReturnTrips({ completedTrip, candidateTrips = [], maxDetourKm = 5, maxWaitMinutes = 20 } = {}) {
    const end = completedTrip?.dropoff || completedTrip?.destination;
    const heading = completedTrip?.destination || completedTrip?.dropoff;
    if (!end || !heading) return [];
    return candidateTrips.slice(0, 100).map(trip => {
        const pickup = trip.pickup || trip.origin;
        const dropoff = trip.dropoff || trip.destination;
        if (!pickup || !dropoff) return null;
        const detourKm = haversineKm(end, pickup);
        const routeKm = haversineKm(pickup, dropoff);
        const waitMinutes = Math.max(0, finite(trip.waitMinutes, 0));
        const score = 0.55 * clamp(1 - detourKm / Math.max(0.1, maxDetourKm), 0, 1)
            + 0.3 * clamp(routeKm / 20, 0, 1)
            + 0.15 * clamp(1 - waitMinutes / Math.max(1, maxWaitMinutes), 0, 1);
        return { id: trip.id || trip.rideId, detourKm: Number(detourKm.toFixed(3)), routeKm: Number(routeKm.toFixed(3)), waitMinutes, score: Number(score.toFixed(4)), eligible: detourKm <= maxDetourKm && waitMinutes <= maxWaitMinutes };
    }).filter(Boolean).filter(item => item.eligible).sort((a, b) => b.score - a.score).slice(0, 20);
}
