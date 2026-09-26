/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Navigation,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  Zap,
} from "lucide-react";
import { DoorstepSettlement } from "./DoorstepSettlement";
import { calculateHaversineDistance, STORE_CONFIG } from "@/lib/geo";

export interface ActiveOrderData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  tipAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string | Date;
  address: {
    flatBuilding: string;
    streetArea: string;
    landmark?: string | null;
    latitude: number;
    longitude: number;
  };
  customer: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      title: string;
      unitQuantity: string;
      imageUrl: string;
    };
  }>;
}

interface ActiveDeliveryCardProps {
  order: ActiveOrderData;
  onDeliveryCompleted: () => void;
}

export function ActiveDeliveryCard({
  order,
  onDeliveryCompleted,
}: ActiveDeliveryCardProps) {
  const [isChecklistOpen, setIsChecklistOpen] = React.useState<boolean>(false);
  const [checkedItems, setCheckedItems] = React.useState<Record<string, boolean>>({});

  const distanceKm = calculateHaversineDistance(
    STORE_CONFIG.lat,
    STORE_CONFIG.lng,
    order.address.latitude,
    order.address.longitude
  );

  // Google Maps Native Turn-by-Turn Navigation Deep Link
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}&travelmode=driving`;

  const toggleItemCheck = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP STATUS CARD */}
      <div className="bg-surface-dark border-2 border-primary-accent rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-accent"></span>
            </span>
            <span className="text-xs uppercase tracking-widest font-black text-primary-accent">
              Active Delivery in Transit
            </span>
          </div>

          <Badge variant="accent" className="font-mono font-bold text-xs bg-primary-accent text-surface-dark">
            #{order.orderNumber}
          </Badge>
        </div>

        {/* Customer & Destination Details */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">
              {order.customer.name || "SabQuick Customer"}
            </h3>
            <span className="text-xs font-mono text-primary-accent font-bold">
              {distanceKm} km away
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-primary-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">
                {order.address.flatBuilding}, {order.address.streetArea}
              </p>
              {order.address.landmark && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Landmark: {order.address.landmark}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Native Phone Dialing & Google Maps Deep Link (min 52px touch targets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Native Phone Call Button */}
          {order.customer.phone ? (
            <a
              href={`tel:${order.customer.phone}`}
              className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-sm"
            >
              <Phone className="w-4 h-4 text-primary-accent" />
            <span>Call Customer ({order.customer.phone})</span>
            </a>
          ) : (
            <Button
              disabled
              variant="outline"
              className="h-12 sm:h-14 rounded-2xl border-white/10 text-slate-500 text-xs"
            >
              Phone Not Available
            </Button>
          )}

          {/* Native Google Maps Turn-by-Turn GPS Navigation */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 sm:h-14 rounded-2xl bg-primary-accent hover:bg-primary-accent/90 text-surface-dark font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-primary-accent/20"
          >
            <Navigation className="w-4 h-4" />
            <span>Google Maps (Turn-by-Turn GPS)</span>
          </a>
        </div>

        {/* Packing Verification Checklist Accordion */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsChecklistOpen(!isChecklistOpen)}
            className="w-full py-2 flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Package className="w-4 h-4 text-primary-accent" />
              <span>
                Packing Verification Checklist ({order.items.length} items)
              </span>
            </div>
            {isChecklistOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isChecklistOpen && (
            <div className="mt-2 space-y-2 bg-white/5 border border-white/10 rounded-2xl p-3 animate-in fade-in-50">
              <p className="text-[11px] text-slate-400">
                Confirm all items are present in your thermal delivery box:
              </p>
              <div className="divide-y divide-white/10">
                {order.items.map((item) => {
                  const isChecked = Boolean(checkedItems[item.id]);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemCheck(item.id)}
                      className="py-2 flex items-center justify-between gap-2 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItemCheck(item.id)}
                          className="accent-primary-accent w-4 h-4 cursor-pointer rounded"
                        />
                        <span
                          className={`truncate font-medium ${
                            isChecked
                              ? "line-through text-slate-500"
                              : "text-slate-200"
                          }`}
                        >
                          {item.product.title} ({item.product.unitQuantity})
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-xs shrink-0">
                        x{item.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. DOORSTEP SETTLEMENT & 4-DIGIT OTP MODULE */}
      <DoorstepSettlement
        orderId={order.id}
        orderNumber={order.orderNumber}
        totalAmount={order.totalAmount}
        paymentMethod={order.paymentMethod}
        paymentStatus={order.paymentStatus}
        onDeliveryCompleted={onDeliveryCompleted}
      />
    </div>
  );
}
