"use client";

import * as React from "react";
import L from "leaflet";
import { STORE_CONFIG } from "@/lib/geo";
import { Locate, Navigation, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createHubPin, createCustomerPin } from "@/components/brand/MapPins";

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  isServiceable: boolean;
  distanceKm: number;
}

export default function LeafletMap({
  latitude,
  longitude,
  onPositionChange,
  isServiceable,
  distanceKm,
}: LeafletMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const customerMarkerRef = React.useRef<L.Marker | null>(null);
  const geofenceCircleRef = React.useRef<L.Circle | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);

  // Initialize Map
  React.useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map Instance
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
    });

    // Add Zoom Control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap Raster Tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Store Hub Marker (Forest Green SQ Icon)
    const storeIcon = createHubPin();

    const storeMarker = L.marker([STORE_CONFIG.lat, STORE_CONFIG.lng], {
      icon: storeIcon,
      zIndexOffset: 500,
    }).addTo(map);

    storeMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 2px;">
        <strong style="color: #0B6E4F;">⚡ SabQuick Dark Store Hub #01</strong><br/>
        Central Delhi (Connaught Place Hub)<br/>
        <span style="color: #64748b; font-size: 11px;">Geofence SLA: 2.5 km (10-15 Mins)</span>
      </div>
    `);

    // 2.5 km Geofence Boundary Circle
    const geofenceCircle = L.circle([STORE_CONFIG.lat, STORE_CONFIG.lng], {
      radius: STORE_CONFIG.maxRadiusKm * 1000,
      color: "#0B6E4F",
      fillColor: "#00C853",
      fillOpacity: 0.12,
      weight: 2,
      dashArray: "6, 6",
    }).addTo(map);
    geofenceCircleRef.current = geofenceCircle;

    // Draggable Customer Drop Marker
    const customerPinIcon = createCustomerPin(isServiceable);

    const customerMarker = L.marker([latitude, longitude], {
      draggable: true,
      icon: customerPinIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    // Event: Marker Drag End
    customerMarker.on("dragend", () => {
      const position = customerMarker.getLatLng();
      onPositionChange(position.lat, position.lng);
    });

    // Event: Click anywhere on map to move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      customerMarker.setLatLng(e.latlng);
      onPositionChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    customerMarkerRef.current = customerMarker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position & icon when props change
  React.useEffect(() => {
    if (!customerMarkerRef.current) return;

    const currentPos = customerMarkerRef.current.getLatLng();
    if (currentPos.lat !== latitude || currentPos.lng !== longitude) {
      customerMarkerRef.current.setLatLng([latitude, longitude]);
    }

    // Refresh pin color based on current serviceability
    customerMarkerRef.current.setIcon(createCustomerPin(isServiceable));
  }, [latitude, longitude, isServiceable]);

  // GPS Locate Me Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: userLat, longitude: userLng } = pos.coords;
        if (mapInstanceRef.current && customerMarkerRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, {
            duration: 1.2,
          });
          customerMarkerRef.current.setLatLng([userLat, userLng]);
          onPositionChange(userLat, userLng);
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation permission error or unavailable:", err.message);
        // Default to a realistic geofence location
        const fallbackLat = 28.619;
        const fallbackLng = 77.214;
        if (mapInstanceRef.current && customerMarkerRef.current) {
          mapInstanceRef.current.flyTo([fallbackLat, fallbackLng], 15);
          customerMarkerRef.current.setLatLng([fallbackLat, fallbackLng]);
          onPositionChange(fallbackLat, fallbackLng);
        }
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-border-subtle shadow-inner">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GPS Button */}
      <div className="absolute bottom-4 left-4 z-[400]">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="bg-white/95 backdrop-blur-md shadow-md border-border-subtle rounded-xl text-xs gap-1.5 font-semibold hover:bg-slate-50 text-surface-dark"
        >
          <Locate className={`w-3.5 h-3.5 text-primary ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "Detecting GPS..." : "Locate Me"}</span>
        </Button>
      </div>

      {/* Floating Geofence Status Overlay Badge */}
      <div className="absolute top-3 left-3 z-[400] pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border-subtle shadow-sm text-xs font-semibold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isServiceable ? "bg-primary-accent animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-surface-dark">
            {isServiceable
              ? `${distanceKm} km from Dark Store (Inside 2.5 km)`
              : `${distanceKm} km from Dark Store (Outside 2.5 km)`}
          </span>
        </div>
      </div>
    </div>
  );
}
