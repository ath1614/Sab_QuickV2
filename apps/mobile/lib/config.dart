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

  /// Google OAuth **Web** client ID (public identifier — safe to ship).
  ///
  /// Passed as `serverClientId` to google_sign_in so the native consent sheet
  /// mints an ID token whose audience is the server's GOOGLE_CLIENT_ID; the
  /// backend verifies it in lib/auth.ts before issuing the NextAuth session.
  /// Native Android/iOS OAuth clients (by package name / bundle ID + SHA-1)
  /// must also exist in the same Google Cloud project — see
  /// apps/mobile/GOOGLE_SIGNIN_SETUP.md for the one-time console steps.
  static const String googleWebClientId =
      '49479543811-b4cigo43ujtpekok0mpb9dfe8fa9tchm.apps.googleusercontent.com';

  /// Storefront brand constants (mirrors the web useCartStore constants).
  static const int freeDeliveryThreshold = 199;
  static const int standardDeliveryFee = 15;
  static const int handlingFee = 2;
}
