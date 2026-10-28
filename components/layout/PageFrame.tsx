"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isDocumentRoute } from "@/lib/documentRoutes";

/**
 * Reserves space for the fixed bottom tab bar on shopping pages. Legal
 * documents render without that bar, so they must not end in a band of
 * empty space where the bar used to be.
 */
export function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const documentMode = isDocumentRoute(pathname);

  return (
    <div
      className={cn(
        "min-h-screen",
        !documentMode &&
          "pb-28 sm:pb-32 md:pb-0 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]"
      )}
    >
      {children}
    </div>
  );
}
