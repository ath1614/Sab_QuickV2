"use client";

import * as React from "react";
import { SplashScreen, type BootDestination, type BootPhase } from "./SplashScreen";
import { hideNativeSplash } from "@/lib/nativeSplash";

interface BootGateProps {
  destination: BootDestination;
  authReady: boolean;
  children: React.ReactNode;
}

/** The brand beat is allowed to finish, but never to hold the app hostage. */
const MIN_BOOT_MS = 560;
const MAX_BOOT_MS = 1600;
/** Never hold the brand frame past the documented 1.6 s hard cap. */
const AUTH_MAX_MS = 1600;
const REVEAL_MS = 360;
const SEEN_KEY = "sq_splash_seen";

/**
 * Owns the one cold-start sequence.
 *
 * - Decides whether this is a first visit before the first client paint (the
 *   inline script in app/layout.tsx sets html[data-booting]).
 * - Keeps the destination mounted underneath so its fonts/images are warm and
 *   there is no second layout pass when the paper sheet lifts.
 * - Never blocks on the network for longer than MAX_BOOT_MS, or AUTH_MAX_MS
 *   while the session is still resolving.
 */
export function BootGate({ destination, authReady, children }: BootGateProps) {
  const [active, setActive] = React.useState(false);
  const [phase, setPhase] = React.useState<BootPhase>("booting");
  const startedAt = React.useRef<number>(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Decide once, on the client. The static frame in globals.css covers the
  // screen until this effect has swapped in the identical React frame.
  React.useEffect(() => {
    const root = document.documentElement;
    const booting = root.dataset.booting === "1";

    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode / storage disabled: play the boot frame, it is harmless.
    }

    if (booting || !seen) {
      startedAt.current = performance.now();
      setActive(true);
      // Keep the pre-hydration frame until the React frame has painted.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          delete root.dataset.booting;
        });
      });
    } else {
      delete root.dataset.booting;
      setPhase("revealing");
    }
  }, []);

  // A new binary keeps its native launch screen up until we say otherwise.
  // Older binaries do not have the plugin; hideNativeSplash() is a no-op there.
  React.useEffect(() => {
    // Wait one paint after the React frame exists, then release the OS splash.
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        void hideNativeSplash();
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second) window.cancelAnimationFrame(second);
    };
  }, []);

  // Gate the reveal on auth resolution, with a minimum brand beat and a hard cap.
  React.useEffect(() => {
    if (!active || phase !== "booting") return;

    const tick = () => {
      const elapsed = performance.now() - startedAt.current;
      const cap = authReady ? MAX_BOOT_MS : AUTH_MAX_MS;
      // Prefer waiting for auth so the catalogue never flashes before login,
      // but never exceed the hard cap: the destination has its own skeletons.
      if ((authReady && elapsed >= MIN_BOOT_MS) || elapsed >= cap) {
        setPhase("revealing");
      }
    };

    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [active, authReady, phase]);

  React.useEffect(() => {
    if (!active || phase !== "revealing") return;
    // Mark the session as booted when the reveal starts, not when the gate
    // mounts: if the component remounts mid-boot, the frame must not vanish.
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage disabled: the frame simply plays again on the next load.
    }
    const timer = window.setTimeout(() => setActive(false), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, phase]);

  // Keep the destination out of the tab order while the sheet is still down.
  React.useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    node.inert = active && phase === "booting";
    if (active && phase === "booting") {
      node.setAttribute("aria-hidden", "true");
    } else {
      node.removeAttribute("aria-hidden");
    }
  }, [active, phase]);

  return (
    <>
      <div
        ref={contentRef}
        className="sq-boot-content"
        data-boot-state={active ? phase : "ready"}
      >
        {children}
      </div>
      {active && <SplashScreen phase={phase} destination={destination} />}
    </>
  );
}
