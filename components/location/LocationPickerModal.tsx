"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  checkDeliveryServiceability,
  STORE_CONFIG,
  ServiceabilityResult,
} from "@/lib/geo";
import { reverseGeocode, GeocodedAddress } from "@/lib/nominatim";
import {
  MapPin,
  Zap,
  AlertTriangle,
  Home,
  Briefcase,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

// Dynamically import LeafletMap client-side only (disables SSR to prevent window is not defined)
const DynamicLeafletMap = dynamic(
  () => import("@/components/location/LeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center gap-2 border border-border-subtle">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Loading OpenStreetMap tiles...
        </span>
      </div>
    ),
  }
);

export interface SavedAddressData {
  id?: string;
  label: "Home" | "Work" | "Other";
  flatBuilding: string;
  streetArea: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedMinutes: number;
}

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressSaved?: (address: SavedAddressData) => void;
  currentAddress?: SavedAddressData | null;
}

export function LocationPickerModal({
  open,
  onOpenChange,
  onAddressSaved,
  currentAddress,
}: LocationPickerModalProps) {
  // Default coordinates: Connaught Place within geofence (28.6190, 77.2140)
  const [coords, setCoords] = React.useState<{ lat: number; lng: number }>({
    lat: currentAddress?.latitude || 28.619,
    lng: currentAddress?.longitude || 77.214,
  });

  const [label, setLabel] = React.useState<"Home" | "Work" | "Other">(
    currentAddress?.label || "Home"
  );
  const [flatBuilding, setFlatBuilding] = React.useState<string>(
    currentAddress?.flatBuilding || ""
  );
  const [streetArea, setStreetArea] = React.useState<string>(
    currentAddress?.streetArea || "Barakhamba Road, Connaught Place"
  );
  const [landmark, setLandmark] = React.useState<string>(
    currentAddress?.landmark || ""
  );

  const [serviceability, setServiceability] =
    React.useState<ServiceabilityResult>(() =>
      checkDeliveryServiceability(coords.lat, coords.lng)
    );

  const [isGeocoding, setIsGeocoding] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Debounce ref for reverse geocoding
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle position change from marker drag or map click
  const handlePositionChange = React.useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    const serv = checkDeliveryServiceability(lat, lng);
    setServiceability(serv);
    setErrorMsg(null);

    // Clear prior debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 600ms debounce on reverse geocode
    setIsGeocoding(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const geoResult = await reverseGeocode(lat, lng);
        if (geoResult.flatBuilding) {
          setFlatBuilding(geoResult.flatBuilding);
        }
        if (geoResult.streetArea) {
          setStreetArea(geoResult.streetArea);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      } finally {
        setIsGeocoding(false);
      }
    }, 600);
  }, []);

  const handleSaveAddress = async () => {
    setErrorMsg(null);

    if (!serviceability.isServiceable) {
      setErrorMsg(
        `Delivery is unavailable. This location is ${serviceability.distanceKm} km away (Max radius: 2.5 km).`
      );
      return;
    }

    if (flatBuilding.trim().length < 2) {
      setErrorMsg("Please enter flat, house, or building details.");
      return;
    }

    if (streetArea.trim().length < 3) {
      setErrorMsg("Please enter street or area details.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          flatBuilding: flatBuilding.trim(),
          streetArea: streetArea.trim(),
          landmark: landmark.trim() || undefined,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If not logged in or outside geofence
        if (res.status === 401) {
          // Gracefully fallback to client-only active delivery location
          const clientSavedAddress: SavedAddressData = {
            label,
            flatBuilding: flatBuilding.trim(),
            streetArea: streetArea.trim(),
            landmark: landmark.trim(),
            latitude: coords.lat,
            longitude: coords.lng,
            distanceKm: serviceability.distanceKm,
            estimatedMinutes: serviceability.estimatedMinutes,
          };
          onAddressSaved?.(clientSavedAddress);
          onOpenChange(false);
          return;
        }
        throw new Error(data.error || "Failed to save address");
      }

      const saved: SavedAddressData = {
        id: data.address.id,
        label: data.address.label,
        flatBuilding: data.address.flatBuilding,
        streetArea: data.address.streetArea,
        landmark: data.address.landmark,
        latitude: data.address.latitude,
        longitude: data.address.longitude,
        distanceKm: serviceability.distanceKm,
        estimatedMinutes: serviceability.estimatedMinutes,
      };

      onAddressSaved?.(saved);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 gap-4">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                <MapPin className="w-4 h-4" />
              </div>
              <DialogTitle className="text-xl">Set Delivery Location</DialogTitle>
            </div>

            {/* Top Status Chip */}
            {serviceability.isServiceable ? (
              <Badge variant="accent" className="text-xs gap-1 py-1 font-bold">
                <Zap className="w-3.5 h-3.5 fill-surface-dark" />
                Delivering in {serviceability.estimatedMinutes} mins ({serviceability.distanceKm} km away)
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs gap-1 py-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Out of range ({serviceability.distanceKm} km away - Max 2.5 km)
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs">
            Drag the pin or click on the map to pinpoint your exact doorstep within SabQuick&apos;s 2.5 km dark store zone.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Leaflet Map */}
        <div className="space-y-1">
          <DynamicLeafletMap
            latitude={coords.lat}
            longitude={coords.lng}
            onPositionChange={handlePositionChange}
            isServiceable={serviceability.isServiceable}
            distanceKm={serviceability.distanceKm}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              Store Hub: {STORE_CONFIG.lat.toFixed(4)}, {STORE_CONFIG.lng.toFixed(4)}
            </span>
            <span>
              {isGeocoding ? (
                <span className="text-primary font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Fetching street name...
                </span>
              ) : (
                `Pin: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              )}
            </span>
          </div>
        </div>

        {/* Structured Address Form */}
        <div className="space-y-3 pt-2">
          {/* Label selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Save as:
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={label === "Home" ? "default" : "outline"}
                onClick={() => setLabel("Home")}
                className="h-8 rounded-lg text-xs gap-1"
              >
                <Home className="w-3 h-3" /> Home
              </Button>
              <Button
                type="button"
                size="sm"
                variant={label === "Work" ? "default" : "outline"}
                onClick={() => setLabel("Work")}
                className="h-8 rounded-lg text-xs gap-1"
              >
                <Briefcase className="w-3 h-3" /> Work
              </Button>
              <Button
                type="button"
                size="sm"
                variant={label === "Other" ? "default" : "outline"}
                onClick={() => setLabel("Other")}
                className="h-8 rounded-lg text-xs gap-1"
              >
                <MoreHorizontal className="w-3 h-3" /> Other
              </Button>
            </div>
          </div>

          {/* Form inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Flat / House / Floor No. *
              </label>
              <Input
                placeholder="e.g. Flat 402, Royal Residency"
                value={flatBuilding}
                onChange={(e) => setFlatBuilding(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Nearby Landmark (Optional)
              </label>
              <Input
                placeholder="e.g. Near Metro Gate 2"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Street / Area / Locality *
            </label>
            <Input
              placeholder="e.g. Barakhamba Road, Connaught Place"
              value={streetArea}
              onChange={(e) => setStreetArea(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="default"
            disabled={!serviceability.isServiceable || isSaving}
            onClick={handleSaveAddress}
            className="w-full h-11 rounded-xl text-sm font-bold gap-2 shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Address...
              </>
            ) : serviceability.isServiceable ? (
              <>
                <ShieldCheck className="w-4 h-4" /> Save & Deliver Here (
                {serviceability.estimatedMinutes} Mins SLA)
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" /> Cannot Deliver Outside 2.5 km
                Zone
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
