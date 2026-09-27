import 'package:flutter_test/flutter_test.dart';

import 'package:sabquick_app/data/geo.dart';

void main() {
  group('haversineDistanceKm — parity with web lib/geo.ts', () {
    test('zero distance for identical points', () {
      expect(
          haversineDistanceKm(23.129243, 83.190082, 23.129243, 83.190082), 0);
    });

    test('~1 km north adds the right distance', () {
      // 1 deg latitude ≈ 111.19 km.
      final d = haversineDistanceKm(23.129243, 83.190082, 24.129243, 83.190082);
      expect(d, closeTo(111.19, 0.5));
    });

    test('Ambikapur hub to a nearby doorstep stays inside the geofence', () {
      // ~0.005 deg ≈ 550 m.
      final d = haversineDistanceKm(
          23.129243, 83.190082, 23.134243, 83.194082);
      expect(d, lessThan(GeoConfig.maxRadiusKm));
      expect(d, greaterThan(0.3));
    });
  });

  group('estimateDeliveryMinutes — parity with web geo.ts', () {
    test('in-geofence distances clamp to the 10–15 min SLA band', () {
      expect(estimateDeliveryMinutes(0.3), inInclusiveRange(10, 15));
      expect(estimateDeliveryMinutes(1.2), inInclusiveRange(10, 15));
      expect(estimateDeliveryMinutes(2.5), inInclusiveRange(10, 15));
    });

    test('out-of-geofence distances grow beyond the SLA', () {
      expect(estimateDeliveryMinutes(5.0), greaterThan(15));
    });
  });
}
