"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ShoppingBag,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { calculateHaversineDistance, STORE_CONFIG } from "@/lib/geo";

export interface AvailableOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  tipAmount: number;
  paymentMethod: string;
  createdAt: string | Date;
  address: {
    flatBuilding: string;
    streetArea: string;
    landmark?: string | null;
    latitude: number;
    longitude: number;
  };
  customer?: {
    name: string | null;
  } | null;
  items: Array<{
    id: string;
    product: {
      title: string;
      unitQuantity: string;
    };
  }>;
}

interface IncomingDispatchAlertProps {
  orders: AvailableOrder[];
  onAcceptOrder: (orderId: string) => Promise<void>;
  acceptingOrderId: string | null;
  isOnline: boolean;
}

export function IncomingDispatchAlert({
  orders,
  onAcceptOrder,
  acceptingOrderId,
  isOnline,
}: IncomingDispatchAlertProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-surface-dark border border-slate-800 rounded-3xl p-6 text-center text-slate-400 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-300">
          Waiting for dispatch orders...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {isOnline
            ? "You are online and ready! As soon as packers bag an order at Dark Store #01, it will appear here."
            : "You are currently offline. Turn on your shift toggle above to receive incoming orders."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest font-black text-primary-accent flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-accent animate-ping" />
          Incoming Dispatch Alerts ({orders.length})
        </h2>
        <span className="text-[11px] font-mono text-slate-400">
          Pickup: Dark Store Hub #01
        </span>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const distanceKm = calculateHaversineDistance(
            STORE_CONFIG.lat,
            STORE_CONFIG.lng,
            order.address.latitude,
            order.address.longitude
          );
          const totalItemsCount = order.items.length;
          const isAccepting = acceptingOrderId === order.id;

          return (
            <div
              key={order.id}
              className="bg-surface-dark border-2 border-primary-accent/40 hover:border-primary-accent rounded-3xl p-5 text-white shadow-xl transition-all space-y-4"
            >
              {/* Header: Order ID & Distance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-accent/20 text-primary-accent flex items-center justify-center font-black text-sm">
                    SQ
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      #{order.orderNumber}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {order.paymentMethod === "UPI_DOORSTEP"
                        ? "Doorstep UPI (₹" + order.totalAmount + ")"
                        : "Prepaid Online (₹" + order.totalAmount + ")"}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="accent"
                  className="bg-primary-accent text-surface-dark font-mono font-bold text-xs"
                >
                  <Zap className="w-3 h-3 fill-surface-dark mr-1" />
                  {distanceKm} km
                </Badge>
              </div>

              {/* Delivery Destination Address */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary-accent shrink-0 mt-0.5" />
                <div className="text-xs min-w-0">
                  <p className="font-bold text-slate-200 truncate">
                    {order.address.flatBuilding}, {order.address.streetArea}
                  </p>
                  {order.address.landmark && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Landmark: {order.address.landmark}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {totalItemsCount} item{totalItemsCount > 1 ? "s" : ""} to deliver
                    {order.tipAmount > 0 && (
                      <span className="text-emerald-400 font-bold ml-1.5">
                        &bull; +₹{order.tipAmount} Customer Tip
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Large Touch Target Action Button (52px height) */}
              <Button
                type="button"
                disabled={isAccepting || !isOnline}
                onClick={() => onAcceptOrder(order.id)}
                className="w-full h-12 sm:h-14 rounded-2xl bg-primary-accent hover:bg-primary-accent/90 text-surface-dark font-black text-sm shadow-lg shadow-primary-accent/20 flex items-center justify-center gap-2"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Assigning to your scooter...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-surface-dark" />
                    <span>ACCEPT DELIVERY ORDER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
