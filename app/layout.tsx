import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { ActiveOrderFloatingBar } from "@/components/orders/ActiveOrderFloatingBar";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageFrame } from "@/components/layout/PageFrame";
import { MobileAuthBridge } from "@/components/auth/MobileAuthBridge";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { GlobalOverlays } from "@/app/providers/GlobalOverlays";
import { GlobalCartWarningToast } from "@/components/cart/GlobalCartWarningToast";
import { ASSET_VERSION } from "@/lib/assets";

// Inter carries UI/body copy; Space Grotesk is the display face for
// headlines, prices and big numbers (mirrors the Flutter app's type system).
// Both load via CSS variables consumed in tailwind.config.ts fontFamily —
// self-hosted by next/font (zero layout shift, no Google request at runtime).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B6E4F" },
    { media: "(prefers-color-scheme: dark)", color: "#074834" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://srv1985371.hstgr.cloud"),
  title: {
    default: "SabQuick | Superfast Grocery Delivery",
    template: "%s | SabQuick",
  },
  description:
    "SabQuick delivers fresh groceries, daily essentials, and midnight munchies to your doorstep superfast within a 3.5 km geofence.",
  applicationName: "SabQuick",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SabQuick",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: `/favicon.svg?v=${ASSET_VERSION}`, type: "image/svg+xml" },
      { url: `/favicon.ico?v=${ASSET_VERSION}`, sizes: "any" },
      { url: `/icon-192.png?v=${ASSET_VERSION}`, sizes: "192x192", type: "image/png" },
      { url: `/icon-512.png?v=${ASSET_VERSION}`, sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: `/apple-touch-icon.png?v=${ASSET_VERSION}`, sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "SabQuick | Superfast Grocery Delivery",
    description:
      "SabQuick delivers fresh groceries, daily essentials, and snacks to your doorstep superfast within a 3.5 km geofence.",
    url: "https://srv1985371.hstgr.cloud",
    siteName: "SabQuick - Superfast Provision Store",
    images: [
      {
        url: `/og-image.png?v=${ASSET_VERSION}`,
        secureUrl: `https://srv1985371.hstgr.cloud/og-image.png?v=${ASSET_VERSION}`,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "SabQuick - Superfast Grocery Delivery | A Complete Provision Store Right To Your Door",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SabQuick | Superfast Grocery Delivery",
    description:
      "SabQuick delivers fresh groceries, daily essentials, and snacks to your doorstep superfast within a 3.5 km geofence.",
    images: [`/og-image.png?v=${ASSET_VERSION}`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font CSS variables must live on <html>: Tailwind's preflight applies
    // font-family: var(--font-inter) at the html level, and an undefined var
    // there would make the whole document fall back to the browser serif.
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before the first paint so a cold start shows the brand frame,
            not the storefront. BootGate removes the flag once its frame is up. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!sessionStorage.getItem("sq_splash_seen")){document.documentElement.dataset.booting="1";setTimeout(function(){delete document.documentElement.dataset.booting},9000)}}catch(e){}`,
          }}
        />
        <link
          rel="preload"
          as="image"
          href={`/brand/splash-logo.png?v=${ASSET_VERSION}`}
        />
      </head>
      <body className="sq-skin">
        <AuthProvider>
          <MobileAuthBridge />
          <PushNotificationManager />
          <PwaProvider>
            <ThemeSync />
            <PageFrame>{children}</PageFrame>
            <ActiveOrderFloatingBar />
            <GlobalOverlays />
            <GlobalCartWarningToast />
            <PwaInstallPrompt />
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
          </PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
