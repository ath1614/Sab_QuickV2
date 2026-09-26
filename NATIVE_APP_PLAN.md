# SabQuick Native App Plan — Flutter Rebuild (Phase 6)

> Companion to the Blinkit web redesign plan (Phases 0–4) and Seasonal Theme Engine (Phase 5).
> **Decision: Flutter.** Reasoning and alternatives in §2.

---

## 1. Why rebuild at all — what the current "app" is

The current APK (`com.sabquick.app`) is **not a native app**. `capacitor.config.ts` points a WebView
at the production website:

```ts
server: { url: "https://srv1985371.hstgr.cloud", ... }
```

So every screen today is literally the website rendered inside an Android WebView. That is why:

- Animations are CSS transitions (the `active:scale-95` buttons, slide-ins) — they run on the
  browser compositor inside the WebView, not the GPU-accelerated native pipeline.
- Cold start shows the web splash → white flash → HTML hydration.
- No native page swipes, no shared-element transitions, no 60fps gesture-driven motion.
- Google login needs the external-browser + deep-link bridge (`MobileAuthBridge.tsx`,
  `sabquick://auth-callback`) — workable, but clunky.

A Flutter rebuild replaces this with real native rendering, gesture physics, and hardware
compositing, **while keeping 100% of the backend**.

---

## 2. Framework recommendation: Flutter (over React Native)

| Criteria (weighted for *this* project) | Flutter | React Native (Expo) |
|---|---|---|
| Animation quality (buttons, transitions, swipes) | **Best** — built-in implicit/explicit animation system, Hero shared-element transitions, 60/120fps guaranteed by design | Very good with Reanimated, but more assembly required; bridge-free only via New Architecture |
| Page swipe physics | Native-feel `PageView`, `Dismissible`, drag-to-dismiss sheets out of the box | Good via Reanimated + gesture-handler, more manual tuning |
| Ease for a solo dev with no prior mobile experience | **One language (Dart), one widget tree, one toolchain** (`flutter run` just works) | TS knowledge helps, but native modules still occasionally need Kotlin/JSI |
| Reusing your existing React/TS frontend code | No reuse | **Some reuse of types/logic** — but see below: this advantage mostly evaporates |
| Cold start / perf on budget Androids (your Ambikapur market) | Excellent — compiles to ARM, no JS bridge | Very good on New Architecture, still slightly behind |
| OTA hot-fix pushes | Shorebird (3rd-party, free tier) | EAS Update (first-party) — RN's one big win |
| App size | ~15–20 MB | ~8–15 MB (Expo) |
| Payments SDK (Cashfree) | Official `cashfree_pg` Flutter plugin (native drop-in) | Official React Native SDK |
| Maps (tracker) | `flutter_map` + OSM (free) or Google Maps plugin | react-native-maps (needs Google API key) |

**Why the RN "reuse your TypeScript" argument doesn't apply here:** you said the website will be
*completely redesigned*. There is no component library to carry over — the new web UI and the new
app are both green-field designs sharing only the API. The two real decision inputs are animation
quality and solo-dev tooling friction, and Flutter wins both. Recommendation: **Flutter 3.x,
Material 3, Android-first** (your users are on Android; iOS can follow from the same codebase).

One honest caveat: if you expect to iterate on the app via instant updates without Play Store
review, Expo's EAS Update is smoother than Shorebird. For a 10-minute grocery app, most updates
anyway ship through Play review in hours, so this is a minor factor.

---

## 3. Architecture — backend untouched

```
┌───────────────────────────────  NOTHING CHANGES  ───────────────────────────────┐
│  Next.js 14 API (39 routes) · Prisma/Postgres 16 · Redis 7 · Caddy · VPS        │
└───────────────┬─────────────────────────────────────┬───────────────────────────┘
                │ HTTPS/JSON                          │ SSE (/api/orders/[id]/stream)
   ┌────────────▼────────────┐             ┌──────────▼──────────┐
   │ Flutter customer app     │             │ Flutter rider app    │  ← Phase 7
   │ (Phase 6, this plan)     │             │ (GPS + push)         │
   └──────────────────────────┘             └──────────────────────┘
   ┌───────────────────────────────────────────────────────────────────┐
   │ Redesigned responsive web (Blinkit phases 0–4) — same API         │
   └───────────────────────────────────────────────────────────────────┘
```

**Repo layout:** add `apps/mobile/` (own `pubspec.yaml`, CI job builds APK on tag push). The
Next.js app stays at the repo root. Old Capacitor code (`android/`, `capacitor.config.ts`)
stays until Play Store migration is verified, then is archived.

### API consumption (all existing endpoints)

| App feature | Existing API |
|---|---|
| Catalog / rails | `GET /api/products`, `GET /api/categories` (post-Phase-0 structure) |
| Search | existing search endpoint |
| Address + geofence | existing address APIs (2.5 km Ambikapur hub rule unchanged) |
| Cart fees/totals | computed client-side to match `useCartStore` constants; **validated server-side** in `POST /api/orders` |
| Coupons | existing coupon endpoints |
| Orders | `POST /api/orders`, order list/detail, `DELETE` cancel, reorder |
| Live tracking | `GET /api/orders/[id]/stream` (SSE) — Flutter parses the stream with `package:eventsource` (same payload the web `OrderTrackerClient` consumes) |
| Payments | `POST /api/payments/cashfree/create` + verify — but rendered with **Cashfree's native SDK** (`cashfree_pg`) instead of the web modal |
| Theme palettes | `GET /api/theme` — app maps `ThemeConfig`/Phase-5 `ThemeCampaign` colors onto Flutter `ThemeData` at launch (cached 5 min) |

### Auth — reuse what exists, zero backend changes for MVP

Your NextAuth setup already supports everything the app needs:

1. **Phone + OTP / PIN login (primary path):**
   `GET /api/auth/csrf` → `POST /api/auth/callback/credentials` with `{ phone, otp|pin, csrfToken }`.
   The Flutter HTTP client (Dio) persists the NextAuth session cookie in an encrypted cookie jar
   (`flutter_secure_storage`). Same JWT contract as the web.
2. **Google login:** the deep-link exchange flow built for the APK is reused verbatim:
   external browser → `/api/auth/signin/google` → `app/auth/mobile-return/page.tsx` mints the
   90-second single-use Redis token → `sabquick://auth-callback?token=...` deep link →
   Flutter sends `mobileExchangeToken` to the credentials callback (`lib/auth.ts:40-95` consumes it).
   Keep the same deep-link scheme; add the Android intent filter to the Flutter manifest.
3. *(Optional, later, half-day)* small backend addition: `POST /api/auth/mobile/session` that
   exchanges the Redis token for a long-lived signed device token — only if you later want to
   drop cookie-jar handling.

**Note for staff roles:** OWNER/MANAGER/PACKER/RIDER login works identically (PIN path), but the
native MVP is the **customer app only** — staff continue on the responsive web portals (Phase 7
adds a native Rider app, which is where native really pays off: background GPS, FCM push,
cash remittance).

---

## 4. Screen inventory — yes, every screen gets built

Customer app MVP (13 screens):

| # | Screen | Replaces | Highlights |
|---|---|---|---|
| 1 | Splash | `SplashScreen.tsx` | 150 ms logo burst → fade (Blinkit-style flat/fast) |
| 2 | Auth (phone → OTP; Google) | `AuthModal` | OTP auto-fill via SMS consent API |
| 3 | Home | `app/page.tsx` | Green header + location, search bar, banner carousel (from `/api/theme`), 3×3 category grid, product rails, **floating cart pill** |
| 4 | Category explorer | `AislesDirectorySheet.tsx` | Left-rail parent list + subcategory tile grid (same design as web Phase 2) |
| 5 | Subcategory product grid | — | 2-col grid, animated ADD→stepper morph |
| 6 | Search | — | Debounced, recent searches, skeleton results |
| 7 | Product detail | modal on web | Hero image shared-element transition from card |
| 8 | Cart + checkout | `CartDrawer.tsx` (1,407 lines) | Tips, coupons, payment method select, slot/notes |
| 9 | Payment | Cashfree web modal | **Native Cashfree SDK drop-in** — big UX upgrade |
| 10 | Order confirmation | web | Confetti + status animation |
| 11 | Orders list | `/orders` | Status chips, reorder button |
| 12 | Order tracker | `OrderTrackerClient.tsx` | Map (`flutter_map`/OSM), ETA countdown ring, delivery OTP display, SSE-driven status timeline |
| 13 | Account | `/account` | Profile, addresses, logout, delete-account (**only after the OTP-confirmed deletion fix**) |

Staff portals: stay on web for MVP. Phase 7 = native Rider app (GPS transmission — closing audit
finding C — FCM push, COD remittance). Packer/Manager/Owner go native only if tablet usage
ever justifies it.

---

## 5. Animation system — the reason we're doing this

You asked for exactly four things; here is how each is delivered in Flutter:

| You asked for | Flutter mechanism |
|---|---|
| **Better button animations** | Global `MaterialState` press-scale + haptic; `AnimatedContainer` morph on ADD → stepper (+1/−1 buttons spring in); FAB cart pill bounce via `AnimatedPositioned` + `ScaleTransition` |
| **Better page change animations** | M3 shared-axis transitions (fade-through for tab switches, slide-forward for drill-downs); `Hero` widget for product image card → detail; route-level `PageTransitionsTheme` set once in `ThemeData` |
| **Better page swipes** | `PageView` for banner carousel & onboarding; drag-handle modal sheets with physics-based dismissal; horizontal swipe on tracker timeline; iOS-style back-swipe on Android via `CupertinoPageTransitionsBuilder` |
| **Better "everything" animations** | Skeleton shimmer loaders on every list; animated order-status stepper (packer → rider → delivered ticks); confetti on order placement; theme-color transitions when a `ThemeCampaign` goes live |

All of this runs on Flutter's Impeller renderer — no WebView, no hydration, 60/120 fps.

---

## 6. Build phases (Phase 6 in the master roadmap)

| Milestone | Scope | Est. |
|---|---|---|
| **6.0 Prerequisites** | Phase 0 catalog restructure (both frontends need it); security fixes shipped (esp. `/api/user/delete-account` OTP flow, OTP leak, Firebase key rotation); Phase 5 theme engine (so `/api/theme` serves campaign data from day 1) | — |
| **6.1 Skeleton** | `apps/mobile` Flutter project, theme engine client (`/api/theme` → `ThemeData`), Dio + secure cookie jar, deep-link intent filter, CI APK build | 1–1.5 d |
| **6.2 Auth** | Phone+OTP/PIN credentials flow, Google via existing exchange-token bridge, session persistence | 1 d |
| **6.3 Storefront core** | Home (grid + rails), category explorer, product grid/detail, search, cart + floating pill — full animation layer | 3–4 d |
| **6.4 Checkout & orders** | Address/geofence, coupons, native Cashfree payment, confirmation, orders list, SSE tracker with map + OTP | 3 d |
| **6.5 Polish & hardening** | Skeletons everywhere, error/offline states, haptics tuning, perf pass (image caching, list virtualization), Play Store listing + internal test track | 2 d |
| | **Total customer app** | **≈ 10–12 working days** |
| **Phase 7 (next)** | Native Rider app: background GPS (fixes finding C), FCM push (firebase-admin already in stack), COD remittance; then packer KDS if needed | 4–5 d |

Realistic sequencing: 6.1–6.2 can start any time; 6.3 wants Phase 0 done; 6.4 wants security
fixes live; 6.5 wants Phase 5 theme data.

---

## 7. Risks & mitigations

- **Two frontends to maintain** (web + app): mitigated because both consume the same Phase-0
  catalog and the same API; design language is identical (Blinkit plan doubles as the app spec).
- **Play Store review**: first review is the slowest; ship the internal test track from 6.1 onward.
- **Keystore hygiene**: before any new release pipeline, resolve the tracked-keystore finding
  (rotate passwords, remove from git) — otherwise the new APK inherits the same exposure.
- **Solo bandwidth**: the app can launch to internal users while web keeps serving production —
  zero risk to the live site during the entire build.

---

## 8. Split apps vs one app — recommendation

**Build ONE app for all roles (already implemented), split the rider app out only when Phase 7 lands.**

| Factor | Single app (chosen) | Split apps |
|---|---|---|
| Distribution to staff | One WhatsApp link / Play listing — staff install the same APK and log in with their PIN | You must separately distribute + update a second APK to packers/riders |
| Maintenance (solo dev) | One codebase, one release train, one CI job | Two release trains, doubled review overhead |
| Security | **No difference** — RBAC is enforced server-side on every API; app packaging is not a security boundary | Zero added security |
| Store review | Customer UI is what reviewers see (role routing means customers never see staff tooling) | Cleaner per-audience listings, but two reviews |
| Rider-specific needs (background GPS, FCM push, battery-exempt permissions) | Later: a rider-only flavor avoids asking customers for location permissions | Better permission hygiene — the real argument for splitting |

**Decision:** the single APK ships now with role-aware shells (customer storefront / packer-manager queue / rider dashboard — `HomeScreen` routes on the session role). When Phase 7 adds background GPS + push, extract a **"SabQuick Rider"** app via Flutter flavors (one codebase, two build targets) so the customer listing never requests location/background permissions.

## 9. One-page summary

> Build the customer app in **Flutter**, Android-first, in `apps/mobile/`, talking to the
> unchanged Next.js API with NextAuth session cookies, Google login via the existing
> exchange-token deep link, SSE for tracking, Cashfree's native SDK for payment, and
> `/api/theme` for the seasonal palette engine. Every customer screen gets a native rebuild
> with M3 shared-axis transitions, hero image animations, gesture-driven sheets, and
> press-scale/stepper-morph buttons. ≈ 10–12 focused days after the Phase 0 catalog fix and
> security fixes land. Staff tools stay on web until the Phase 7 rider app.
