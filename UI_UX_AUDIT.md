# SabQuick — Full UI/UX Design Audit

**Method:** Live production walkthrough at 390×844 (iPhone 14/15 class) and 1440×900, DOM measurements (tap-target sizes, WCAG contrast ratios computed per element, background-color census, font census), screenshot review of home/auth/cart flows, plus code-level review of all 11 Flutter screens and the staff web portals. Benchmarked against apple.com, samsung.com, gemini.com.

---

## 1. Executive summary

| Surface | Score /10 | One-line verdict |
|---|---|---|
| Website — mobile | **6.5** | Solid skeleton, but three competing accent colors, undersized tap targets, and a hero that pushes products below the fold |
| Website — desktop | **7.0** | Clean 1280px grid and sane typography; needs a real display typeface and quieter chrome |
| Flutter app | **7.5** | Newest + strongest surface (Neon Market system, custom fonts, neon/skew press); secondary screens still on the old look |
| Brand cohesion across all | **5.0** | Green storefront, purple/orange cart drawer, amber coupons, blue staff portals — four palettes in one product |

**Overall: 6.5/10** — a functional, decent-looking product one disciplined pass away from feeling premium. The single biggest win is not adding anything: it is **removing** — one accent color, one font pairing, one cart entry point.

---

## 2. What apple.com / samsung.com / gemini.com actually do (benchmark)

| Principle | Apple | Samsung | Gemini | SabQuick today |
|---|---|---|---|---|
| Accent colors per view | 1 | 1 | 1 | **3 (green/purple/orange)** |
| Font families | 1 (SF) | 1 (SamsungOne/Inter) | 1 (Google Sans) + system | 4+ system stacks (ui-sans-serif, Inter, font-black system stacks) |
| Font weights used | 2–3 (400/590/700) | 2–3 | 2–3 | **5–8 (500→900 everywhere)** |
| Background palette | 2 (white, #f5f5f7) | 2 | 2 (white, #f0f4f9) | **8+ distinct backgrounds** |
| Buttons | One pill style, one emphasis level | Same | Same | Filled + outline + ghost + gradient + colored variants mixed |
| Borders on cards | None — shadow/surface only | Minimal | None | 1px borders + shadows + colored rings mixed |
| Hero copy | ≤ 6 words | ≤ 6 words | ≤ 5 words | "Super Fast Delivery" + 3-line paragraph + search |
| Text smallest size | ~12px but never low-contrast | 12px | 12px | 10–11px at 4.34:1 contrast (fails WCAG AA) |

**The lesson from all three:** modern minimalism is *subtraction*. One accent. One family. Two backgrounds. Generous whitespace. Nothing shouts; hierarchy comes from size and weight, not color count.

---

## 3. Website — mobile (390×844), screen by screen

### 3.1 Home (`/`)
**Measured:** no horizontal overflow ✓ · bottom nav 65px ✓ safe-area ✓ · hero 261px · 38 tap targets, **9 below 40–44px** · 21/25 images lazy ✓ · sticky category nav ✓

| # | Finding | Severity |
|---|---|---|
| M1 | **Navbar logo clipped** — brand mark cut off at top-left (visible in screenshot). The brand is the first thing users see. | P0 |
| M2 | **Hero occupies 261px + category nav ≈ 65px + navbar 65px ≈ 390px — 46% of viewport** before any product. Blinkit shows products in ~1.5 screens because their hero is a thin banner; ours is a marketing panel with a 3-line paragraph. | P0 |
| M3 | **Search placeholder truncated** ("Search milk, bread, chips, c") — placeholder width not tuned to 390px. | P1 |
| M4 | **Tap targets < 44px**: "+ ADD" (32px h), "See All" (32), "Sign In" (32), "All Aisles" pill (32h), location chip (17px h!), a 24×24 icon button, category pills (34h). Apple HIG minimum is 44×44; Android 48dp. | P0 |
| M5 | **Location chip is 17px tall** — the single most important context element (where we deliver) is nearly untappable. | P0 |
| M6 | **Accent overuse**: `#00C853` (accent) appears 19× vs brand `#0B6E4F` 6×. The cart pill, hero badge, discount chips, ADD buttons all use accent — the brand color became the "disabled" color. | P0 |
| M7 | **Unit pills fail WCAG AA** — 17 instances of `#64748B on #F1F5F9` at 4.34:1 (needs 4.5). Small text, low contrast. | P1 |
| M8 | **"Shop by Category" tiles**: first tile is a generic icon (no image) while others have photos — inconsistent rhythm. "Baby Care — 1 item" exposes thin inventory publicly. | P2 |
| M9 | Category pills are ALL-CAPS 12px with icons — caps + icons + bold is three emphasis devices on one row; Apple uses sentence case and lets weight do the work. | P2 |
| M10 | Cart pill duplicates the bottom-nav cart (badge + total in both) — two identical CTAs stacked within 100px. | P1 |

### 3.2 Auth modal
| # | Finding | Severity |
|---|---|---|
| A1 | **Trigger confusion**: as a guest with an item in cart, tapping the cart tab opened the **auth modal** — I expected my cart. Blocking checkout behind login is right; hijacking the cart entry point is not. | P0 |
| A2 | Logo clipped in modal header (same asset issue as M1). | P1 |
| A3 | "INSTANT LOGIN" badge + "Recommended • 100% Free • Unlimited" + "⚡" — three trust devices on one button; modern refs use none. | P2 |
| A4 | "Free verification code will be generated for fast checkout" leaks internal mechanics (display-mode OTP) in user-facing copy. | P1 |
| A5 | Google button is outline style while mobile CTA is filled — reversed emphasis: the primary action (phone, works for everyone) looks secondary. | P2 |

### 3.3 Cart drawer
**Measured:** full checkout pipeline present — tips, coupons, 3 payment methods, bill summary, free-delivery progress ✓ (genuinely good completeness)

| # | Finding | Severity |
|---|---|---|
| C1 | **Completely different palette**: purple steppers/progress, orange badge + CTA, green map pin. The most transactional screen abandons the brand. | P0 |
| C2 | **"1 items"** — no pluralization. | P1 |
| C3 | CTA says "Pay Online ₹112" even when "Cash on Delivery" is selected (verified in DOM: radio unchecked but CTA unchanged). | P0 |
| C4 | Back arrow (←) + X side by side in header — two dismiss gestures; Apple uses one. | P2 |
| C5 | Recommended-items rail re-uses card component with different colors again (orange ADD buttons) — third accent inside one surface. | P1 |
| C6 | Coupon APPLY button disabled-state is a lighter purple — reads as "available" rather than disabled. | P2 |

### 3.4 Product cards
| # | Finding | Severity |
|---|---|---|
| P1 | Strong foundation: image, discount chip, 10-MINS chip, unit, title, price, ADD→stepper — right anatomy ✓ | — |
| P2 | "10 MINS" chip on **every** card is noise; the promise belongs to the brand header (once), not 40 repetitions. Blinkit puts delivery ETA on the card, but only as subtle text, not a high-contrast chip. | P1 |
| P3 | Discount chip (accent green) + speed chip (white) + unit pill — three chips stacked on one card competes with the product photo. | P2 |

### 3.5 Orders / tracking (code review)
- `deliveryOtp || "1234"` fallback still in orders page UI — shows a fake code if missing (**P1**, also security-adjacent).
- OTP digits in 8px boxes are nice; "Track Live on Map" CTA good.
- Orders list: status badges use green/amber/blue/gray — more accents; fine functionally, noisy visually.

### 3.6 Desktop (1440×900)
| # | Finding | Severity |
|---|---|---|
| D1 | 1280px max-width, 6-col product grid, bottom nav hidden ✓ — correct bones. | — |
| D2 | Same hero as mobile — desktop users see marketing copy before products; on desktop Blinkit shows a compact ribbon + aisle grid instantly. | P1 |
| D3 | System font stack (`ui-sans-serif`) for everything — no brand voice in type at all on web. | P1 |
| D4 | Desktop search is inside the hero panel only; sticky navbar search absent on scroll. | P2 |

### 3.7 Staff portals (owner/manager/packer/rider)
- Consistent dark-header pattern ✓, RBAC solid ✓.
- Bare "Back" labels — **fixed this session** (Hub/Close).
- Owner console is 3000-line tab page: heavy, but functional; not part of the customer experience score.

---

## 4. Flutter app — screen by screen

| Screen | Score | Notes |
|---|---|---|
| Splash | 8.5 | Real logo, staged animation, progress sweep — genuinely good |
| Auth | 8 | Display fonts + Quick Code banner + NeonPressable ✓; owner 6-digit fixed |
| Loading board | 8 | Full skeleton board ✓ matches modern refs |
| Home | 8 | Theme-aware header, tiles, rails, floating pill ✓ |
| Product card/detail | 8 | New design language, ADD→stepper spring ✓ |
| **Cart** | 6.5 | Functional but not restyled to v3; address picker is a horizontal chip scroller (weak for >2 addresses) |
| **Orders** | 6.5 | Old look; no status color system; no empty-state illustration |
| **Tracking** | 7 | Animated stepper is nice; polls every 6s instead of SSE; no map |
| **Rider dashboard** | 7 | Solid feature set (shift toggle, stats, OTP verify); v2 visuals |
| **Staff queue** | 7 | Same — good feature, old skin |
| Account | 7.5 | Clean rows; address management punts to web ("not available in app") |

**App-wide gaps:** no image caching (re-fetches product photos every launch — data + speed), no dark mode (all three reference sites ship one), no haptic differentiation between add-to-cart vs navigation, cart pill doesn't animate between tab switches, no screen-to-screen shared-element transitions (product image → detail).

---

## 5. Color system critique

**Current state (measured):** 8+ backgrounds, 3 competing accents on mobile web, accent outrunning brand 19:6, functional colors (amber/orange/purple) introduced ad-hoc per component rather than from tokens.

**Verdict: 5/10.** The raw ingredients are good — deep racing green is distinctive (nobody in q-commerce owns dark green), and the app's lime `#C8F531` is genuinely modern. The failure is **governance**: every component invents its own emphasis color.

**Prescription (one page, enforced in code):**
```
Brand      #0B6E4F   — primary buttons, active states, links, header surfaces
Accent     #C8F531   — ONE highlight: ADD buttons, progress, badges (small doses)
Ink        #0D0F12   — text, dark surfaces (cart pill, splash)
Fog        #F7F6F2   — app background (single)
Card       #FFFFFF   — all cards (single)
Danger/Success/Amber — reserved for status ONLY, never decoration
```
Rule borrowed from the reference sites: **if a color is not doing one of those jobs, it does not appear.** Orange belongs to Swiggy; purple belongs to PhonePe. SabQuick should be unmistakably green+lime in every pixel.

---

## 6. Typography critique

**Current state:** web = system stack with weights 500–900 sprayed across components (26 buttons at 12px, many at w900); app = Space Grotesk + Inter (right idea, half-applied).

**Verdict: 6/10 web, 7.5/10 app.**

Against the refs:
- All three use **one family, 2–3 weights**. Weight (not size, not color) creates hierarchy.
- **Display sizes are huge and confident** (apple.com h1 ≈ 48–80px). Ours are timid (22–30px) while body copy is relatively large.
- **Letter-spacing tightened on display** (-0.02em) — ours does this in the app, not web.
- Caps usage: refs use sentence case nearly everywhere; we use ALL-CAPS micro-labels in 12+ places.

**Prescription:**
```
Web: bundle Inter (400/600/800) + Space Grotesk (700) — same as app, one identity
Scale: 12 / 14 / 17 / 22 / 28 / 40 (display), line-height 1.1–1.5
Weights: 400 body · 600 emphasis · 800 display — retire w900 and 6 caps styles
```

---

## 7. Motion & interaction critique — **7/10**

App leads (NeonPressable skew+glow is genuinely unique, ADD→stepper spring, splash choreography, skeleton shimmer). Web lags: CSS `active:scale-95` on some buttons only, no page transitions, no shared elements, drawer lacks drag-to-dismiss (and possibly a dismiss bug — see C7 below).

**Missing everywhere:** cart-add fly-to-cart animation (the single most satisfying q-commerce interaction), skeleton → content crossfade, pull-to-refresh on web mobile.

---

## 8. Prioritized fix roadmap

### P0 — do these first (trust + usability)
1. **Unify color**: cart drawer → green/lime/ink (kill purple+orange); accent-to-brand ratio inverted (brand leads)
2. **Fix tap targets**: all interactive elements ≥44px (ADD 32→44, See All, Sign In, location chip 17→44, icon buttons 24→44)
3. **Fix navbar/modal logo clipping** (asset overflow in 40px box)
4. **Cart CTA label follows payment method** (COD → "Place Order", UPI doorstep → "Place Order", online → "Pay ₹X")
5. **Guest cart tap → cart drawer**, not auth modal (auth gate at checkout step instead)
6. **Hero diet**: mobile hero ≤150px (badge + one line + search); move paragraph to desktop only

### P1 — this month
7. Web typography: bundle Inter + Space Grotesk, retire w900/caps noise, fix 17 AA contrast fails (unit pills → `#47546A`)
8. "10 MINS" chip → subtle text or remove from cards (brand header carries it)
9. Remove cart pill/bottom-nav duplication (keep bottom nav as the single cart surface + keep floating pill only when scrolled deep)
10. "1 items" pluralization; remove `|| "1234"` OTP fallback in orders UI
11. App: apply v3 design to cart/orders/tracking/rider/staff screens
12. App: image caching (cached_network_image) + cart-add fly animation

### P2 — polish
13. Dark mode (app first, web second) — all three refs ship one
14. Location chip becomes a proper 44px pill with chevron (it's the geofence entry point)
15. Category tile images for all parents (no icon fallback in first row); hide "1 item" parents until ≥5 items
16. Desktop: sticky search in navbar, compact hero ribbon
17. Product detail sheet: shared-element image transition (app), quantity Stepper in web modal matches ADD morph
18. SSE for app tracking (already built server-side) instead of 6s polling

### Verification bug worth checking
- Cart drawer resisted synthetic Escape/overlay/X dismissal in the embedded browser (3 attempts). May be a test-environment artifact — **manually verify on a real phone that the X closes the drawer**; if not, that's a P0.

---

## 9. Scorecard after P0 (projected)

| Surface | Now | After P0 | After P0+P1 |
|---|---|---|---|
| Website mobile | 6.5 | **8.0** | 8.5 |
| Website desktop | 7.0 | 7.5 | 8.5 |
| Flutter app | 7.5 | 8.0 | 9.0 |
| Brand cohesion | 5.0 | **8.5** | 9.0 |
| **Overall** | **6.5** | **8.0** | **9.0** |

The 9.0 state is reachable without new features — it is one color system, one type system, one size system, applied everywhere, with everything else removed.
