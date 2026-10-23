# App Store submission readiness — SABQuick 1.0 (build 7)

**Date:** 23 Oct 2026
**Context:** App Store review of 1.0 (6) rejected on **iPad Air 11-inch (M3)** with
*"the app is not optimized to support all screen sizes or resolutions."* This pass fixes the
layout, the map sheet, and re-checks every screen on 18 device sizes. It also audits the
native project and the listing assets App Store Connect needs.

Legend: **Done** = verified in this repository · **Owner** = needs App Store Connect / Apple
Developer / a deploy, which cannot be done from code.

---

## 1. What was broken on the reviewer's iPad

| Issue | Cause | Status |
|---|---|---|
| Page wider than the screen, content sliding off on iPad | Top navigation action row could not shrink below its intrinsic width (fixed in the previous pass) | **Done** |
| Bottom nav / categories clipped | Followed from the same overflow | **Done** |
| **Map sheet asymmetric on phones** | The sheet's primary button text *"Save & Deliver Here (Superfast Delivery)"* was `nowrap`; at 320–375 px it forced the dialog's grid column to **331 px inside a 320 px screen**, clipping the map's right edge, the description, and the badge | **Done** — dialog grid is now `minmax(0,1fr)` with `min-w-0` children; the button wraps and drops the parenthetical on phones |
| Map tiles laid out for the wrong size after rotation / Split View | Leaflet caches the container size at creation; an iPad rotation or Stage Manager resize left grey bands and an off-centre pin | **Done** — `ResizeObserver` + `orientationchange` → `invalidateSize()` on both maps |
| Map dominated a short phone screen | Fixed 320 px height | **Done** — `clamp(200px, 32dvh, 320px)` on phones, 320 px from `sm` up |
| Login screen looked unfinished on iPad | Hero pinned to the top, form pinned to the bottom, ~400 px of empty space between | **Done** — the hero + card are centred as one group |
| Welcome strip text clipped at 320 px | Pill + gift icon + long CTA took the width | **Done** — icon/pill hide below 360 px, CTA shortens to "Claim" |
| iOS focus-zoom into text fields | Inputs rendered at 12–14 px | **Done** — every customer and staff text field is ≥16 px on phones/tablets, 12–14 px only from `lg` (mouse) |

---

## 2. Layout verification (the rejection reason)

`scripts/ui-audit.mjs` drives Chromium through **21 routes × 18 device sizes = 378 checks**,
on the production build:

| Class | Sizes |
|---|---|
| iPhone | 320×568, 360×640, 375×667, 375×812, 390×844, 412×915, 430×932 |
| iPad | 744×1133, 768×1024, **820×1180 (iPad Air 11 M3)**, 834×1194, 1024×1366, 1032×1376 |
| iPad landscape | **1180×820**, 1194×834, 1366×1024 |
| Desktop | 1440×900, 1920×1080 |

Result: **378 / 378 ok — 0 px document overflow, 0 elements outside the viewport, 0 text
fields below 16 px.** Routes covered: home, filtered home, category directory, category
detail, orders, order tracking, checkout, rider apply, offline, privacy, terms, refund,
delete-account, brand, owner, owner catalog, owner fleet, manager, packer, rider, rider
dashboard.

Overlays measured separately at 320 / 375 / 390 / 430 / 744 / 820 / 1024 / 1180 / 1440:
cart sheet, product detail sheet, delivery-location map sheet, account/ops sheet, login
screen. All are inside the viewport and horizontally symmetric; the map sheet is now
`0` px from both sheet edges at every width (previously +35 px on the right at 320).

The only console errors are `404`s for `/products/*`, `/categories/*` and `/banners/*`:
**this checkout does not contain those media files** (they exist on the deployed server).
They are not layout or runtime errors.

### Commands

```bash
npm run build && npx next start -p 3100
node scripts/ui-audit.mjs              # full 18-device matrix, exits non-zero on overflow
node scripts/ui-audit.mjs --widths 390,820,1180   # quick sweep
```

---

## 3. Native project audit (iOS)

| Item | Value | Verdict |
|---|---|---|
| Bundle identifier | `com.sabquick.app` | OK |
| Marketing version | `1.0` | OK |
| **Build number** | **bumped 6 → 7** | New binary for resubmission |
| Device family | `TARGETED_DEVICE_FAMILY = "1,2"` (iPhone + iPad) | OK |
| iPad orientations | all four (`~ipad` key in Info.plist) | OK — no `UIRequiresFullScreen`, so Split View/Stage Manager are allowed |
| Launch screen | `LaunchScreen.storyboard` + `Splash` imageset | OK |
| App icon | single 1024×1024 universal icon | OK for iOS 15+ |
| Deployment target | iOS 15.0 | OK |
| Encryption | `ITSAppUsesNonExemptEncryption = false` | OK (no export-compliance prompt) |
| Location strings | when-in-use + always descriptions present | OK |
| Push | `aps-environment = production`, `remote-notification` background mode | OK |
| URL schemes | UPI apps + `sabquick` | OK |
| Account deletion | `/delete-account` (in-app, OTP-confirmed) | Meets 5.1.1(v) |
| Privacy / Terms / Refund | `/privacy`, `/terms`, `/refund` | Present and linked from the login screen |
| Third-party social login | none surfaced in the UI (phone OTP only) | Guideline 4.8 not triggered |
| Digital goods | none — groceries are physical goods, paid via UPI/Cashfree | No IAP required |
| Privacy manifest | `PrivacyInfo.xcprivacy` **absent** | See risks |

---

## 4. Listing assets

App Store Connect requires, for a universal app:

| Slot | Required size | Current file | State |
|---|---|---|---|
| 13-inch iPad | 2048×2732 (or 2064×2752) | `appstore_screenshots/ipad-13-2048x2732-1..4.png` | **Stale — do not upload.** They were captured at a narrow viewport and show the phone header, a clipped welcome strip ("…on your firs…") and truncated category names. |
| iPhone 6.7" | 1290×2796 | `iphone-6.7-screenshot-*.png` | Stale (same build as the rejected one) |
| iPhone 6.5" | 1242×2688 | `iphone-6.5-screenshot-*.png` | Stale |

`scripts/appstore-screenshots.mjs` regenerates all three at the exact pixel sizes, using the
fixed layout, browsing as a guest so no staff badge/name appears:

```bash
node scripts/appstore-screenshots.mjs --base https://srv1985371.hstgr.cloud
# → appstore_screenshots/<YYYY-MM>/
#   ipad-13-01-home.png … 05-category.png          (2048×2732)
#   iphone-6.7-01-home.png … 05-category.png       (1290×2796)
#   iphone-6.5-…                                   (1242×2688)
```

Run it **after** the web fix is deployed — the app is a WebView around the live site, so
screenshots taken before the deploy would show the old layout. The script's output was
size-verified locally (2048×2732 / 1290×2796 / 1242×2688); the local capture shows
placeholder initials because `/public/products` is not in the repository, which is why the
final run must target the deployed URL.

---

## 5. Remaining owner actions (cannot be done from this repo)

1. **Deploy the web fix.** The iOS shell loads `https://srv1985371.hstgr.cloud`; until that
   server runs this commit, the reviewer will see the old layout again.
2. **Replace the screenshots** with the generator output (13-inch iPad slot is mandatory
   because the app declares iPad support).
3. **App Privacy questionnaire** in App Store Connect. The app collects: phone number,
   name, delivery address, order history, and payment status (processed by Cashfree/UPI —
   the app does not store card numbers). Declare these as *linked to the user* and used for
   *app functionality*; no tracking/ads.
4. **Review notes.** Keep the reviewer bypass documented: phone `9820088991`, passcode
   `742918` (no SMS required), and note that the app is a storefront for physical groceries
   and that payments open the UPI app / Cashfree.
5. **Support URL** in the listing (a page or mailto) and the **marketing URL**. The privacy
   policy URL must match `/privacy`.
6. **Upload build 7** (Xcode → Archive → Distribute). The build number is already bumped;
   do not reuse build 6.
7. **Reply to the reviewer** after resubmitting: state that the layout was rebuilt for
   iPad (portrait, landscape, Split View) and that the map/location sheet now fits every
   screen; mention the exact iPad Air 11-inch check.

---

## 6. Risks worth knowing

- **Live-URL shell (Guideline 2.1).** If the VPS is unreachable at launch, WKWebView shows
  a blank/error page. Consider a native offline fallback (bundled local HTML that retries)
  before a future submission. The `/offline` web route cannot help because it is served by
  the same unavailable host.
- **Guideline 4.2 (minimum functionality).** The app is a thin wrapper around the website.
  It passed the first review, so this is not currently blocking, but native value (push,
  geolocation, UPI intents, offline shell) is what keeps it safe long-term.
- **Privacy manifest.** Apple requires `PrivacyInfo.xcprivacy` for apps (and SDKs) that use
  required-reason APIs. Capacitor's UserDefaults use is covered by the framework's own
  manifest in recent releases, but the app target has none. Add one in Xcode (File → New →
  App Privacy) and archive again; no code change is needed here. It cannot be validated on
  this machine because Xcode is not installed (`xcodebuild` unavailable).
- **Not tested on physical hardware.** All measurements are Chromium at the exact CSS
  sizes of the listed devices. iPad Split View, Stage Manager and rotation were simulated
  by resizing the viewport and are handled by the new `ResizeObserver`; a quick pass on a
  real iPad before upload is still worthwhile.
