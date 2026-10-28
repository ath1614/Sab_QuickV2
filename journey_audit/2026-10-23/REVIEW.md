# Signed-in review — 23 Oct 2026

Reviewer account credentials are not stored in the repository; provision them per review and revoke afterwards. Run against the live site
`https://srv1985371.hstgr.cloud`, plus a local dev server for the one fix.

Devices: phone `390×844`, tablet portrait `820×1180`, laptop `1180×820`.

## What passed

| Journey | Result |
|---|---|
| Customer: sign in → home → search → product sheet → add to cart → cart drawer → delivery address + map → save address → payment chooser | 8/8 steps, 0 horizontal overflow, 0 console errors at 390; 7/7 at 820 and 1180 (chooser added after those runs) |
| Payment chooser | `Pay via UPI (GPay, PhonePe, Paytm) & Cards` (Cashfree, "Instant verified"), `UPI at Delivery`, `Cash on Delivery` |
| Owner: overview, orders, customers, staff, coupons, theme, catalog, riders | 12/12 routes render at 390 / 820 / 1180, 0 overflow |
| Ops: `/manager`, `/packer`, `/rider`, `/rider/dashboard` | render and sign in at 390 / 820 / 1180, 0 overflow |
| Standing pages: `/orders`, `/delete-account`, `/privacy`, `/terms`, `/refund`, `/rider/apply` | 390 / 820 / 1180, 0 overflow |
| `/offline` | 200, renders the connection-lost copy, 0 overflow (verified standalone; the batch harness closed its browser on the last step) |

The reviewer account is provisioned as customer + owner + manager + rider, so every
console is reachable with the credentials in the review notes.

Failed network entries in the reports are `net::ERR_ABORTED` from navigating away
mid-fetch, not server errors. `/api/products` answers 200 in ~2.3 s.

## Bug found and fixed

`/owner?tab=customers` overflowed 11 px at 820 (tablet portrait): the "Customer GMV"
card was the fourth column of an `md:grid-cols-4` KPI grid, so the amount was clipped
at the right edge (`₹11,579.83` rendered as `₹11,579.`).

Fix in [OwnerCustomersTab.tsx](../../components/owner/OwnerCustomersTab.tsx):

- KPI grid is now `grid-cols-2 lg:grid-cols-4`, with `min-w-0` on the labels so the
  amount can shrink. Tablets get 2×2 cards.
- The customers table / touch-card switch moved from `md` to `lg`, so at 820 the
  touch cards show full-width actions instead of a horizontally-scrolled table.

Verified on the local dev server at 390, 820 and 1180: 0 overflow, GMV fully visible,
actions reachable. **Not yet deployed** — production still shows the clipped card
until this commit reaches `main` (CI deploy) or the VPS is redeployed.

## Smaller findings (not blocking)

- 6–7 catalog thumbnails out of 1,529 products return 403 (BigBasket/Kellogg's
  hotlinks). They fall back to the initials tile; a sample of 81 other image URLs
  loaded fine. Cosmetic, fixable in data.
- Homepage is still on the **Christmas Cheer** theme in late October ("Merry Christmas
  — Holiday Treats Delivered"). Switch the Theme & Branding preset before capturing
  store screenshots.
- The bottom CTA keeps reading "Select Payment Method" while the method list is open.
- No live payment was completed (that would create a real order and charge). The
  Cashfree server paths are present and correct in code; they are untested end-to-end
  from this review.

## Cashfree go-live checklist status

| Item | Status |
|---|---|
| Env vars for app id/secret, no hardcoded keys | Pass (`CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`, mode defaults to production) |
| Backend is source of truth | Pass — `/api/payments/cashfree/verify` queries Cashfree payments, checks amount, only then marks PAID |
| Webhook signature over raw body | Pass — HMAC-SHA256 of `timestamp + rawBody`, 401 on mismatch in production |
| Webhook idempotency | Pass — skips orders already PAID |
| Return URL | Pass — `${origin}/pay/verify?order_id=…`, live 200 |
| Domain / app whitelisting | **Unverified** — must be confirmed in the Cashfree dashboard for `srv1985371.hstgr.cloud` and the `com.sabquick.app` / iOS bundle ids |
| KYC + production keys on the VPS | **Unverified** — only a dashboard/VPS check can confirm |
| Webhook URL registered in production dashboard | **Unverified** |
| Sandbox → production payment end-to-end | **Not tested** (no real charge made) |
| Dead code / test data | Mock paths are gated to `NODE_ENV !== "production"`; no test VPAs or cards in the repo |

Verdict: the app looks correct for review — sign-in, browsing, cart, address, payment
chooser, owner and ops consoles all work at phone / tablet / laptop widths. It is not
"done": deploy the tablet fix, confirm the unverified Cashfree dashboard items, and
complete one real (or sandbox) payment before treating payments as live.
