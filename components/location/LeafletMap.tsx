"use client";

import * as React from "react";
import L from "leaflet";
import { STORE_CONFIG } from "@/lib/geo";
import { Locate, Navigation, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createHubPin, createCustomerPin } from "@/components/brand/MapPins";
import { Capacitor } from "@capacitor/core";

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
        <strong style="color: #0B6E4F;">SabQuick Dark Store Hub #01</strong><br/>
        Ambikapur Dark Store Hub, Chhattisgarh<br/>
        <span style="color: #64748b; font-size: 11px;">Geofence SLA: 3.5 km (Superfast)</span>
      </div>
    `);

    // 3.5 km Geofence Boundary Circle
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

    // Leaflet caches the container size at creation time. The sheet animates
    // open and the map box is height-clamped per device, and rotating an iPad
    // resizes it again — without this the tiles stay laid out for the old size
    // (grey bands, pin off-centre).
    const invalidate = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize({ animate: false });
    };
    const raf = requestAnimationFrame(invalidate);
    const settle = setTimeout(invalidate, 320);
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(invalidate) : null;
    if (observer && mapContainerRef.current) observer.observe(mapContainerRef.current);
    window.addEventListener("orientationchange", invalidate);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      observer?.disconnect();
      window.removeEventListener("orientationchange", invalidate);
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

  // GPS Locate Me Handler (Capacitor Native Geolocation + Web Fallback)
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          if (req.location !== "granted") {
            alert("Location permission is required to detect your location.");
            setIsLocating(false);
            return;
          }
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        if (mapInstanceRef.current && customerMarkerRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, {
            duration: 1.2,
          });
          customerMarkerRef.current.setLatLng([userLat, userLng]);
          onPositionChange(userLat, userLng);
        }
        setIsLocating(false);
        return;
      }

      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        setIsLocating(false);
        return;
      }

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
          const fallbackLat = parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "23.1188");
          const fallbackLng = parseFloat(process.env.NEXT_PUBLIC_STORE_LNG || "83.1996");
          if (mapInstanceRef.current && customerMarkerRef.current) {
            mapInstanceRef.current.flyTo([fallbackLat, fallbackLng], 15);
            customerMarkerRef.current.setLatLng([fallbackLat, fallbackLng]);
            onPositionChange(fallbackLat, fallbackLng);
          }
          setIsLocating(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch (e: any) {
      console.warn("Locate Me error:", e);
      setIsLocating(false);
    }
  };

  return (
    <div className="relative w-full h-[clamp(200px,32dvh,320px)] sm:h-[320px] rounded-2xl overflow-hidden border border-border-subtle shadow-inner">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GPS Button */}
      <div className="absolute bottom-4 left-3 z-[400]">
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
      <div className="absolute top-3 left-3 right-3 z-[400] pointer-events-none">
        <div className="inline-flex max-w-full items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border-subtle shadow-sm text-xs font-semibold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isServiceable ? "bg-primary-accent animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-surface-dark leading-tight">
            {isServiceable
              ? `${distanceKm} km from Dark Store (Inside 3.5 km)`
              : `${distanceKm} km from Dark Store (Outside 3.5 km)`}
          </span>
        </div>
      </div>
    </div>
  );
}
