"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkDeliveryServiceability } from "@/lib/geo";
import { SavedAddressData } from "@/components/location/LocationPickerModal";
import {
  Home,
  Briefcase,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface SavedAddressesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeAddress: SavedAddressData | null;
  onSelectAddress: (address: SavedAddressData) => void;
  onAddNewAddress: () => void;
}

export function SavedAddressesModal({
  open,
  onOpenChange,
  activeAddress,
  onSelectAddress,
  onAddNewAddress,
}: SavedAddressesModalProps) {
  const [addresses, setAddresses] = React.useState<SavedAddressData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchAddresses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        if (data.addresses && Array.isArray(data.addresses)) {
          const mapped: SavedAddressData[] = data.addresses.map((a: any) => {
            const serv = checkDeliveryServiceability(a.latitude, a.longitude);
            return {
              id: a.id,
              label: a.label || "Home",
              flatBuilding: a.flatBuilding,
              streetArea: a.streetArea,
              landmark: a.landmark,
              latitude: a.latitude,
              longitude: a.longitude,
              distanceKm: serv.distanceKm,
              estimatedMinutes: serv.estimatedMinutes,
            };
          });
          setAddresses(mapped);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote addresses:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchAddresses();
    }
  }, [open, fetchAddresses]);

  const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this address?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getAddressIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case "home":
        return <Home className="w-4 h-4 text-primary" />;
      case "work":
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      default:
        return <MapPin className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-slate-100 shadow-2xl bg-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <DialogTitle className="text-base font-extrabold text-surface-dark flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Delivery Addresses
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an address for 10-minute delivery in Ambikapur
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onAddNewAddress();
            }}
            className="rounded-xl h-8 text-xs font-bold gap-1 bg-primary text-white hover:bg-primary-hover shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New
          </Button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Loading saved addresses...</span>
            </div>
          ) : addresses.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-surface-dark">No Saved Addresses</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Add your home or office address to start receiving superfast 10-minute deliveries.
                </p>
              </div>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onAddNewAddress();
                }}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-white hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4" /> Add Delivery Address
              </Button>
            </div>
          ) : (
            addresses.map((addr) => {
              const isSelected = activeAddress?.id === addr.id;
              const serv = checkDeliveryServiceability(addr.latitude, addr.longitude);

              return (
                <div
                  key={addr.id || `${addr.latitude}-${addr.longitude}`}
                  onClick={() => {
                    onSelectAddress(addr);
                    onOpenChange(false);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getAddressIcon(addr.label)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-surface-dark">
                            {addr.label}
                          </span>
                          {serv.isServiceable ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ⚡ {serv.estimatedMinutes} mins
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Outside zone
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-dark font-medium mt-1 truncate">
                          {addr.flatBuilding}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {addr.streetArea}
                        </p>
                        {addr.landmark && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            Near: {addr.landmark}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                      {addr.id && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAddress(addr.id!, e)}
                          disabled={deletingId === addr.id}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Delete address"
                        >
                          {deletingId === addr.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Ambikapur delivery hub (3.5 km radius)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
