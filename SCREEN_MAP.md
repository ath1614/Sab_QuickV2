# SabQuick Screen Map — Web (mobile viewport) ↔ Flutter App

Every screen of the web experience mapped to its app counterpart, with the
navigation/back path and parity status after the production-readiness pass.

Legend: ✅ parity shipped · 🟡 partial (gap noted) · ❌ missing (planned)

## 1. Launch & Splash

| Web (phone) | App | Status |
|---|---|---|
| `SplashScreen` brand animation, once per browser session | `SplashScreen` ≥1.2s every launch, then skeleton loading board while catalog/theme resolve | ✅ |
| Content below notch: `viewportFit=cover` + `pt-safe` on header | `SafeArea` on every screen + `SliverAppBar` FlexibleSpace wrapped in SafeArea | ✅ |

## 2. Authentication

| Web (phone) `AuthModal` (bottom sheet ≤640px) | App `AuthScreen` | Status |
|---|---|---|
| Google button → native Google consent (Capacitor handoff via `/auth/mobile-return` → `sabquick://auth-callback`) | Google button → system browser → `/auth/mobile-return` → `app_links` deep-link exchange (`completeGoogleLogin`) | ✅ |
| Phone step: 🇮🇳 +91 field, 10-digit validation `^[6-9]\d{9}$` | Same field + validation | ✅ |
| Owner branch: `requirePin`+`isOwner` → 6-digit passcode step | Same branch, `loginWithPin` (`pin` field), masked | ✅ |
| Staff branch: `requirePin` → 4-digit PIN step with role chip | Same branch | ✅ |
| Customer OTP: 4 boxes, display-mode quick code banner + auto-fill, resend cooldown | Single code field + quick-code banner (auto-filled); cooldown shown server-side only | 🟡 app lacks the 60s resend countdown widget |
| New user: name field appears when `isNewUser` | Same | ✅ |
| Errors surface real server messages (`error` query in 401 JSON body) | Same after `_extractAuthError` (expired code / wrong PIN / lockout now visible) | ✅ |
| Legal: Terms & Privacy links in modal footer | Inline tappable Terms/Privacy links (url_launcher) | ✅ |

Back/exit: web = sheet drag/Close; app = "Wrong number? Go back" resets to phone step; system back exits (root screen — correct).

## 3. Storefront Home

| Web (phone) | App Home tab | Status |
|---|---|---|
| Navbar: logo, ETA badge, address pill, sign-in/cart | Header: logo asset, 10–15 MIN chip, sale tag; search opens Aisles | ✅ |
| Hero banner ~17.7% of viewport (post-diet), theme colors + banner image | Header uses live theme `primaryColor`/`saleTagText` from `/api/theme` | ✅ |
| 3×3 CategoryGrid with live counts | Horizontal category tiles (9) → tapping filters products | ✅ |
| Aisle rails (10 per rail) + See All | Horizontal rails per category (10 per rail) + "More for you" | ✅ |
| FloatingCartPill above bottom nav | `_FloatingCartPill` centered above NavigationBar | ✅ |
| Refresh: pull-to-refresh | Pull-to-refresh reloads catalog + theme | ✅ |

## 4. Aisles / Category browsing

| Web (phone) | App Aisles tab | Status |
|---|---|---|
| `CategoryNav` sticky two-tier chips + `AislesDirectorySheet` bottom sheet | Two-pane: parent rail (left) + product grid (right) | ✅ (different pattern, deliberate — Blinkit-style pane beats stacked chips on phones) |
| URL state `/?category=…&sub=…` (back = previous category) | In-tab selection state; back returns to prior tab/screen | ✅ |
| Search bar filters across catalog (`/api/products?search=`) | App: header search routes to Aisles; search box lives in Aisles | 🟡 app search exists in Aisles grid but not surfaced on Home header |

## 5. Product detail

| Web (phone) | App | Status |
|---|---|---|
| `ProductDetailModal` bottom sheet: image, price/MRP, % OFF, unit, qty stepper, ADD | `_ProductDetailSheet` modal bottom sheet: same fields + SQAddButton morph | ✅ |

## 6. Cart & Checkout

| Web (phone) `CartDrawer` | App Cart tab | Status |
|---|---|---|
| Free-delivery progress bar (₹199 threshold) | Same banner text + thresholds from `config.dart` | ✅ |
| Itemized list with steppers (40px hit areas) | Itemized list with steppers | ✅ |
| Cross-sell "Frequently Bought Together" rail (`/api/products/recommendations`) | Not present in app cart | ❌ planned |
| Address pill → `LocationPickerModal` (map, geofence) | Address chips (select saved) + "Add a delivery address" sheet (no map pin yet) | 🟡 map pin picker planned |
| Tip selector (0/10/20/30) | Not present in app cart | ❌ planned |
| Coupons list + apply (`/api/coupons`, validate) | `couponCode` supported by `placeOrder` API; no cart UI yet | ❌ planned |
| Payment selector: Pay Online / UPI at Delivery / Cash on Delivery | Cash on Delivery only (MVP) | 🟡 |
| CTA follows payment method (Pay Online / Pay via UPI on Delivery / Place Order · Pay on Delivery) | "Place Order • ₹total" (COD) | ✅ consistent |
| Success: celebration modal + delivery OTP + track link | Success screen + pointer to Orders tab | 🟡 celebration animation planned |
| Dismissal: back button, X, Esc, outside tap; protected during payment | Tab-based (no dismissal needed) | ✅ |

## 7. Orders & Tracking

| Web (phone) | App Orders tab | Status |
|---|---|---|
| `/orders` list: active + past, order numbers, totals | Live section + history, same fields | ✅ |
| `/orders/[orderNumber]` tracker: stepper, ETA, delivery OTP | `TrackingScreen` push with back arrow: animated stepper, ETA pulse, OTP card | ✅ |
| Cancel order (where allowed) | `cancelOrder` API present; UI entry on tracker planned | 🟡 |

## 8. Account

| Web (phone) `MobileOperationsSheet` | App Account tab | Status |
|---|---|---|
| Profile card: avatar, name, phone verified badge, role chip | Profile card with role badge | ✅ |
| Operations grid per role (Owner Hub / Catalog / Manager / Packer / Rider links) | Replaced by native tabs (Everything/Manager/Staff/Coupons) — stronger than links | ✅ |
| Storefront + My Orders links | Home/Orders tabs + My Orders shortcut in Account | ✅ |
| Policies: Privacy, Terms, Refund, Delete Account | Same four via url_launcher to production pages | ✅ |
| Sign out | SQButton Log Out → AuthScreen | ✅ |
| Addresses (first saved address shown in Navbar) | Add + list saved addresses | ✅ |
| Phone verification ("Verify Now" → `PhoneVerificationDrawer`) | Not in app (phones are OTP-verified at login by construction) | 🟡 |
| Geofence map pin (LocationPickerModal) | Not in app | ❌ planned |

## 9. Staff consoles (unified app = website)

| Web (phone) | App | Status |
|---|---|---|
| `/owner` Owner Hub: KPIs (GMV, delivered, SLA, low stock), Orders Hub, Customers CRM, Staff Directory, Coupons, Theme engine | OWNER tabs: Everything (live queue, counters), Manager (dispatch lens), Staff (list + add + deactivate), Coupons (create + pause), Account | ✅ core ops · ❌ GMV/theme-engine screens remain web-first (complex forms; candidate for Phase 2) |
| `/manager` Kanban dispatch + rider assignment | Manager lens of OpsBoard: statuses grouped, one-tap advance, 10s live refresh | ✅ |
| `/packer` picking station | Packer lens: confirmed → packing → ready queue | ✅ |
| `/rider/dashboard`: shift toggle, stats, active delivery + OTP verify, accept available | Rider tab: identical features, same APIs | ✅ |
| `/owner/catalog` CRUD | Web-only (dense table editing) | ❌ deliberately web-first |

## 10. Legal / policy pages (store listing targets)

| Web | App | Status |
|---|---|---|
| `/privacy` `/terms` `/refund` `/delete-account` | Opened in system browser from Account + auth footer (single source of truth) | ✅ |

## Short-screen & keyboard safety (applies to every app screen)

- `AuthScreen`: LayoutBuilder + `minHeight` centering — scrolls when the keyboard opens or the screen is short; never clips.
- Bottom sheets (`_AddAddressSheet`, `_AddStaffSheet`, `_CreateCouponSheet`, product detail): `viewInsets` padding → they rise above the keyboard; `isScrollControlled` + `maxHeight` caps keep them scrollable on small phones.
- All scrollables use `AlwaysScrollableScrollPhysics` where pull-to-refresh exists.
- Notch/status bar: `SafeArea` on every tab body; NavigationBar handles bottom inset automatically.

## Remaining gaps (tracked)

1. Cart: cross-sell rail, tips, coupon UI, UPI/online payment methods, celebration animation.
2. Map-based address pin (LocationPicker parity).
3. Web-first owner tools: theme engine + catalog CRUD + customers CRM.
4. Resend-cooldown widget on app OTP step.
