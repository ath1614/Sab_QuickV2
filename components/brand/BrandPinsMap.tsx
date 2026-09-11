"use client";

import * as React from "react";
import L from "leaflet";
import { STORE_CONFIG } from "@/lib/geo";
import { createHubPin, createCustomerPin, createRiderPin } from "@/components/brand/MapPins";

export default function BrandPinsMap() {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: [STORE_CONFIG.lat, STORE_CONFIG.lng],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap Raster Tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // 1. Store Hub Pin
    const hubMarker = L.marker([STORE_CONFIG.lat, STORE_CONFIG.lng], {
      icon: createHubPin(),
      zIndexOffset: 1000,
    }).addTo(map);

    hubMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #0B6E4F;">⚡ SabQuick Dark Store Hub #01</strong><br/>
        Central Delhi Dispatch Station<br/>
        <span style="color: #00C853; font-weight: bold;">Geofence SLA: 2.5 km</span>
      </div>
    `);

    // 2. Geofence Boundary Circle (2.5 km)
    L.circle([STORE_CONFIG.lat, STORE_CONFIG.lng], {
      radius: STORE_CONFIG.maxRadiusKm * 1000,
      color: "#0B6E4F",
      fillColor: "#00C853",
      fillOpacity: 0.1,
      weight: 2,
      dashArray: "6, 6",
    }).addTo(map);

    // 3. Customer Inside Geofence (Serviceable: Green Target Pin)
    const customerInLat = STORE_CONFIG.lat + 0.008;
    const customerInLng = STORE_CONFIG.lng + 0.008;
    const customerInMarker = L.marker([customerInLat, customerInLng], {
      icon: createCustomerPin(true),
      zIndexOffset: 900,
    }).addTo(map);

    customerInMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #111827;">📍 Customer Pin (In Range)</strong><br/>
        <span style="color: #00C853; font-weight: bold;">0.9 km &bull; 11 Mins ETA</span>
      </div>
    `);

    // 4. Customer Outside Geofence (Unserviceable: Red Target Pin)
    const customerOutLat = STORE_CONFIG.lat - 0.024;
    const customerOutLng = STORE_CONFIG.lng - 0.022;
    const customerOutMarker = L.marker([customerOutLat, customerOutLng], {
      icon: createCustomerPin(false),
      zIndexOffset: 900,
    }).addTo(map);

    customerOutMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #EF4444;">📍 Customer Pin (Out of Range)</strong><br/>
        <span style="color: #EF4444; font-weight: bold;">3.4 km &bull; Outside 2.5 km Geofence</span>
      </div>
    `);

    // 5. Electric Rider Pin with Pulsing Radar
    const riderLat = STORE_CONFIG.lat + 0.004;
    const riderLng = STORE_CONFIG.lng + 0.004;
    const riderMarker = L.marker([riderLat, riderLng], {
      icon: createRiderPin(),
      zIndexOffset: 1200,
    }).addTo(map);

    riderMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #00C853;">🛵 Electric Rider Fleet #04</strong><br/>
        Live GPS Telemetry &bull; Speed 28 km/h<br/>
        <span style="color: #64748b;">En route with delivery order</span>
      </div>
    `);

    // Dotted polyline from hub to customer in-range
    L.polyline(
      [
        [STORE_CONFIG.lat, STORE_CONFIG.lng],
        [riderLat, riderLng],
        [customerInLat, customerInLng],
      ],
      {
        color: "#00C853",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.8,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-border-subtle shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-3 left-3 z-[400] pointer-events-none bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border-subtle shadow-sm text-xs font-bold text-surface-dark flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary-accent animate-ping" />
        <span>Live Telemetry &bull; 2.5 km Active Geofence</span>
      </div>
    </div>
  );
}
