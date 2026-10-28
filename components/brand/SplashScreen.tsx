/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { BRAND_ASSETS } from "@/lib/assets";

export type BootPhase = "booting" | "revealing";
export type BootDestination = "storefront" | "login" | "prelaunch";

interface SplashScreenProps {
  phase: BootPhase;
  destination?: BootDestination;
}

/**
 * The single brand frame shown while the app decides between the storefront,
 * the login view, and the pre-launch page.
 *
 * Deliberately quiet: paper, the existing wordmark, and one emerald rule. No
 * glow, shimmer, pulsing dot, progress bar, or looping animation — the logo is
 * already on screen in the native launch frame, so it must not "enter".
 */
export function SplashScreen({ phase, destination }: SplashScreenProps) {
  return (
    <div
      className="sq-boot"
      data-phase={phase}
      data-destination={destination}
      role="status"
      aria-live="polite"
      aria-label="Opening SabQuick"
    >
      <div className="sq-boot__stage">
        <img
          src={BRAND_ASSETS.splashLogo}
          alt="SabQuick"
          className="sq-boot__logo"
          draggable={false}
        />
        <span className="sq-boot__rule" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Standalone loop used by the brand sandbox to replay the sequence without
 * booting the whole storefront.
 */
export function SplashScreenPreview({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = React.useState<BootPhase>("booting");

  React.useEffect(() => {
    const revealTimer = window.setTimeout(() => setPhase("revealing"), 760);
    const doneTimer = window.setTimeout(onDone, 1120);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return <SplashScreen phase={phase} />;
}
