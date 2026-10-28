"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Back control for policy screens. Come-back navigation should return the
 * reader to where they came from (usually the login form), while a direct
 * link from an app-store listing or email has no in-app history and falls
 * back to the storefront instead of leaving the app on a dead end.
 */
export function LegalBackButton() {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleBack}
      title="Go back"
      aria-label="Go back"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-xs font-bold text-slate-700 hover:text-primary transition-all active:scale-95"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </button>
  );
}
