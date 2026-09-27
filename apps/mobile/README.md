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

## Consoles — all native, zero website

The app is standalone from the website: no WebViews, no external URLs. Every
console the website hosts has a purpose-built Flutter screen:

| Screen | Role | Backed by |
|---|---|---|
| `owner_hub_screen.dart` | OWNER tab 1 | `/api/ops/analytics` + `/api/ops/orders` |
| `catalog_screen.dart` | OWNER/MANAGER | `/api/ops/products*`, `/api/ops/categories`, `/api/ops/upload`, `/api/ops/inventory/toggle-stock` |
| `manager_kanban_screen.dart` | MANAGER (tab 1) / OWNER | `/api/ops/orders` (+ rider assignment via `/api/ops/orders/status`) |
| `packer_station_screen.dart` | PACKER (tab 1) | `/api/ops/orders` (aisle-grouped bagging checklist) |
| `theme_studio_screen.dart` | OWNER | `/api/ops/theme/update` (presets mirrored in `lib/data/theme_presets.dart`) |
| `customers_screen.dart` | OWNER | `/api/owner/customers` |
| `policy_screen.dart` | everyone | Native Privacy/Terms/Refund + OTP-confirmed delete-account |

Role shells (post-login landing, mirroring the website):
CUSTOMER → Home · Aisles · Cart · Orders · Account ·
OWNER → Owner Hub · Storefront · Manager · Staff · Account ·
MANAGER → Dispatch · Storefront · Account ·
PACKER → Packing · Account ·
RIDER → Deliveries · Account.

A 401 on any protected call wipes the session and broadcasts logged-out
(`lib/session_bus.dart`), so an expired 30-day JWT lands the user on the auth
screen instead of dead error screens.

## iOS

`ios/` is scaffolded (bundle ID `com.sabquick.sabquick_app`, brand icon set,
photo/camera usage strings). Local builds need full Xcode (this Mac only has
Command Line Tools); CI compiles the app unsigned against the simulator SDK
(`build-ios-app` job, macOS runner). Device/TestFlight distribution is a
later milestone — it needs an Apple Developer account.

## CI

`.github/workflows/ci.yml` has a `build-android-app` job (`flutter analyze`
--no-fatal-infos + `flutter test` + release APK, artifact uploaded) and a
`build-ios-app` job (unsigned simulator compile on macOS). Neither gates the
VPS deploy.

## Emulator smoke pass (release APK, Android 16.1 arm64)

Both role flows were driven end-to-end on a headless arm64 emulator against
production (`SCREEN_MAP.md` → "Verified on emulator" has the details):

- **Customer**: OTP login (display-mode quick code) → storefront → cart → COD
  order → tracking screen with the live OSM route map (ETA chip, geofence
  pill, delivery OTP).
- **Owner**: passcode login → Owner Hub → Catalog → Theme Studio → Manager
  Kanban, including a native PENDING→CONFIRMED status advance.
- **Fixes that came out of it**: a `Map<String, dynamic>` cast crash in
  `TrackingScreen` when a poll returned no match (also keeps the last known
  order on transient empty responses) and cart persistence
  (`SharedPreferences`) to survive app restarts.

Reproduce locally: build the release APK, install via `adb install -r`, and
drive the UI with `adb shell uiautomator dump` + `adb shell input tap`.

## Google login (native, in-app — no website involvement)

The Google consent sheet opens INSIDE the app via the `google_sign_in`
plugin. The app sends the returned ID token to
`POST /api/auth/callback/credentials` as `googleIdToken`; `lib/auth.ts`
verifies it server-side (signature, expiry, audience = `GOOGLE_CLIENT_ID`,
verified email) and issues the NextAuth session cookie. No system browser,
no deep links, no dependency on the website.

One-time Google Cloud Console setup (Android + iOS OAuth clients in the
project that owns `GOOGLE_CLIENT_ID`): see `GOOGLE_SIGNIN_SETUP.md`.
