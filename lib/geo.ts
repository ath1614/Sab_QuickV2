export interface StoreConfig {
  lat: number;
  lng: number;
  maxRadiusKm: number;
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  distanceKm: number;
  estimatedMinutes: number;
  storeLat: number;
  storeLng: number;
  maxRadiusKm: number;
}

export const STORE_CONFIG: StoreConfig = {
  lat: parseFloat(
    process.env.NEXT_PUBLIC_STORE_LAT ||
      process.env.STORE_LATITUDE ||
      "28.6139"
  ),
  lng: parseFloat(
    process.env.NEXT_PUBLIC_STORE_LNG ||
      process.env.STORE_LONGITUDE ||
      "77.2090"
  ),
  maxRadiusKm: parseFloat(
    process.env.NEXT_PUBLIC_STORE_MAX_RADIUS_KM ||
      process.env.STORE_MAX_RADIUS_KM ||
      "2.5"
  ),
};

/**
 * Calculates the great-circle distance between two points on the Earth surface
 * using the Haversine formula.
 * @returns Distance in kilometers rounded to 2 decimal places.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculates estimated quick-commerce delivery time in minutes.
 * Formula: estimatedMinutes = 3 (packing) + ceil(distanceKm * 4) (transit)
 * Capped at 15 minutes for addresses <= 2.5 km.
 */
export function calculateEstimatedDeliveryMinutes(distanceKm: number): number {
  const packingTimeMinutes = 3;
  const transitTimeMinutes = Math.ceil(distanceKm * 4);
  const totalMinutes = packingTimeMinutes + transitTimeMinutes;

  if (distanceKm <= STORE_CONFIG.maxRadiusKm) {
    // Within geofence, SLA is guaranteed between 10 and 15 mins
    return Math.min(15, Math.max(10, totalMinutes));
  }

  return totalMinutes;
}

/**
 * Verifies if customer coordinates fall within the SabQuick 2.5 km dark store geofence.
 */
export function checkDeliveryServiceability(
  customerLat: number,
  customerLng: number
): ServiceabilityResult {
  const distanceKm = calculateHaversineDistance(
    STORE_CONFIG.lat,
    STORE_CONFIG.lng,
    customerLat,
    customerLng
  );

  const isServiceable = distanceKm <= STORE_CONFIG.maxRadiusKm;
  const estimatedMinutes = calculateEstimatedDeliveryMinutes(distanceKm);

  return {
    isServiceable,
    distanceKm,
    estimatedMinutes,
    storeLat: STORE_CONFIG.lat,
    storeLng: STORE_CONFIG.lng,
    maxRadiusKm: STORE_CONFIG.maxRadiusKm,
  };
}
