import { Capacitor } from "@capacitor/core";

/**
 * Releases the native launch screen.
 *
 * The splash plugin auto-hides after a short fail-safe delay, but this call
 * releases it as soon as the web frame has painted — no white WebView gap.
 * Binaries built before the plugin was added do not have it; those resolve
 * through `isPluginAvailable` and simply let the OS splash hide itself.
 */
export async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (!Capacitor.isPluginAvailable("SplashScreen")) return;
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    // Never let a launch-screen call break checkout or the storefront.
  }
}
