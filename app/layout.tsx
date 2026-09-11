import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeSync } from "@/components/theme/ThemeSync";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0B6E4F",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sabquick.local"),
  title: "SabQuick | 10-15 Min Hyper-Local Grocery Delivery",
  description:
    "SabQuick delivers fresh groceries, daily essentials, and snacks to your doorstep within 10-15 minutes in a 2.5 km geofence.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "SabQuick | 10-15 Min Hyper-Local Grocery Delivery",
    description:
      "SabQuick delivers fresh groceries, daily essentials, and snacks to your doorstep within 10-15 minutes in a 2.5 km geofence.",
    url: "https://sabquick.local",
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
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
