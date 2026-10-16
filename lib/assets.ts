/**
 * SabQuick Central Brand Asset Registry & Cache-Buster
 * 
 * Provides version-fingerprinted URLs (?v=...) for all static brand assets,
 * ensuring browsers, PWAs, and Capacitor WebViews immediately load the
 * newest assets rather than serving stale disk cache.
 */

export const ASSET_VERSION = "20261016-v2";

export const BRAND_ASSETS = {
  // App & Launcher Icons
  appIcon: `/brand/app-icon.png?v=${ASSET_VERSION}`,
  appIcon512: `/icon-512.png?v=${ASSET_VERSION}`,
  appIcon192: `/icon-192.png?v=${ASSET_VERSION}`,
  appleTouchIcon: `/apple-touch-icon.png?v=${ASSET_VERSION}`,
  favicon: `/favicon.ico?v=${ASSET_VERSION}`,
  faviconPng: `/favicon.png?v=${ASSET_VERSION}`,
  faviconSvg: `/favicon.svg?v=${ASSET_VERSION}`,

  // Logos
  navbarLogo: `/brand/navbar-logo.png?v=${ASSET_VERSION}`,
  officialLogo: `/brand/sabquick-official-logo.png?v=${ASSET_VERSION}`,
  masterLogo: `/brand/sabquick-master-logo.png?v=${ASSET_VERSION}`,
  splashLogo: `/brand/splash-logo.png?v=${ASSET_VERSION}`,
  
  // Marketing & Social
  ogImage: `/og-image.png?v=${ASSET_VERSION}`,
  featureGraphic: `/brand/playstore-feature-graphic.png?v=${ASSET_VERSION}`,
} as const;

export function assetUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}
