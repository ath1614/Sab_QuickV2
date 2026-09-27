// Store geofence constants + geo math — Dart mirror of the website's
// `lib/geo.ts` (keep the defaults in sync with that file).
import 'dart:math' as math;

class GeoConfig {
  /// Dark store hub (Ambikapur dispatch center) — mirrors
  /// `lib/geo.ts` STORE_CONFIG defaults.
  static const double storeLat = 23.129243;
  static const double storeLng = 83.190082;

  /// Guaranteed delivery geofence radius (km).
  static const double maxRadiusKm = 2.5;
}

/// Great-circle distance between two coordinates, in kilometers (2 decimals) —
/// same Haversine formula and rounding as the web's
/// `calculateHaversineDistance`.
double haversineDistanceKm(
  double lat1,
  double lng1,
  double lat2,
  double lng2,
) {
  const r = 6371.0;
  final dLat = _deg2rad(lat2 - lat1);
  final dLng = _deg2rad(lng2 - lng1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_deg2rad(lat1)) *
          math.cos(_deg2rad(lat2)) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  final km = r * c;
  return (km * 100).round() / 100;
}

/// Quick-commerce ETA estimate from transit distance — mirrors the web's
/// `calculateEstimatedDeliveryMinutes`: inside the geofence the 10–15 min
/// SLA holds; outside, a straight-line heuristic is applied.
int estimateDeliveryMinutes(double distanceKm) {
  if (distanceKm <= GeoConfig.maxRadiusKm) {
    // 2 min packing + ~4 min per km of transit, clamped to the SLA band.
    final minutes = (2 + distanceKm * 4).round();
    return minutes.clamp(10, 15);
  }
  return (2 + distanceKm * 4).round();
}

double _deg2rad(double deg) => deg * (math.pi / 180.0);
