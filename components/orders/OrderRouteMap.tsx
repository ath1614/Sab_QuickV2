"use client";

import * as React from "react";
import L from "leaflet";
import { STORE_CONFIG, calculateHaversineDistance, calculateEstimatedDeliveryMinutes } from "@/lib/geo";
import { Zap, MapPin } from "lucide-react";
import { createHubPin, createCustomerPin, createRiderPin } from "@/components/brand/MapPins";

interface OrderRouteMapProps {
  customerLat: number;
  customerLng: number;
  customerAddressLabel?: string;
  orderStatus?: string;
}

export default function OrderRouteMap({
  customerLat,
  customerLng,
  customerAddressLabel = "Delivery Location",
  orderStatus = "PENDING",
}: OrderRouteMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  const distanceKm = calculateHaversineDistance(
    STORE_CONFIG.lat,
    STORE_CONFIG.lng,
    customerLat,
    customerLng
  );
  const estimatedMinutes = calculateEstimatedDeliveryMinutes(distanceKm);

  React.useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // Add Zoom Control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap raster tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Store Hub Marker (Forest Green SQ Icon)
    const storeIcon = createHubPin();

    const storeMarker = L.marker([STORE_CONFIG.lat, STORE_CONFIG.lng], {
      icon: storeIcon,
      zIndexOffset: 500,
    }).addTo(map);

    storeMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #0B6E4F;">SabQuick Dark Store Hub</strong><br/>
        Ambikapur Dispatch Center, Chhattisgarh<br/>
        <span style="color: #64748b;">Packing & Dispatch Hub</span>
      </div>
    `);

    // Customer Location Marker (Kinetic Green drop pin)
    const customerIcon = createCustomerPin(true);

    const customerMarker = L.marker([customerLat, customerLng], {
      icon: customerIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    customerMarker.bindPopup(`
      <div style="font-size: 12px; line-height: 1.4;">
        <strong style="color: #111827;">${customerAddressLabel}</strong><br/>
        <span style="color: #00C853; font-weight: bold;">Destination</span>
      </div>
    `);

    // Optional Live Rider Radar Marker if Out for Delivery
    if (orderStatus === "OUT_FOR_DELIVERY") {
      const riderLat = STORE_CONFIG.lat + (customerLat - STORE_CONFIG.lat) * 0.6;
      const riderLng = STORE_CONFIG.lng + (customerLng - STORE_CONFIG.lng) * 0.6;
      const riderMarker = L.marker([riderLat, riderLng], {
        icon: createRiderPin(),
        zIndexOffset: 1500,
      }).addTo(map);

      riderMarker.bindPopup(`
        <div style="font-size: 12px; line-height: 1.4;">
          <strong style="color: #00C853;">EV Rider En Route</strong><br/>
          <span style="color: #64748b;">Express courier in transit to doorstep</span>
        </div>
      `);
    }

    // Dotted Polyline indicating delivery transit path
    const routeCoords: [number, number][] = [
      [STORE_CONFIG.lat, STORE_CONFIG.lng],
      [customerLat, customerLng],
    ];

    const polyline = L.polyline(routeCoords, {
      color: "#00C853",
      weight: 3.5,
      dashArray: "7, 9",
      opacity: 0.9,
    }).addTo(map);

    // Fit bounds so both markers are visible with padding
    const bounds = L.latLngBounds([
      [STORE_CONFIG.lat, STORE_CONFIG.lng],
      [customerLat, customerLng],
    ]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [customerLat, customerLng, customerAddressLabel, orderStatus]);

  return (
    <div className="relative w-full h-[280px] sm:h-[320px] rounded-3xl overflow-hidden border border-border-subtle shadow-sm">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Distance & SLA Overlay Chip */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-none">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-border-subtle shadow-md text-xs font-bold text-surface-dark">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-accent"></span>
          </span>
          <span className="text-primary font-black flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-primary" /> {estimatedMinutes} Mins ETA
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-muted-foreground font-mono">{distanceKm} km transit</span>
        </div>
      </div>

      {/* Geofence SLA Pill */}
      <div className="absolute bottom-3 right-3 z-[400] pointer-events-none">
        <div className="bg-surface-dark/90 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[10px] font-mono tracking-wider shadow-sm flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-accent" />
          <span>GEOFENCE ACTIVE &bull; 2.5 KM</span>
        </div>
      </div>
    </div>
  );
}
