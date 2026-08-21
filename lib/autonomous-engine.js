const LIMITS = Object.freeze({ minSurge: 0.85, maxSurge: 1.45, maxCompensation: 1.25, maxSpeedKph: 160, maxJumpKm: 2.5 });

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function finite(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

export function haversineKm(a, b) {
    const lat1 = finite(a?.lat), lon1 = finite(a?.lng ?? a?.lon);
    const lat2 = finite(b?.lat), lon2 = finite(b?.lng ?? b?.lon);
    const radians = Math.PI / 180;
    const dLat = (lat2 - lat1) * radians;
    const dLon = (lon2 - lon1) * radians;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function weightedMovingAverage(points = [], alpha = 0.35) {
    const valid = points.filter(point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng ?? point?.lon)));
    if (!valid.length) return null;
    const weight = clamp(finite(alpha, 0.35), 0.05, 0.95);
    return valid.reduce((average, point, index) => index === 0 ? { lat: finite(point.lat), lng: finite(point.lng ?? point.lon) } : {
        lat: weight * finite(point.lat) + (1 - weight) * average.lat,
        lng: weight * finite(point.lng ?? point.lon) + (1 - weight) * average.lng
    }, null);
}

export function detectGpsTeleportation(previous, current, { maxSpeedKph = LIMITS.maxSpeedKph, maxJumpKm = LIMITS.maxJumpKm } = {}) {
    const distanceKm = haversineKm(previous, current);
    const elapsedSeconds = Math.max(0, (finite(current?.timestamp) - finite(previous?.timestamp)) / 1000);
    const speedKph = elapsedSeconds > 0 ? distanceKm / (elapsedSeconds / 3600) : Infinity;
    const impossible = distanceKm > maxJumpKm || speedKph > maxSpeedKph || !Number.isFinite(speedKph);
    return { valid: !impossible, suspicious: impossible, distanceKm: Number(distanceKm.toFixed(3)), speedKph: Number.isFinite(speedKph) ? Number(speedKph.toFixed(1)) : null, elapsedSeconds, reason: impossible ? 'GPS movement exceeds safe physical limits' : null };
}

function driverQuality(driver = {}) {
    const rating = clamp(finite(driver.rating, 5), 1, 5) / 5;
    const completion = clamp(finite(driver.completionRate, 0.9), 0, 1);
    const acceptance = clamp(finite(driver.acceptanceRate, 0.8), 0, 1);
    const safety = clamp(finite(driver.safetyScore, 0.9), 0, 1);
    return 0.35 * rating + 0.25 * completion + 0.2 * acceptance + 0.2 * safety;
}

export function scoreTripAllocation({ driver = {}, pickup = {}, hotspotWeight = 1, now = Date.now() } = {}) {
    const location = driver.location || driver;
    const distanceKm = haversineKm(location, pickup);
    const availability = driver.online === false ? 0 : 1;
    const freshnessSeconds = Math.max(0, (finite(now) - finite(location.timestamp || now)) / 1000);
    const freshness = clamp(1 - freshnessSeconds / 180, 0, 1);
    const distanceScore = clamp(1 - distanceKm / 20, 0, 1);
    const qualityScore = driverQuality(driver);
    const zoneScore = clamp(finite(hotspotWeight, 1) / 1.5, 0, 1);
    const score = availability * (0.38 * distanceScore + 0.27 * qualityScore + 0.2 * freshness + 0.15 * zoneScore);
    return { score: Number(score.toFixed(4)), eligible: Boolean(availability && freshness > 0 && distanceKm <= 30), distanceKm: Number(distanceKm.toFixed(3)), components: { availability, distanceScore: Number(distanceScore.toFixed(4)), qualityScore: Number(qualityScore.toFixed(4)), freshness: Number(freshness.toFixed(4)), zoneScore: Number(zoneScore.toFixed(4)) } };
}

export function quoteFare({ distanceKm, durationMinutes = 0, policy, surge = 1, zoneWeight = 1, compensation = 1 } = {}) {
    if (!policy) throw new Error('Missing fare policy');
    const distance = clamp(finite(distanceKm), 0, 500);
    const duration = clamp(finite(durationMinutes), 0, 1440);
    const safeSurge = clamp(finite(surge, 1), LIMITS.minSurge, LIMITS.maxSurge);
    const safeCompensation = clamp(finite(compensation, 1), 1, LIMITS.maxCompensation);
    const safeZone = clamp(finite(zoneWeight, 1), 0.8, 1.3);
    const extraKm = Math.max(0, distance - finite(policy.includedKm));
    const raw = finite(policy.baseFare) + extraKm * finite(policy.perKm) + duration * finite(policy.perMinute);
    const total = Math.max(finite(policy.minimumFare), Math.round(raw * safeSurge * safeCompensation * safeZone / 1000) * 1000);
    return { currency: policy.currency || 'VND', distanceKm: Number(distance.toFixed(2)), durationMinutes: Number(duration.toFixed(1)), subtotal: Math.round(raw), surgeMultiplier: safeSurge, compensationMultiplier: safeCompensation, zoneMultiplier: safeZone, total: Math.round(total) };
}

export function optimizePricing(trips = [], { currentSurge = 1 } = {}) {
    const valid = trips.filter(trip => finite(trip?.distanceKm) > 0 && finite(trip?.waitMinutes) >= 0);
    if (!valid.length) return { surgeMultiplier: clamp(finite(currentSurge, 1), LIMITS.minSurge, LIMITS.maxSurge), compensationMultiplier: 1, sampleSize: 0, reason: 'insufficient_data' };
    const avgWait = valid.reduce((sum, trip) => sum + finite(trip.waitMinutes), 0) / valid.length;
    const cancellationRate = valid.filter(trip => trip.status === 'cancelled' || trip.cancelled === true).length / valid.length;
    const completionRate = valid.filter(trip => trip.status === 'completed' || trip.completed === true).length / valid.length;
    const demandPressure = clamp((avgWait - 8) / 20, -0.4, 0.4);
    const reliabilityPenalty = clamp((0.75 - completionRate) * 0.25, -0.1, 0.2);
    const targetSurge = clamp(1 + demandPressure + reliabilityPenalty + cancellationRate * 0.1, LIMITS.minSurge, LIMITS.maxSurge);
    const nextSurge = clamp(0.8 * clamp(finite(currentSurge, 1), LIMITS.minSurge, LIMITS.maxSurge) + 0.2 * targetSurge, LIMITS.minSurge, LIMITS.maxSurge);
    return { surgeMultiplier: Number(nextSurge.toFixed(3)), compensationMultiplier: Number(clamp(1 + Math.max(0, demandPressure) * 0.5, 1, LIMITS.maxCompensation).toFixed(3)), sampleSize: valid.length, metrics: { avgWaitMinutes: Number(avgWait.toFixed(2)), cancellationRate: Number(cancellationRate.toFixed(3)), completionRate: Number(completionRate.toFixed(3)), demandPressure: Number(demandPressure.toFixed(3)) }, reason: 'bounded_feedback_update' };
}

export { LIMITS };
