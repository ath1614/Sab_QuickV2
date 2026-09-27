import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../data/geo.dart';
import '../design/tokens.dart';

/// Native port of the website's `OrderRouteMap` (Leaflet on OSM tiles):
/// dark-store hub pin, customer destination pin, dashed green route,
/// an interpolated EV-rider marker while out for delivery, a live ETA chip
/// and the 2.5 km geofence pill. Pure Dart (flutter_map) — no Google API
/// key, no native SDK, works on Android and iOS.
class RouteMapCard extends StatelessWidget {
  final double customerLat;
  final double customerLng;
  final String customerAddressLabel;
  final String orderStatus;
  final Color primary;
  final Color accent;
  final double height;

  const RouteMapCard({
    super.key,
    required this.customerLat,
    required this.customerLng,
    required this.orderStatus,
    required this.primary,
    required this.accent,
    this.customerAddressLabel = 'Delivery Location',
    this.height = 240,
  });

  @override
  Widget build(BuildContext context) {
    final store = const LatLng(GeoConfig.storeLat, GeoConfig.storeLng);
    final customer = LatLng(customerLat, customerLng);
    final distanceKm = haversineDistanceKm(
        GeoConfig.storeLat, GeoConfig.storeLng, customerLat, customerLng);
    final etaMinutes = estimateDeliveryMinutes(distanceKm);

    // Interpolated rider marker, same geometry as the web map (60% of the
    // way along the route) — replaced by real GPS in the FCM/GPS round.
    final showRider = orderStatus == 'OUT_FOR_DELIVERY';
    final rider = LatLng(
      GeoConfig.storeLat + (customerLat - GeoConfig.storeLat) * 0.6,
      GeoConfig.storeLng + (customerLng - GeoConfig.storeLng) * 0.6,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(SQRadius.md),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            FlutterMap(
              options: MapOptions(
                initialCameraFit: CameraFit.bounds(
                  bounds: LatLngBounds.fromPoints([store, customer]),
                  padding: const EdgeInsets.fromLTRB(56, 56, 56, 56),
                  maxZoom: 16,
                ),
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate:
                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.sabquick.sabquick_app',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: [store, customer],
                      strokeWidth: 3.5,
                      color: accent,
                      pattern: StrokePattern.dashed(
                          segments: const <double>[7, 9]),
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    _pin(
                      store,
                      color: SQColor.greenDeep,
                      icon: Icons.storefront_rounded,
                      semantic: 'SabQuick dark store hub',
                    ),
                    _pin(
                      customer,
                      color: primary,
                      icon: Icons.home_rounded,
                      semantic: customerAddressLabel,
                    ),
                    if (showRider)
                      _pin(
                        rider,
                        color: accent,
                        icon: Icons.two_wheeler_rounded,
                        semantic: 'EV rider en route',
                      ),
                  ],
                ),
                const RichAttributionWidget(
                  attributions: [
                    TextSourceAttribution('© OpenStreetMap contributors'),
                  ],
                  showFlutterMapAttribution: false,
                ),
              ],
            ),

            // ── ETA chip (top-left) ──
            Positioned(
              top: 10,
              left: 10,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(SQRadius.pill),
                  border: Border.all(color: SQColor.line),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.bolt_rounded, size: 14, color: primary),
                    const SizedBox(width: 3),
                    Text(
                      '$etaMinutes min ETA',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: primary,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text('|',
                        style:
                            TextStyle(fontSize: 10, color: SQColor.inkFaint)),
                    const SizedBox(width: 6),
                    Text('$distanceKm km',
                        style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: SQColor.inkSoft)),
                  ],
                ),
              ),
            ),

            // ── Geofence pill (bottom-right) ──
            Positioned(
              bottom: 8,
              right: 8,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: SQColor.ink.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(SQRadius.xs),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 6,
                      height: 6,
                      child: DecoratedBox(
                        decoration:
                            BoxDecoration(color: SQColor.lime, shape: BoxShape.circle),
                      ),
                    ),
                    SizedBox(width: 5),
                    Text(
                      'GEOFENCE ACTIVE · 2.5 KM',
                      style: TextStyle(
                        fontSize: 8.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Marker _pin(
    LatLng point, {
    required Color color,
    required IconData icon,
    required String semantic,
  }) {
    return Marker(
      point: point,
      width: 40,
      height: 40,
      alignment: Alignment.topCenter,
      child: Semantics(
        label: semantic,
        child: Container(
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: 19),
        ),
      ),
    );
  }
}
