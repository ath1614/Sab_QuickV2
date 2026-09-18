"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Orders Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="flex justify-center">
          <Logo variant="compact" size={36} />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Unable to Load Orders
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            We encountered a temporary client-side issue while rendering your order history.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            className="w-full h-11 rounded-xl text-xs font-bold gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
          <Link href="/" className="w-full">
            <Button
              type="button"
              variant="default"
              className="w-full h-11 rounded-xl text-xs font-black bg-primary hover:bg-primary/90 text-white gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
