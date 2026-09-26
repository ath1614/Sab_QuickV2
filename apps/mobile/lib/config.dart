/// Central app configuration.
///
/// The base URL is intentionally overridable: debug builds usually talk to a
/// local dev server (10.0.2.2 = host loopback from the Android emulator).
class AppConfig {
  /// Production: https://srv1985371.hstgr.cloud
  /// Local dev:  http://10.0.2.2:3000 (Android emulator -> host machine)
  static const String baseUrl = String.fromEnvironment(
    'SABQUICK_BASE_URL',
    defaultValue: 'https://srv1985371.hstgr.cloud',
  );

  /// Deep-link scheme for the Google login browser handoff. Must match the
  /// intent-filter in AndroidManifest.xml and the web `mobile-return` page.
  static const String authCallbackScheme = 'sabquick';
  static const String authCallbackHost = 'auth-callback';

  /// Storefront brand constants (mirrors the web useCartStore constants).
  static const int freeDeliveryThreshold = 199;
  static const int standardDeliveryFee = 15;
  static const int handlingFee = 2;
}
