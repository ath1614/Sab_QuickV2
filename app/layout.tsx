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
import { MobileAuthBridge } from "@/components/auth/MobileAuthBridge";

// Inter carries UI/body copy; Space Grotesk is the display face for
// headlines, prices and big numbers (mirrors the Flutter app's type system).
// Both load via CSS variables consumed in tailwind.config.ts fontFamily —
// self-hosted by next/font (zero layout shift, no Google request at runtime).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
  display: "swap",
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
    default: "SabQuick | 10-15 Min Hyper-Local Grocery Delivery",
    template: "%s | SabQuick",
  },
  description:
    "SabQuick delivers fresh groceries, daily essentials, and midnight munchies to your doorstep within 10-15 minutes in a 2.5 km geofence.",
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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "SabQuick | 10-15 Min Hyper-Local Grocery Delivery",
    description:
      "SabQuick delivers fresh groceries, daily essentials, and snacks to your doorstep within 10-15 minutes in a 2.5 km geofence.",
    url: "https://srv1985371.hstgr.cloud",
    siteName: "SabQuick",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SabQuick - A Complete Provision Store Right To Your Door",
      },
    ],
    locale: "en_IN",
    type: "website",
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AuthProvider>
          <MobileAuthBridge />
          <PwaProvider>
            <ThemeSync />
            <div className="pb-28 sm:pb-32 md:pb-0 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 min-h-screen">
              {children}
            </div>
            <ActiveOrderFloatingBar />
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
