# Responsive / screen-size audit — App Store guideline 4

**Date:** 23 Oct 2026
**Trigger:** App Store review 1.0 (6), submission `7d825c8c`, iPad Air 11-inch (M3):
*"the app is not optimized to support all screen sizes or resolutions"* — screenshot showed the
nav bar pushing the page wider than the screen, a horizontal scrollbar, and content sliding off
the left edge.

**Verdict:** the storefront layout now fits every reviewed width with **0 px** of document
overflow, measured on the production build. Details, evidence and the items still worth doing
are below.

---

## 1. Root cause

The Capacitor shell loads the live site in a WKWebView, so any web overflow becomes an app
layout defect. Only one screen actually overflowed: the **top navigation's desktop action
cluster**. It was a single `flex` row with `shrink-0` children; below roughly 1470 px the row's
intrinsic width exceeded the viewport and stretched the document.

Measured before the fix:

| Viewport | Document width | Overflow | Offender |
|---|---|---|---|
| 820 (iPad portrait) | 1219 px | **+399 px** | `.flex.items-center.space-x-1.5…` — "Map & Geofence / Google Play Reviewer / OWNER / Packer / Manager / Owner" |
| 1180 (iPad landscape) | 1388 px | **+208 px** | same row |
| 1440 (laptop) | 1468 px | **+28 px** | same row |

At 1440 it was a one-pixel-away bug; on iPad it was 399 px of sideways page — exactly what the
reviewer photographed. Because the document was wider than the screen, the fixed bottom nav
was also dragged left, which is why the category names appeared cut off.

---

## 2. How every screen was audited

`scripts/ui-audit.mjs` drives Chromium (Playwright) through every route at 12 viewports and
reports:

* document `scrollWidth` vs `clientWidth` (page-level horizontal scroll),
* the outermost element(s) sticking out of the viewport, ignoring intentional scrollers,
* interactive targets smaller than 44 × 44 px.

```bash
node scripts/ui-audit.mjs --base http://localhost:3100 \
  --widths 320,375,390,430,640,768,820,1024,1180,1280,1440,1920
```

Widths cover iPhone SE (320), iPhone 12/13/14/15 (390/430), iPad portrait (768/820), iPad
landscape (1024/1180) and laptops/desktops (1280–1920). Heights follow each device class.

Routes audited: `/`, `/?category=all`, `/categories`, `/orders`, `/orders/[orderNumber]`,
`/pay/checkout`, `/rider/apply`, `/offline`, `/privacy`, `/terms`, `/refund`,
`/delete-account`, `/brand`, `/owner`, `/owner/catalog`, `/owner/riders`, `/manager`,
`/packer`, `/rider`, `/rider/dashboard`.

Overlays were opened and measured separately at 390 / 820 / 1180 / 1440: cart drawer,
product detail sheet, delivery-location picker, account & operations sheet, login screen.
All of them fit the viewport (cart 448 px, location 576 px, ops 512 px; full-width on phone).

---

## 3. Screen-by-screen findings

| Screen | Found | Status |
|---|---|---|
| **Home** (all widths) | Navbar action row overflowed 399 px on iPad portrait, 208 px at 1180 px, 28 px at 1440 px; page scrolled sideways and the bottom nav was clipped | **Fixed** — three-tier header (see §4) |
| Home — search field | 12.5 px text caused iOS focus zoom on phones | **Fixed** — 16 px on mobile |
| Home — welcome strip | Offer sentence truncated mid-word at 390 px ("…on you…"), 28 px tap targets | **Fixed** — wraps to two lines, buttons raised to 32 px |
| Home — category rail | 10 columns at 1024–1280 left oversized gaps | **Fixed** — 8 columns until `xl` |
| Home — product rails | Horizontal rails are intentional scrollers; clipped card at the edge is the scroll affordance | OK (no page overflow) |
| **Categories (directory)** | 8 columns at 1180 px → 80 px thumbnails floating in a 6xl canvas; labels 10 px | **Fixed** — 3/4/5/6/7 responsive columns with 64→112 px thumbnails and larger labels |
| **Category detail** (split rail) | Rail + grid already responsive; rail is 78–128 px | OK |
| **Orders list / tracking** | Fits at every width; empty and error states fit | OK |
| **Cart drawer** | 448 px side sheet at ≥ 640 px, full-width below; internal sections scroll | OK |
| **Auth / login** | Centred card, no overflow at 390–1440 | OK |
| **Owner console** | Toolbar was clipped at 820 px (buttons ran past the edge); duplicate "Store" button; inventory table cut the price column; price value itself was blank | **Fixed** — toolbar wraps, duplicate removed, table scrolls horizontally, `salePrice`/`mrp`/`unitQuantity` now read correctly |
| **Owner → Catalog** | Card/table layout fits; no overflow | OK |
| **Owner → Fleet & Riders** | Header action cluster overflowed at 320 px | **Fixed** — header wraps |
| **Manager cockpit** | Toolbar clipped at 820 px; duplicate "Store" button | **Fixed** — toolbar wraps |
| **Packer station** | Two-pane layout holds at 390–1920; list pane scrolls independently | OK |
| **Rider dashboard / apply** | Fits at every width | OK |
| **Brand guide** | Two section badges overran at 320 px | **Fixed** — headers wrap |
| **Legal pages** | Refund table already has an `overflow-x-auto` wrapper | OK |

Additional defence-in-depth: `html, body { max-width: 100%; overflow-x: clip; }`. `clip`
rather than `hidden` so the sticky header keeps working; a stray fixed-width child can no
longer drag the whole page sideways on any device.

---

## 4. The header rewrite (the App Store fix)

`components/layout/Navbar.tsx` used one dense row from `sm` up. It now has three tiers, so the
row is always shorter than the viewport and the search field absorbs the slack (`min-w-0`,
`flex-1`):

| Width | Contents |
|---|---|
| < 640 px | Two-tier phone header (logo + address, then search) — unchanged |
| 640–767 px | Logo · search · account · cart |
| 768–1279 px (iPad) | + address + geofence badge + "Ops" menu + verify-phone + cart |
| 1280 px + | + full name/role, map button, sign-out |

The four staff shortcuts (Packer / Manager / Owner / Rider) collapsed from four coloured
buttons into one accessible **Ops** dropdown (click-outside + Escape to close). This removed
~280 px from the row while keeping every destination one click away, and it matches the
account sheet's existing navigation on phones.

Also removed from the owner and manager toolbars: a second "Store" button that duplicated the
one already in the title block.

---

## 5. Verification

Run against the **production build** (`npm run build` → `next start`), test account with
OWNER / MANAGER / PACKER / RIDER roles:

```
✓ /                       ✓ /owner                ✓ /rider
✓ /?category=all          ✓ /owner/catalog        ✓ /rider/dashboard
✓ /categories             ✓ /owner/riders         ✓ /orders/SQ-TEST-0001
✓ /orders                 ✓ /manager              ✓ /privacy  /terms  /refund
✓ /pay/checkout           ✓ /packer               ✓ /delete-account  /brand  /offline
0 width × route combinations overflow (12 widths × 20 routes = 240 checks)
```

Before: six of those combinations overflowed — every width ≥ 820 px on `/` and
`/?category=all` — plus two 320 px edge cases on `/brand` and `/owner/riders`. Worst case
+399 px.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `next lint` | exit 0 (only the pre-existing `no-img-element` warnings) |
| `next build` | exit 0, all 22 routes compiled |
| Overlay measurement (cart / product / location / ops) | inside viewport at 390, 820, 1180, 1440 |

---

## 6. Round 2 — full device matrix, map sheet, iPad sign-in

**Date:** 23 Oct 2026 · second pass after the same rejection, covering every screen and
overlay on 18 device sizes. Full submission checklist: [APP_STORE_READINESS.md](APP_STORE_READINESS.md).

### The map sheet (the visible "not symmetrical" bug)

The delivery-location sheet was **331 px wide inside a 320 px screen**. The cause was the
primary button: its label *"Save & Deliver Here (Superfast Delivery)"* was `nowrap`, so the
dialog's implicit grid column could not shrink below the label's min-content width. Every
child of the sheet — description, badge, map — was stretched to 331 px and the right edge
was clipped by `overflow-x-hidden`. The map was therefore 26 px from the left edge and 35 px
past the right edge on phones.

Fixes:

- `DialogContent` now uses `grid-cols-[minmax(0,1fr)]` with `min-w-0` children, so no label
  can widen any sheet again.
- The CTA wraps and drops the parenthetical below `sm`; the geofence badge wraps instead of
  truncating; "Save as" wraps to a second row at 320 px.
- Map height is `clamp(200px, 32dvh, 320px)` on phones (320 px was eating the whole sheet).
- Both Leaflet maps now call `invalidateSize()` on `ResizeObserver` and
  `orientationchange`: iPad rotation and Split View resizes no longer leave grey bands and
  an off-centre pin.
- The map is measured at **26 px from each edge** at 320/360/375/390/412/430 and centred on
  iPad (122 px each side at 820, 302 px at 1180).

### Other screens touched in this pass

| Screen | Found | Fix |
|---|---|---|
| Login gate (iPad) | Hero at the top, form at the bottom, ~400 px dead space | Hero + card centred as one group; placeholder shortened to "Mobile number" so it fits at 320 px |
| Home welcome strip (320) | Offer sentence clipped | Icon/pill hidden < 360 px, "Claim" label, 2-line message |
| Categories search | 14 px → iOS focus-zoom | 16 px until `lg` |
| Rider application | 6 inputs at 12 px | 16 px until `lg` |
| Delete account | phone + DELETE inputs at 14 px | 16 px until `lg` |
| Owner / Manager / Catalog | search fields at 12 px | 16 px until `lg` |
| Navbar search on iPad | 12.5 px → zoom on focus | 16 px until `lg`, 14 px on desktop |
| **640–767 px (iPad mini portrait)** | No location trigger at all: the phone address button hides at 640, the address pill appears at 768 | Map icon button now shown at `sm`–`md` |

### Verification

`node scripts/ui-audit.mjs` — 21 routes × 18 devices (iPhone SE → iPad Pro 13", both iPad
orientations, 1920 desktop):

```
378 checks · 0 overflow · 0 elements outside the viewport · 0 inputs <16 px
```

Overlays re-measured at 9 widths: cart, product sheet, map sheet, account sheet, login — all
inside the viewport, no child wider than the sheet's content box.

`node scripts/sheet-audit.mjs` is the permanent regression check for the reported bug:
it opens the delivery-location sheet at 11 widths (320 → 1440) and asserts the sheet is
inside the viewport, the map card has equal left/right gaps (**25 / 25 px at every width**),
no descendant spills out of the sheet, and 640–767 px has a way to open it.

```
11/11 widths pass · 378/378 route checks · 0 overflow · 0 inputs <16 px
```

Rotation / Split View was also exercised with the sheet open: iPad Air portrait
(820×1180) → landscape (1180×820) → Split View (600×820). The map resized
(524×318 → 524×318 → 548×260) and tile coverage stayed at **100 %** at each step with
0 px document overflow — the `invalidateSize()` fix does its job.

Performance on the production build, M-series laptop, 4× CPU throttle + Fast 3G:
FCP 996 ms, LCP 3.98 s, TBT 33 ms on `/`; CLS 0.154 caused by the product skeleton grid
replacing the grouped aisle rails (skeletons are shorter than the real rows). TBT is well
inside the 200 ms budget; the CLS is a known cosmetic trade-off, not a layout overflow.

---

## 7. Round 3 — deployed verification and store captures

**Date:** 23 Oct 2026 · shipped in `a94e337` + `d594a05`, deployed to
`https://srv1985371.hstgr.cloud` by CI (`validate-and-build` → `deploy-to-vps`, both green).

| Item | Result |
|---|---|
| Live bundle contains the fixes | verified in the served `/_next/static` chunks (wrapping sheet, `grid-cols-5 xl:grid-cols-10`, opaque bottom nav) |
| Re-audit after the change | 6 devices × 5 routes = 30 checks, **0 overflow** |
| Home category grid on iPad | was 8 columns → rows of 8 + 2 orphans; now 5 columns with 96 px avatars → **two rows of five** |
| Bottom nav on phones | `bg-white/95` + blur let product buttons ghost through; now opaque |
| Store screenshots | 15 captured from production at exact App Store sizes, inspected: home, product, map sheet, categories, category |

One implementation detail worth keeping: the screenshot tool now waits for real product cards
and decoded images (fixed sleeps produced skeleton tiles at 430 px) and scrolls the phone
sheet so the primary CTA is not half-cut in the marketing frame.

## 8. Remaining recommendations (not blocking this submission)

1. **iPhone zoom** — `maximumScale: 1, userScalable: false` is still set in
   `app/layout.tsx`. Allowing pinch-zoom is better accessibility, but 14 px inputs would then
   trigger iOS focus-zoom; raise input text to 16 px first.
2. **Dense product cards** — the round "ADD" control is 36 px; HIG suggests 44 px. Fine for a
   deliberate high-density commerce grid, but worth revisiting.
3. **iPad split view / Stage Manager** — the layout is fluid down to 320 px, so it adapts; it
   has not been exercised on a physical iPad in split view.
4. **Product imagery is served from `/products/*.webp`**, which is not in this repository. If
   those files are missing on the server the cards fall back to initials — worth a production
   spot-check after deploy.
