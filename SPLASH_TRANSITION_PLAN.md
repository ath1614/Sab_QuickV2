# SabQuick — Splash → Storefront / Login Motion Plan

**Status:** core boot sequence implemented. The mark is static (no mask wipe or FLIP) so the native launch image cannot visibly re-enter; the reveal is the paper sheet lift plus destination fade. Storefront hero glow removal and native paper assets are in place.

**Remaining polish:** destination 8 px rise, rule-to-header hand-off, focus hand-off, and boot performance marks.
**Scope:** cold-start launch frame, web splash, the hand-off into either the storefront or the login view, and the storefront's visual language.
**Reference:** the splash image referenced in the request was not available in this workspace, so §2 is a proposed direction built from the current brand assets. Re-attaching the reference will only change geometry and timing, not the architecture.

---

## 1. What exists today

| Surface | Implementation | Problem |
|---|---|---|
| iOS launch | [LaunchScreen.storyboard](ios/App/App/Base.lproj/LaunchScreen.storyboard) shows a full-bleed `2732×2732` image | The logo's position and scale are baked into the bitmap, so it cannot line up with the web splash. |
| Android launch | [styles.xml](android/app/src/main/res/values/styles.xml) uses `android:background=@drawable/splash` on a legacy `Theme.SplashScreen` | Android 12+ ignores most of this and shows the launcher icon first; the full-bleed `480×320` drawable then appears at a different scale. |
| Capacitor | no `@capacitor/splash-screen` dependency or config | The OS hides its launch screen whenever it wants; the white WebView then shows the page before the web splash mounts. |
| PWA | [manifest.json](public/manifest.json) `background_color` is `#0B0F19` | Dark flash before a white splash. Three different launch colours across iOS, Android and PWA. |
| Web splash | [SplashScreen.tsx](components/brand/SplashScreen.tsx): 1.2 s fixed, white overlay, blurred emerald glow, shimmer sweep, pulsing dot, hairline progress bar, `zoom-in-90` | This is the "AI-generated" read: decorative effects that do not describe the product, and a fake progress bar that is not tied to loading. |
| Mount timing | `showSplash` is set in a `useEffect` in [page.tsx](app/page.tsx#L273) | The storefront/login paints first, then the splash appears — the opposite of a splash. |
| Exit | overlay fades/scales to 105% and unmounts | Content underneath never animates in, and the destination is decided independently while `useSession()` is still `loading`. |
| Storefront | dark hero with two blurred glow circles and a gradient overlay ([page.tsx](app/page.tsx#L520)) | Uses a different visual language from the splash, and repeats the same glow treatment. |

The net effect is **four cuts**: native image → white WebView → splash → destination. The goal is one continuous sequence.

---

## 2. Proposed direction — "The Shelf Line"

A quiet, physical, grocery-brand sequence rather than a SaaS loading screen.

**Palette** (already in the repo)

| Token | Value | Use |
|---|---|---|
| Paper | `#F7F6F2` (`sqFog`) | launch + splash canvas |
| Ink | `#0B0F19` | wordmark, primary type |
| SabQuick green | `#0B6E4F` | the single rule, primary actions |
| Fresh accent | `#00C853` | one small dot / status only, never glows |

**Motion idea**

1. The screen is already paper-coloured when the app opens, with the SabQuick mark centred — no logo pop, no glow.
2. A single 2 px emerald rule draws left-to-right beneath the mark. It is the only moving line.
3. The wordmark is revealed by a hard mask wipe (bottom-to-top), not a zoom or a shimmer.
4. The rule then travels upward and becomes the storefront header hairline, while the mark moves to the header/login position. The destination fades and rises 8 px underneath.
5. Nothing loops. No shimmer, no pulsing dot, no progress bar, no blurred blobs.

This reads as a packaging system: paper, ink, one green rule, the product photography does the colour work.

---

## 3. Storyboard and timings

Times are from **first web paint**, not from process start.

| t (ms) | Event | Notes |
|---|---|---|
| native | OS launch screen: paper background + centred mark | Must match the web splash's first frame exactly. |
| 0 | Web splash paints. Mark is already at its final centre position; rule width `0`. | No entrance animation for the mark; it was already on screen natively. |
| 80–380 | Rule draws `scaleX(0 → 1)`, `cubic-bezier(.2,.8,.2,1)` | 300 ms, one property, GPU-only. |
| 220–520 | Wordmark mask reveals bottom-to-top; 6 px rise, 300 ms | `clip-path: inset(100% 0 0 0)` → `inset(0 0 0 0)`. |
| 380–620 | Destination decision resolves (auth status + theme) and the destination is made interactive | Under the overlay, `aria-hidden` + `inert` until reveal. |
| 520–560 | 40 ms hold — the "settle" beat | Prevents the sequence feeling rushed. |
| 560–860 | Reveal: overlay paper panel lifts as one sheet (`clip-path: inset(0 0 0 0)` → `inset(0 0 100% 0)`), destination fades 0→1 and rises 8 px → 0 | 300 ms, `cubic-bezier(.22,1,.36,1)`. |
| 860 | Splash unmounts; destination owns the screen | Total ≈ 860 ms. Hard cap 1.6 s if the network stalls. |

**Reduced motion:** skip the rule/wipe; 120 ms opacity crossfade, no transforms.
**Warm start:** splash is skipped (`sessionStorage` already set); direct route transition uses the same 8 px rise.

The logo hand-off uses a FLIP: measure the splash mark and the destination anchor (`data-boot-logo` on the login logo and navbar logo), animate a fixed-position clone between the two rects with the Web Animations API, then swap. If `prefers-reduced-motion` or the anchor is missing, fall back to the sheet lift.

---

## 4. Architecture

### 4.1 One owner for the boot state

New `components/brand/BootGate.tsx`:

```tsx
type Phase = "booting" | "revealing" | "done";

// Minimum time the brand beat needs, maximum time we are willing to block.
const MIN_BOOT_MS = 560;
const MAX_BOOT_MS = 1600;

// Destination is derived once and passed down; it must not change mid-reveal.
type Destination = "storefront" | "login" | "prelaunch";
```

Rules:

- The destination is computed from `useSession().status`, `guestBypass`, `theme.isStoreLive`, and staff roles — the same conditions currently in [page.tsx](app/page.tsx#L453).
- `BootGate` reveals only when `status !== "loading"` **and** `elapsed >= MIN_BOOT_MS`, or at `MAX_BOOT_MS` regardless.
- While `booting`, the destination renders underneath with `inert` and `aria-hidden="true"`, so images/fonts are warm and there is no second layout pass at reveal.
- `BootGate` replaces the three separate `{showSplash && <SplashScreen/>}` mounts in `page.tsx` (pre-launch, unauthenticated, storefront).

### 4.2 No flash before hydration

`sessionStorage` cannot be read during SSR. Add a tiny inline script in [layout.tsx](app/layout.tsx) `<head>`:

```html
<script>
  try {
    if (!sessionStorage.getItem("sq_splash_seen")) {
      document.documentElement.dataset.booting = "1";
    }
  } catch {}
</script>
```

`globals.css` paints a static paper frame with the mark when `html[data-booting="1"]` is present, so the first painted frame is the splash — not the storefront. React hydrates the animated version on top of the same geometry, then removes the attribute. The React splash remains the source of truth for the animation.

### 4.3 Native → web continuity

1. Add `@capacitor/splash-screen` and configure it in [capacitor.config.ts](capacitor.config.ts):

```ts
plugins: {
  SplashScreen: {
    launchAutoHide: false,
    launchShowDuration: 0,
    backgroundColor: "#F7F6F2",
    androidSplashResourceName: "splash",
    showSpinner: false,
  },
},
```

2. The web splash calls `SplashScreen.hide({ fadeOutDuration: 0 })` after its first painted frame (in a `requestAnimationFrame`), so there is no white gap and no double fade.
3. iOS: replace the full-bleed bitmap with a centred mark (about 120 pt) on `#F7F6F2` in the storyboard, and regenerate `Splash.imageset` for 1x/2x/3x.
4. Android 12+: add `values-v31/styles.xml` with `windowSplashScreenBackground = #F7F6F2`, `windowSplashScreenAnimatedIcon = @drawable/ic_splash_mark` (vector), `postSplashScreenTheme = @style/AppTheme.NoActionBar`. Keep the legacy drawable for API < 31.
5. PWA: set `background_color` to `#F7F6F2`, keep `theme_color` `#0B6E4F`.

The launch mark must be an **SVG/vector** asset (`public/brand/splash-mark.svg`) so iOS, Android and web cannot drift.

### 4.4 Storefront alignment

The splash is the brand frame; the storefront should inherit it rather than introduce a second style.

- Remove the two blurred glow circles and the dark gradient overlay from the hero ([page.tsx](app/page.tsx#L520)); use the campaign photo full-bleed with a single bottom scrim for legibility.
- Use the emerald hairline as the section divider and as the header rule — the same element that draws in the splash.
- Paper canvas (`#F7F6F2`) behind the catalogue; white only for cards that need elevation.
- One shadow scale, no `blur-3xl`, no `animate-pulse`.
- First catalogue section enters with a single 200 ms, 8 px rise after reveal; no per-card stagger.
- Header logo gets `data-boot-logo` and crossfades from the splash mark; no second logo animation.

---

## 5. File-by-file checklist

| File | Change |
|---|---|
| `components/brand/SplashScreen.tsx` | Rewrite to the rule + mask + FLIP sequence. Remove glow, shimmer, ping, progress bar, `Zap` pill. |
| `components/brand/BootGate.tsx` *(new)* | Own phase, min/max timing, destination derivation, `inert` handling, FLIP hand-off. |
| `app/page.tsx` | Replace the three splash mounts with one `BootGate`; move destination conditions into the gate; remove glow circles from the hero. |
| `app/layout.tsx` | Inline pre-hydration boot script; preload `splash-mark.svg`; keep fonts as-is (already self-hosted, no layout shift). |
| `app/globals.css` | Boot frame, keyframes for rule draw, mask reveal, sheet lift, reduced-motion overrides. |
| `components/auth/LoginView.tsx` | Add `data-boot-logo` to the logo, entrance class, `pb-safe` consistency. |
| `components/layout/Navbar.tsx` | Add `data-boot-logo` to the header logo, hairline rule. |
| `capacitor.config.ts` | SplashScreen plugin config. |
| `package.json` | `@capacitor/splash-screen`. |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard` + `Assets.xcassets/Splash.imageset` | Centred vector mark on paper. |
| `android/app/src/main/res/values/styles.xml`, `values-v31/styles.xml`, `drawable/ic_splash_mark.xml` | Android 12+ splash theme, paper background. |
| `public/manifest.json` | `background_color: #F7F6F2`. |
| `public/brand/splash-mark.svg` *(new)* | Single source of truth for the launch mark. |

---

## 6. Acceptance criteria

1. **No flash:** a cold start on iOS, Android, PWA and desktop web never paints storefront or login before the splash. Verified with a 240 fps screen recording, frame by frame.
2. **Continuity:** native launch frame and web splash share background colour and mark centre; measured ΔE ≤ 2 for colour and ≤ 1 px for centre on iPhone 13, Pixel 7 and a 1440 px desktop viewport.
3. **Two destinations:** splash → storefront (guest/authenticated) and splash → login (unauthenticated) both complete in ≤ 900 ms after JS is ready; no intermediate white frame.
4. **No layout shift:** CLS 0 for the transition; the destination is mounted and measured before reveal.
5. **Performance:** no long task > 50 ms during boot; animation is transform/opacity/clip-path only; 60 fps on a mid-range Android device.
6. **Slow network:** splash never blocks longer than 1.6 s; if data is still loading, the destination shows its existing skeletons.
7. **Reduced motion:** `prefers-reduced-motion: reduce` produces a 120 ms fade with no movement.
8. **Repeat visits:** warm start skips the splash and uses the 8 px rise for route changes; back/forward does not replay it.
9. **Accessibility:** splash has `role="status"` and an accessible name; destination is `inert` until reveal; focus lands on the login phone field or the storefront search after reveal.

---

## 7. Risks and rollback

- **Scope creep into a storefront redesign.** The motion work is independent of the hero/catalogue restyle; ship the boot sequence behind `NEXT_PUBLIC_BOOT_V2` first, then align the storefront in a second pass.
- **Native asset drift.** Use one vector mark and one paper token; generate the iOS/Android bitmaps from it in CI or a script.
- **Analytics/measurement.** Add `performance.mark("boot:start")`, `boot:reveal`, `boot:done` so regressions are visible.
- **Rollback:** the flag restores the current `SplashScreen`; no schema or API change is involved.

---

## 8. Open question

The referenced splash image is not in this workspace. If it is a specific layout or motion reference, re-attach it before implementation; only §2–§3 geometry and easing need to change, not the architecture.
