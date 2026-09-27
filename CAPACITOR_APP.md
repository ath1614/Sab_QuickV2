# SabQuick Capacitor App

The native Flutter app has been retired. The mobile app is now a **Capacitor
shell around the website itself** — one codebase, every web feature (payment
methods, coupons, tips, live tracking, theme engine) ships to the app the
moment it ships to the site.

## Architecture

- `capacitor.config.ts` → `server.url` points at the production site
  (`https://srv1985371.hstgr.cloud`). The WebView loads the live site; there
  is no bundled web copy to keep in sync.
- `android/` is the only native shell checked in (iOS can be added later with
  `npx cap add ios` once an Apple Developer account exists).
- CI (`build-capacitor-app` job) builds a debug APK on every push after the
  web `npm run build` succeeds.

## Local device testing against your dev machine

1. Find your LAN IP: `ipconfig getifaddr en0`
2. Point the shell at the dev server — edit
   `android/app/src/main/assets/capacitor.config.json`:
   ```json
   "server": { "url": "http://<LAN-IP>:3210", "cleartext": true }
   ```
3. `npx cap sync android && cd android && ./gradlew assembleDebug`
4. `adb install -r app/build/outputs/apk/debug/app-debug.apk`

Cleartext (http) is allowed **only** for your LAN IP, `10.0.2.2` (emulator →
host loopback) and `localhost` via
`android/app/src/main/res/xml/network_security_config.xml`. Production stays
https-only — never add the prod domain to the cleartext list.

Always revert `capacitor.config.json` to the production URL before
committing (CI builds serve the live site).

## What was ported from the Flutter design (Neon Market skin)

- Warm fog canvas `#F7F6F2`, stepped ink neutrals, electric lime `#C8F531`
  accent, soft card shadows over hard borders (`--sq-*` tokens in
  `app/globals.css`, applied globally via `body.sq-skin`).
- Space Grotesk display + Inter body (already the web fonts).
- `.sq-card` / `.sq-cta` / `.sq-marker` / `.sq-pressable` utility classes
  mirror the app's card / lime button / highlight-marker / press motifs.
- Categories experience: circle-card grid (all categories on one screen) →
  tap opens a subcategory side panel (sidebar on desktop, bottom sheet on
  mobile) with the items inside — `components/catalog/CategoriesDirectory.tsx`.
- Home rails capped at 6 items with See-all deep links; "Aisles" wording is
  now "Categories" everywhere (bottom nav, sheet, pills, headers).

## Online payments (Cashfree)

`Pay Online` places the order then opens Cashfree hosted checkout via
`app/pay/checkout/page.tsx` (bridge page loading the official SDK, redirect
`_self` so native UPI intent buttons work in the in-app browser). The app
polls `POST /api/payments/cashfree/verify`; unpaid sessions cancel the
pending order and restore stock — same semantics as the web drawer.
