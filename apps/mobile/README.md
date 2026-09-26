# SabQuick Flutter App (Phase 6)

Native customer app replacing the Capacitor WebView wrapper. Talks to the
**unchanged** Next.js backend (39 REST routes) using the same NextAuth
credentials flow the web uses — session JWT is persisted as a cookie.

## Run (local dev)

```bash
cd apps/mobile
flutter pub get
# Point at a local dev server (Android emulator reaches host via 10.0.2.2):
flutter run --dart-define=SABQUICK_BASE_URL=http://10.0.2.2:3000
# Production (default):
flutter run
```

## Build release APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

Signing: the Gradle config reads `android/key.properties` (gitignored — see
`key.example.properties`). Without it, the APK falls back to debug signing,
which is fine for internal smoke builds but NOT for Play Store.

## Screens

Splash → Auth (phone+OTP / staff PIN) → Home (theme-aware header, category
tiles, product rails) → Aisles (left rail + subcategory grid) → Cart
(steppers, bill, address picker, place order) → Orders (active + history) →
Tracking (animated status stepper, delivery OTP, 6s poll) → Account.

## Animation system (the reason for Flutter)

- `Pressable` — springy press-scale + haptic on every tappable.
- `AddToCartButton` — ADD → stepper morph via `AnimatedSwitcher`.
- iOS-style back-swipe + shared-axis transitions via `PageTransitionsTheme`.
- Pulsing ETA banner, animated status stepper dots in tracking.
- Floating cart pill that appears/disappears with cart contents.

## CI

`.github/workflows/ci.yml` has a `build-android-app` job: `flutter analyze`
(fatal infos) + `flutter test` + release APK build, artifact uploaded. It runs
after web validation and does not gate the VPS deploy.

## Google login (unchanged bridge)

External browser → `/auth/mobile-return` → 90s single-use Redis token →
`sabquick://auth-callback?token=...` deep link (intent-filter already in the
manifest) → `ApiClient.completeGoogleLogin(token)` exchanges it for a session
cookie. Same flow the Capacitor APK uses today.
