"use client";

import * as React from "react";

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  installApp: () => Promise<void>;
  deferredPrompt: any;
}

const PwaContext = React.createContext<PwaContextType>({
  isInstalled: false,
  isInstallable: false,
  isOnline: true,
  installApp: async () => {},
  deferredPrompt: null,
});

export function usePwa() {
  return React.useContext(PwaContext);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  // 1. Service Worker Registration & Online/Offline detection
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone display mode (PWA installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker in production & staging
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA Service Worker] Registered successfully:", registration.scope);
        })
        .catch((error) => {
          console.error("[PWA Service Worker] Registration failed:", error);
        });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. Capture native beforeinstallprompt event (Android / Chromium)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("[PWA] SabQuick was successfully installed on the device.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // 3. User-triggered install prompt execution
  const installApp = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show native prompt
    deferredPrompt.prompt();

    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isOnline,
        installApp,
        deferredPrompt,
      }}
    >
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>You are currently offline. Showing cached products & local cart.</span>
        </div>
      )}
      {children}
    </PwaContext.Provider>
  );
}
