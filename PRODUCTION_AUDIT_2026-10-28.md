# SabQuick — Production Readiness & Security Audit

**Date:** 28 October 2026  
**Scope:** Next.js 14 storefront, 52 API route files, Prisma/PostgreSQL, Redis, Cashfree + Razorpay payments, Capacitor Android/iOS apps, Docker/Caddy deployment, GitHub Actions.  
**Mode:** Read-only audit. No application code was changed.

---

## 1. Executive verdict

**SabQuick is not production-ready and should not process live payments in its current state.**

The application builds and the happy-path UI is in good shape, but there are multiple release-blocking defects:

1. **Any logged-in customer can mark an unpaid order as paid** through the direct-UPI confirmation endpoint.
2. **Hardcoded reviewer/demo credentials can create or take over an OWNER account**, and the repo documentation publishes those credentials.
3. **The owner passcode has a known fallback** and there is no in-app way to change it.
4. **Next.js 14.2.35 has a critical dependency advisory**, including Image Optimization RCE/DoS/SSRF paths, while `remotePatterns` accepts every hostname.
5. **Deactivated staff keep their old role array**, so they can retain access to staff pages, rider operations, and the full customer-data backup.
6. **`NEXTAUTH_SECRET` has a known fallback and the production env validator is never executed.** If the secret is missing, forged OWNER JWTs are possible.

Several good controls already exist: server-side price/coupon recomputation, conditional stock decrements, parameterized raw SQL for rider applications, HMAC webhook verification with the raw body, scrypt hashing for owner/staff-create PINs, and Caddy security headers. Those do not offset the P0 issues above.

### What passes today

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Pass** |
| `npm run build` | **Pass** (standalone build generated) |
| `npm run lint` | **Pass**, warnings only (`<img>` usage, no lint errors) |
| `npm audit` (full tree) | **Fail** — 19 vulnerabilities: **1 critical, 13 high, 5 moderate** |
| `npm audit --omit=dev` | **Fail** — 16 vulnerabilities: **1 critical, 10 high, 5 moderate** |
| Unit/integration test framework | **Missing** |
| E2E/payment/authz tests in CI | **Missing** |
| Live Cashfree/Razorpay payment and refund tests | **Not run** (no production credentials; see limitations) |
| iOS/Android device verification | **Not run** (screenshot reviewed; no device attached) |

---

## 2. Release-blocking findings (P0)

### P0-1 — Unpaid orders can be self-confirmed as PAID

**Evidence:** [confirm-upi route](app/api/orders/%5BorderNumber%5D/confirm-upi/route.ts#L107-L123), [UpiPaymentModal](components/cart/UpiPaymentModal.tsx), [order creation](app/api/orders/route.ts#L20-L35).

The direct-UPI flow creates an order with `paymentMethod: "ONLINE_PREPAID"`. `POST /api/orders/[orderNumber]/confirm-upi` then does this:

```ts
// C. Direct UPI App Intent or QR payment
if (!isVerified) {
  isVerified = true;
  verifiedTxnId = utr ? `UTR-${utr}` : `UPI-${Date.now()}`;
}
```

It does not matter whether Cashfree is configured, whether Cashfree found a successful payment, or whether the customer entered a real UTR. The next statement writes:

```ts
paymentStatus: PaymentStatus.PAID,
status: OrderStatus.CONFIRMED,
```

**Impact:** any authenticated customer can place an order, press “I’ve paid” / call the endpoint, and receive a confirmed, dispatchable order without money moving. The order is then visible to packers and eligible for delivery. This is direct revenue loss and a trivially repeatable fraud path. The same endpoint can also resurrect a `CANCELLED` or `DELIVERED` order into `CONFIRMED`.

**Fix (do before any live payment):**
- Delete branch C entirely. A customer confirmation must require a server-side gateway result (`order_status === "PAID"` / verified payment entity) or an explicit, audited OWNER/MANAGER override.
- If direct UPI-to-static-VPA is required, treat it as an unverified claim: leave the order `PENDING`, require staff reconciliation, and never auto-confirm.
- Validate the UTR format and uniqueness, store an audit record, and reject amounts that do not equal the order total.
- Add a regression test: unpaid customer calls `confirm-upi` → 402/400, order remains `PENDING`, stock unchanged.

**Acceptance:** no code path can move an order to `PAID` based solely on a client request or client-supplied UTR.

---

### P0-2 — Reviewer and demo backdoors are active by default

**Evidence:** [auth.ts reviewer path](lib/auth.ts#L178-L214), [auth.ts demo OTP](lib/auth.ts#L382-L386), [OTP verify demo bypass](app/api/auth/otp/verify/route.ts#L33-L41), [APP_STORE_READINESS.md](APP_STORE_READINESS.md#L128-L132).

The credentials provider contains a reviewer branch with **hardcoded fallback phone and passcode**:

```ts
const reviewerPhone = process.env.REVIEWER_PHONE?.trim() || "<hardcoded phone>";
const reviewerPasscode = process.env.REVIEWER_PASSCODE?.trim() || "<hardcoded passcode>";
```

On a successful match it **upserts the user as `OWNER` with every role** (`OWNER`, `MANAGER`, `PACKER`, `RIDER`, `CUSTOMER`) and `phoneVerified: true`. This happens in production too unless the environment variables override both values. The same credentials are documented in `APP_STORE_READINESS.md` and the audit scripts.

There is a second, unconditional demo bypass:

```ts
const legacyDemoPhone = process.env.DEMO_REVIEW_PHONE || "9999999999";
const legacyDemoOtp = process.env.DEMO_REVIEW_OTP || "1234";
const isLegacyDemo = phone === legacyDemoPhone && otp === legacyDemoOtp;
```

`isLegacyDemo` is not guarded by `NODE_ENV` or `ALLOW_MASTER_OTP`. If a user with that phone exists in production—even a legacy demo/customer record—the demo path authenticates as that user. The reviewer path is worse because it creates the OWNER account on demand.

**Impact:** full store takeover, including refunds, customer PII export, staff creation, and order manipulation. Even if the production environment overrides the values, the defaults and their publication in the repository make accidental exposure likely.

**Fix:**
- Remove both bypasses from production code. If a reviewer account is required, gate it behind `ALLOW_REVIEWER_LOGIN=true` **and** `NODE_ENV !== "production"`, or provision a time-limited account through normal staff management and revoke it after review.
- Delete the demo OTP path entirely. Keep `ALLOW_MASTER_OTP` only for CI/dev and make startup fail if it is true in production.
- Rotate the reviewer passcode, owner passcode, and any sessions created by these accounts.
- Remove credentials from `APP_STORE_READINESS.md`, `journey_audit/REVIEW.md`, and test-script defaults.
- Add a startup assertion that refuses to boot in production if reviewer/demo defaults are active.

**Acceptance:** a production build rejects the known reviewer phone/passcode and the demo phone/OTP; no branch can auto-create an OWNER account.

---

### P0-3 — Known default owner passcode, no rotation flow

**Evidence:** [auth.ts owner provisioning](lib/auth.ts#L228-L267), [prisma/seed.ts](prisma/seed.ts#L35-L45), [DEPLOYMENT.md](DEPLOYMENT.md#L199-L207), [.env.prod.example](.env.prod.example).

The owner login provisions the owner PIN from:

```ts
const provisioned = process.env.OWNER_PASSCODE || "<hardcoded fallback>";
```

If the owner row exists without a PIN, the first successful owner login sets that known fallback. The deployment runbook seeds the **development seed**, which creates the owner at the phone number used by the auth fallback, with no PIN. `.env.prod.example` does not require `OWNER_PASSCODE`. There is no UI or API to rotate the owner passcode.

`prisma/seed.prod.ts` uses a different default owner phone (`9876500001`) than `lib/auth.ts` (`9109066668`). On a production database seeded with `db:seed:prod`, the default owner phone in auth will not match the seeded owner, so the real owner may be unable to log in, while a separately provisioned owner at the auth default would inherit the known fallback.

**Impact:** predictable OWNER authentication and/or owner lockout. This is a takeover path if the owner record exists at the default phone or if the fallback is used during provisioning.

**Fix:**
- Require `OWNER_PASSCODE` at startup (minimum length/entropy), or remove passcode login for owner and use Google/WebAuthn plus a recovery process.
- Force rotation on first login and add an owner security settings screen.
- Fix the seed/auth phone mismatch; make one source of truth (`OWNER_PHONE`).
- Change the production runbook to use `db:seed:prod`, and make the production seeder refuse to run unless `OWNER_PHONE` and a strong owner credential are supplied.
- Invalidate all existing owner sessions after rotation.

**Acceptance:** no default owner credential exists in source; production startup fails if owner provisioning is incomplete; the owner can rotate credentials.

---

### P0-4 — Critical Next.js vulnerability and an unrestricted image optimizer

**Evidence:** `package.json` (`next: ^14.2.24`, installed `14.2.35`), [next.config.mjs](next.config.mjs#L7-L13), `npm audit` output.

`npm audit` reports one **critical** `next` advisory set and multiple high advisories. The published advisories include unauthenticated RCE in the Image Optimization API when AVIF/SVG files are used, SSRF in Server Actions/rewrites, request smuggling, cache poisoning, and unbounded image cache growth. The installed version is **14.2.35**, which is inside the vulnerable ranges.

The app also configures:

```js
images: {
  remotePatterns: [{ protocol: "https", hostname: "**" }],
}
```

That allows the public `/_next/image` endpoint to fetch arbitrary HTTPS hosts. Even without the RCE advisory, this is an open image proxy/SSRF surface and an unbounded disk-cache risk.

**Impact:** remote compromise or denial of service of the production container; the endpoint is public and does not require a session.

**Fix:**
- Upgrade to a patched Next.js release (the audit’s suggested resolution is `next@16.4.3`; if staying on 15.x, use at least the patched 15.5.x line) through a staging upgrade, not an untested `--force` on production.
- Restrict `remotePatterns` to the application’s own host and the actual CDN hosts (Cloudinary/ImgBB only if enabled).
- Set image cache limits and disable SVG optimization unless explicitly required.
- Add `poweredByHeader: false` and a CSP at the same time.
- Re-run `npx tsc --noEmit`, `npm run build`, and the Cashfree/order test scripts after the upgrade.
- Add `npm audit --audit-level=high` as a CI gate.

**Acceptance:** `npm audit --omit=dev` has zero critical/high findings; `/_next/image` cannot fetch arbitrary hosts; build and payment tests pass.

**Dependency detail (production tree, `npm audit --omit=dev`):**

| Package | Severity | Why it matters | Resolution |
|---|---|---|---|
| `next` 14.2.35 | Critical | Image Optimizer RCE/DoS/SSRF, request smuggling, cache poisoning, unbounded image cache | Upgrade to patched 15.5.x or 16.4.3 |
| `postcss` 8.5.28 | High | CSS stringify XSS, source-map path traversal/file disclosure | Update with Next/toolchain |
| `sharp` 0.35.4 | High | librsvg vulnerability in image processing | `sharp` >= 0.35.5 |
| `zod` 3.25.76 | High | Memory exhaustion on oversized constrained collections | Upgrade to 4.6.7+ (major, test schemas) |
| `firebase` 12.19.0 / `@grpc/grpc-js` | High | gRPC auth-context certificate confusion and error leakage | Update Firebase or override `@grpc/grpc-js` >= 1.13.6 |
| `follow-redirects` 1.16.0 | High | Credential-header stripping bypass/exposure | 1.16.1+ |
| `brace-expansion` | High | ReDoS/stack exhaustion | Patched transitive version |
| `glob` | High | CLI command injection when `-c/--cmd` is used | Updated toolchain |
| `source-map-js` | High | Event-loop DoS via indexed source maps | 1.2.2+ |

Run `npm audit --omit=dev` after each upgrade. Do not use `npm audit fix --force` as the production upgrade method; it will apply semver-major changes without the regression tests this app needs.

---

### P0-5 — Known fallback `NEXTAUTH_SECRET`; production validation is dead code

**Evidence:** [auth.ts](lib/auth.ts#L25-L30), [middleware.ts](middleware.ts#L62-L66), [env.ts](lib/env.ts), `grep` for `validateProductionEnv`.

Both auth and middleware fall back to:

```ts
process.env.NEXTAUTH_SECRET || "local_development_secret_32_chars_minimum"
```

`lib/env.ts` defines `validateProductionEnv()`, but **it is never imported anywhere**. The only reference is its own module evaluation:

```ts
if (process.env.NODE_ENV === "production") validateProductionEnv();
```

Because nothing imports `lib/env.ts`, that guard never runs. The middleware runs on the Edge runtime and does not import it either.

**Impact:** if `NEXTAUTH_SECRET` is missing, empty, or left at the development value, an attacker can sign a JWT with `role: "OWNER"` and a chosen `id`. Middleware role checks read the token; several owner APIs rely on `session.user.role` without re-checking the database. The result is forged administrative access. This is conditional on deployment configuration, but the code does not fail closed.

**Fix:**
- Remove the fallback secret. Throw if missing or if it equals a known development value.
- Import/call `validateProductionEnv()` from `instrumentation.ts` (`register()`) so Next startup fails before serving traffic.
- Add a runtime check in middleware that rejects the known dev secret (or always require the env var).
- Rotate `NEXTAUTH_SECRET` and invalidate all existing sessions.
- Add a startup smoke test to CI that builds with a missing secret and asserts the process exits non-zero.

**Acceptance:** production cannot start without a strong secret; a JWT signed with the development secret is rejected.

---

### P0-6 — Deactivated staff retain staff roles and device tokens

**Evidence:** [staff DELETE](app/api/owner/staff/route.ts#L236-L252), [middleware role array handling](middleware.ts#L82-L100), [owner backup role check](app/api/owner/backup/route.ts#L18-L30), [rider accept role check](app/api/rider/orders/accept/route.ts#L24-L32).

Deactivation currently does only this:

```ts
data: {
  role: Role.CUSTOMER,
  pin: null,
}
```

It does **not** clear the `roles` array, delete `DeviceToken` rows, set `RiderProfile.isOnline` to false, or revoke the JWT. Middleware and several sensitive endpoints authorize using the **array**:

```ts
const userRoles = token.roles?.length ? token.roles : [userRole];
const hasAllowedRole = userRoles.some((r) => allowedRoles.includes(r));
```

`/api/owner/backup` explicitly checks `userRoles.includes("OWNER") || userRoles.includes("MANAGER")`. Rider accept/verify/collect/status also check `userRoles.includes("RIDER")`.

**Impact:** a terminated manager can still open `/manager` or `/owner` UI routes, call `owner/backup` (full customer/order/address export), and a terminated rider can still accept deliveries or mark orders delivered/paid. They also continue receiving staff push notifications until the token changes.

**Fix:**
- On deactivation set `roles: [Role.CUSTOMER]`, `pin: null`, `riderProfile.isOnline = false`, delete all `DeviceToken` rows, and add a `sessionVersion`/`disabledAt` field that the JWT callback checks.
- Centralize authorization in one helper that consistently checks both `role` and `roles`, and rejects any account with `disabledAt`.
- Add regression tests for ex-MANAGER, ex-RIDER, and ex-PACKER: all staff endpoints return 403, `/api/owner/backup` returns 403, device tokens are gone.

**Acceptance:** a deactivated staff member cannot access staff pages, staff APIs, backups, rider operations, or push notifications.

---

## 3. High-severity findings (P1)

### P1-1 — `switch-cod` rewrites paid/fulfilled orders

**Evidence:** [switch-cod](app/api/orders/%5BorderNumber%5D/switch-cod/route.ts#L50-L57).

Any customer who owns an order can set it to `CASH_ON_DELIVERY`, `paymentStatus: PENDING`, and `status: CONFIRMED`—including an order that was already `PAID`, `DELIVERED`, `CANCELLED`, or `OUT_FOR_DELIVERY`. This destroys payment state, can reopen a delivered order, and enables a later cancellation with stock restoration and coupon decrement.

**Fix:** allow the transition only from `PENDING`/`CONFIRMED` with `paymentStatus !== PAID`, inside a transaction, with an audit event. Reject `DELIVERED`, `CANCELLED`, `OUT_FOR_DELIVERY`, and any paid order.

---

### P1-2 — No order state machine; cancellation is not idempotent; PACKER can cancel/deliver

**Evidence:** [orderStatus.ts](lib/orderStatus.ts#L62-L111), [ops status route](app/api/ops/orders/status/route.ts#L27-L33).

`updateOrderStatus` has no allowed-transition table. `PACKER` is authorized to send **any** `OrderStatus`, including `CANCELLED` and `DELIVERED`, without a delivery OTP. The cancellation branch has no guard for an already-cancelled order:

- It restores stock every time it runs.
- It decrements coupon usage every time.
- It attempts a refund every time `paymentStatus === PAID`.
- Two concurrent cancellations can both read `PAID` and both issue a unique refund (the refund ID includes `Date.now()`).
- Cancellation for a Razorpay order still calls **Cashfree** (`createCashfreeRefund`), so Razorpay refunds fail silently while the order is cancelled.
- A refund failure is logged and swallowed; the order is still cancelled and can remain `PAID`.

**Impact:** inventory inflation, coupon abuse, double refunds, cancelled-but-paid orders, unpaid COD orders marked delivered without collection, and incorrect order history.

**Fix:**
- Add `lib/orderState.ts` with an explicit transition graph. Only `PACKER` → `PACKING`/`READY_FOR_PICKUP`; refunds/cancellations require MANAGER/OWNER.
- Make cancellation transactional and idempotent: lock/claim the order, check current status, set an idempotency key, create a `Refund` row, and only restore stock/coupon once.
- Choose the refund provider by `paymentMethod`; implement Razorpay refunds or disable Razorpay.
- Do not swallow refund failures; surface a `REFUND_PENDING` state and alert operations.
- Add tests for double cancellation, concurrent cancellation, Cashfree refund success/failure, and Razorpay refund.

---

### P1-3 — Razorpay order creation is an IDOR; verification has no session/amount check

**Evidence:** [create-order](app/api/payments/razorpay/create-order/route.ts#L33-L58), [verify](app/api/payments/razorpay/verify/route.ts#L29-L78).

`create-order` fetches any order by `id` and overwrites its `razorpayOrderId` without checking `order.customerId === session.user.id`. A logged-in customer can target another customer’s order, force a new Razorpay order ID, and break the victim’s payment. `verify` has **no session check at all**; it accepts any `orderId`/`orderNumber`, verifies the HMAC against the Razorpay secret, and marks the matched order `PAID`/`CONFIRMED`. It does not verify the payment amount, and if `order.razorpayOrderId` is null it accepts a signature from a different valid Razorpay payment.

**Impact:** payment state tampering, cross-customer order modification, potential payment forgery with a valid low-value signature, and unauthenticated state changes.

**Fix:** require a session, require ownership, require the order to be payable and the amount/currency to match, require `order.razorpayOrderId` to equal the submitted ID, use timing-safe comparison, and never accept a signature whose amount is lower than the order total. Add a Razorpay webhook with the same verification and idempotency. If Razorpay is not actively used, remove the routes rather than shipping them half-integrated.

---

### P1-4 — Cashfree verification and webhook gaps

**Evidence:** [Cashfree verify](app/api/payments/cashfree/verify/route.ts#L35-L80), [webhook](app/api/payments/cashfree/webhook/route.ts#L60-L98), [cashfree.ts retry logic](lib/cashfree.ts#L130-L185).

- `verify` skips the ownership check entirely when there is no session. It is effectively a public “confirm this order” endpoint.
- `verify` only rejects **underpayment**; it does not require equality, and it does not check order status. It can confirm a cancelled order.
- The webhook checks the signature and `paymentStatus`, but not `payment_amount`, currency, or whether the payment belongs to the expected Cashfree order ID. A valid signature for a lower amount still marks the order paid.
- Duplicate webhook deliveries are guarded only by `paymentStatus !== PAID`; that is not atomic and there is no `WebhookEvent`/event-ID table. Concurrent duplicates can send duplicate staff alerts and race updates.
- `createCashfreeOrder` can retry an expired order with a **new suffixed `order_id`**, but the application only stores `cashfreeOrderId` (the cf order ID), not the suffixed order ID as the lookup key. Later `verify` queries `orderNumber`; webhooks look up `orderNumber`; neither will find the suffixed Cashfree order. A customer can pay the retry order and the app will never confirm it.
- The return URL is built from the request `Origin`/`Host`, not a fixed `NEXTAUTH_URL`; an attacker can make Cashfree redirect a paying customer to an attacker-controlled origin.
- Refund creation uses a timestamp-based refund ID, so retries/concurrency can create multiple refunds.
- API version is pinned to `2023-08-01`; the project’s convention is `2026-01-01`.
- `createCashfreeOrder` recovery branches on human-readable message text (`"order with same id"`), and `isCashfreeSdkPolicyBlock` branches on message text. The Cashfree validation skill explicitly says to branch on codes/enums, never message strings.

**Fix:** require session + ownership in `verify`; branch on `order_status`; verify amount/currency; add a unique `WebhookEvent(provider,eventId)` and process in a transaction; store and query the actual Cashfree order ID; use a fixed return URL; use deterministic refund idempotency keys; upgrade the API version in a sandbox test; replace message checks with codes plus a fallback log. Add webhook IP allowlisting at Caddy.

---

### P1-5 — OTP and rate-limit weaknesses

**Evidence:** [OTP send](app/api/auth/otp/send/route.ts#L67-L72), [OTP verify](app/api/auth/otp/verify/route.ts#L33-L62), [SMS fallback](lib/sms.ts#L124-L129), [rateLimit](lib/rateLimit.ts#L127-L148), [middleware prefetch exemption](middleware.ts#L18-L25).

- OTPs are 4 digits and generated with `Math.random()`, not `crypto.randomInt()`. The space is 9,000 values.
- `/api/auth/otp/verify` has no attempt counter or per-phone lockout at all; it compares the stored OTP and returns 400.
- The NextAuth OTP path locks after 5 failures, but `/api/auth/otp/send` calls `resetOtpAttempts(phone)`, so an attacker can reset the lockout every 60 seconds and continue guessing.
- The rate limiter can be bypassed by sending `X-Middleware-Prefetch: 1`, `Purpose: prefetch`, or `Sec-Purpose: prefetch`; the middleware skips the limiter without recording a request.
- `getClientIp` trusts `CF-Connecting-IP` first. Caddy does not strip it, so a direct client can rotate that header to get a new rate-limit bucket.
- The limiter is an in-memory `Map`; it does not work across multiple app instances and resets on restart.
- `sendOtpSms` always logs the OTP to the server console when all gateways fail, including in production. A misconfigured or exhausted SMS gateway turns server logs into an OTP oracle.
- `/api/auth/otp/verify` returns `isNewUser`, enabling phone-number/account enumeration.

**Fix:** use 6-digit `crypto.randomInt` OTPs, hash them at rest, enforce a per-phone attempt counter independent of issuance, only reset counters on successful verification (not on send), add exponential backoff/CAPTCHA, require `purpose`-scoped OTPs, remove the prefetch bypass for `/api/*`, take the trusted proxy IP from Caddy (or rightmost XFF), configure a distributed limiter (Redis), and never log OTPs in production. Do not return `isNewUser`.

---

### P1-6 — Staff PINs are stored in plaintext and are only 4 digits

**Evidence:** [staff POST](app/api/owner/staff/route.ts#L115-L157), [passcode](lib/passcode.ts), [staff UI](app/owner/page.tsx#L330-L360).

`/api/owner/staff` writes `pin` directly on update and upsert:

```ts
data: { ..., pin, ... }
```

`/api/owner/staff/create` correctly uses `hashPasscode(pin)`, but the main staff UI calls the other endpoint. As a result, new/edited staff PINs are stored as plaintext until a successful login migrates them to scrypt. A database read, backup, or log exposes every staff PIN; a 4-digit PIN is only 10,000 possibilities even when hashed.

**Fix:** hash in both endpoints; never accept or return plaintext PINs; use at least 6 digits or a passphrase; add a one-time migration to hash all legacy values and reject plaintext on read; add rate limiting per account/IP and a forced PIN change on first login; consider WebAuthn/passkeys for owner and managers.

---

### P1-7 — Broad PII exposure without audit

**Evidence:** [owner backup](app/api/owner/backup/route.ts#L18-L100), [rider status](app/api/rider/status/route.ts#L100-L150), [order stream](app/api/orders/%5BorderNumber%5D/stream/route.ts#L30-L90), [order page](app/orders/%5BorderNumber%5D/page.tsx#L36-L70), [push notifications](lib/notifications.ts#L260-L285).

- `GET /api/owner/backup` lets any MANAGER download all users (name, phone, email), all orders, all addresses, coupons, and themes. There is no pagination, no audit record, and no field minimization.
- `/api/rider/status` returns the full address, latitude/longitude, and customer name for **every** unassigned `READY_FOR_PICKUP` order to any rider, including riders who have not accepted the order.
- The SSE stream and order tracking page allow any staff role (RIDER, PACKER, MANAGER, OWNER) to view any order’s full customer address, phone, and delivery OTP by order number.
- Order-status push notifications include the delivery OTP in the notification body, exposing it on lock screens.
- There is no `AuditLog` for backup downloads, customer edits, staff changes, order status changes, refunds, or data exports.

**Fix:** scope rider/order access to assigned orders (or reveal address only after acceptance), redact OTP from lock-screen-visible text, require an explicit “download backup” permission with audit logging, paginate/stream backup data, and encrypt backups. Add an audit-log table and retention policy.

---

### P1-8 — Account deletion is incomplete and sessions survive deletion

**Evidence:** [delete-account](app/api/user/delete-account/route.ts#L230-L280), [schema](prisma/schema.prisma), [auth session](lib/auth.ts#L30-L38).

Deletion redacts name/phone/email and some address text, but:

- Address latitude/longitude remain—enough to identify a home.
- Orders, order items, delivery OTPs, payment IDs, rider applications, and `LaunchSubscriber` contacts are retained indefinitely.
- The JWT remains valid for up to 30 days; there is no session version/revocation.
- `RiderApplication` PII is not deleted for customer/staff requests.
- There is no documented retention schedule or legal-hold policy.

**Fix:** add a deletion job that anonymizes order addresses/coordinates, deletes or anonymizes rider applications and launch contacts, retains only legally required financial fields, revokes sessions (session version), and documents retention. Add a DPDP erasure test.

---

### P1-9 — Mobile release is insecure and the iOS payment bridge is not proven

**Evidence:** [capacitor.config.ts](capacitor.config.ts#L22-L28), [AndroidManifest.xml](android/app/src/main/AndroidManifest.xml#L4-L12), [Info.plist](ios/App/App/Info.plist), [SceneDelegate.swift](ios/App/App/SceneDelegate.swift), [NativeUpiPlugin.swift](ios/App/App/NativeUpiPlugin.swift), screenshot supplied by the user.

The Android release configuration has:

```ts
allowMixedContent: true,
webContentsDebuggingEnabled: true,
```

and the manifest has `android:usesCleartextTraffic="true"` and `android:allowBackup="true"`. In a release build this permits mixed HTTP content, allows Chrome DevTools inspection of the WebView/session, and can back up WebView data (including cookies) to Google backup. The app loads the live site from a hardcoded remote URL, so a compromised or misconfigured site is remote code execution inside the shell; there is no pinning or app-attestation check.

The screenshot shows:

> “NativeUpi” plugin is not implemented on ios

The current source does register `NativeUpiPlugin` in `SabBridgeViewController.capacitorDidLoad()` and maps an unavailable bridge to the hosted Cashfree page. That means one of these is true: the installed TestFlight/App Store build predates the registration fix, the generated `packageClassList` does not include the plugin, or the deployed web bundle is older than the current `CartDrawer` fallback. It is not sufficient to assume the source change is live.

**Fix:**
- Set `allowMixedContent: false`, `webContentsDebuggingEnabled: false`, `usesCleartextTraffic: false`, and `allowBackup: false` (or exclude WebView data in a backup rules file) for release builds.
- Rebuild the iOS archive after commit `7fb605e`; verify the plugin appears in the archive, `packageClassList`, and on-device. Tap “Pay via UPI / Cards” on a physical iPhone, confirm the native sheet opens or the hosted page loads, and confirm server-side verification.
- Remove raw bridge error text from customer-facing UI; always map it to a generic message and log the details.
- Add Play Integrity/App Attest and Universal Links/App Links instead of relying only on a custom scheme.
- Test on the oldest supported iOS/Android versions and on a release (non-debug) build.

---

### P1-10 — Deployment pipeline is unsafe and Node 20 is EOL

**Evidence:** [ci.yml](.github/workflows/ci.yml#L120-L190), [Dockerfile](Dockerfile), [docker-compose.prod.yml](docker-compose.prod.yml), [DEPLOYMENT.md](DEPLOYMENT.md).

- Production deploy runs as `root` over SSH and falls back to a hardcoded VPS IP/root user.
- Migrations are applied by looping over every `migration.sql` with `psql ... || true`. Failures are ignored, `_prisma_migrations` is not updated, and a failed/partial migration still lets the deploy continue. There is an `ALTER TABLE` hack for `pin`.
- CI runs `prisma migrate deploy` followed by `prisma db push --skip-generate`, which can drift the schema from migrations.
- The runbook seeds production with the **development** seed (`npx prisma db seed`), creating demo/staff accounts and the default owner phone.
- There is no staging environment, no image tagging, no automated rollback, no pre-deploy backup, no post-deploy smoke test, and no healthcheck for the `app` container.
- The deploy uses `--force-recreate`, causing downtime; a failed app start leaves Caddy serving 502s.
- Dockerfile and CI use Node 20; Node 20 reached end-of-life in April 2026. The Capacitor job already uses Node 22, so the runtime matrix is inconsistent.
- `.dockerignore` excludes `.env.prod` and `.env*.local` but **not `.env`**; because the builder does `COPY . .`, a local `.env` can be copied into the build context/image layers.

**Fix:** use a non-root deploy user with narrowly scoped Docker permissions; pin actions by commit SHA; run `prisma migrate deploy` once with a migration lock and fail on error; remove `db push`; back up before migrations; tag images with the commit SHA and keep the previous image for rollback; add `/api/health` and compose healthchecks; run smoke tests after deploy; add staging; use Node 22/24 LTS in Docker and CI; exclude `.env` and build artifacts from the context; pin and audit GitHub Actions.

---

### P1-11 — Data model is not audit-safe or money-safe

**Evidence:** [schema.prisma](prisma/schema.prisma), [ops/products/[id]](app/api/ops/products/%5Bid%5D/route.ts), [ops/categories](app/api/ops/categories/route.ts), [coupons](app/api/owner/coupons/route.ts).

- All monetary values are `Float`; binary floating point is unsuitable for money and coupon/refund reconciliation. Use integer paise or `Decimal`.
- `OrderItem.product` is `onDelete: Cascade`; deleting a product/category deletes historical order items. Both `ops/products/[id]` and `ops/categories` explicitly delete order items before deleting products. That destroys tax/audit history.
- There is no `OrderStatusHistory`, `AuditLog`, `Refund`, `PaymentEvent`, `WebhookEvent`, `IdempotencyKey`, or `Session` model.
- There is no unique constraint on `(orderId, productId)`, so duplicate line items are possible.
- `RiderApplication` is created by raw SQL in `ensureDatabaseSchema` and is not in Prisma, so schema drift is invisible to migrations.
- `User.role` and `User.roles` are duplicated and can disagree; authorization code uses different fields in different endpoints.
- `deliveryOtp` has a default of `"1234"` for any row created outside the order API.

**Fix:** migrate money to integer paise/Decimal; replace cascade deletes with soft deletes (`deletedAt`) or `Restrict` and archive order items; add audit/payment/refund/webhook tables; add a status-history table; model `RiderApplication` in Prisma; make `roles` the single source of truth (derive `role` or deprecate it); remove the `"1234"` default.

---

### P1-12 — No payment ledger, refund workflow, invoice, or reconciliation

**Evidence:** payment routes, `lib/orderStatus.ts`, `prisma/schema.prisma`, policy pages.

There is no ledger tying an order to gateway payment IDs, refunds, settlements, fees, or COD cash. Refunds are ad hoc; Razorpay refunds are not implemented; failed refunds are swallowed; there is no daily gateway-vs-database reconciliation; there is no tax invoice/GST/HSN document generation; COD cash collection is recorded only as a timestamp on the order; rider earnings/payouts are hardcoded (`₹30` per delivery) in two places.

**Impact:** finance cannot reconcile revenue, refunds, or COD cash; tax compliance is incomplete; disputes and chargebacks have no evidence trail.

**Fix:** add `Payment`, `Refund`, `Settlement`, `CashCollection`, and `Invoice` models; store gateway amounts/fees/UTR; generate GST invoices (or document why not applicable); reconcile daily with Cashfree/Razorpay settlement reports; implement an owner refund screen with approvals; move rider payouts to a ledger.

---

### P1-13 — Runtime schema self-healing in production

**Evidence:** [db-self-heal.ts](lib/db-self-heal.ts), 34 references.

`ensureDatabaseSchema()` runs `ALTER TABLE`, drops and recreates foreign keys, creates tables/indexes, and seeds a coupon on first request. It is called from auth and many API routes. It swallows all errors and retries on every request if it fails. It requires the application DB role to own schema objects, can block tables under load, and hides migration failures. The FK recreation (`ON DELETE CASCADE`) is especially dangerous for order-history integrity.

**Fix:** remove all runtime DDL. Use `prisma migrate deploy` during deploy, with a dedicated migration role. Add a startup readiness probe that checks migration status, not schema mutation. Keep a one-time repair script for legacy databases, run manually and audited.

---

### P1-14 — In-memory rate limiting and no distributed abuse controls

**Evidence:** [rateLimit.ts](lib/rateLimit.ts).

The limiter is a per-process `Map`. It resets on restart and is bypassed across instances; combined with the prefetch/CF-header bypasses, it is not a reliable control for OTP, login, order, or SMS abuse. There is no per-user quota, no CAPTCHA, no device/IP reputation, and no alerting on abuse.

**Fix:** back the limiter with Redis (atomic increments/sliding window), key by trusted IP + user + phone + route, add per-account quotas, and alert on SMS spend/OTP failures. Remove the prefetch exemption for API routes.

---

### P1-15 — Authorization is inconsistent between `role` and `roles`

**Evidence:** `middleware.ts`, `ops/*`, `rider/*`, `owner/*`, `lib/auth.ts` JWT callback.

Some routes check only `session.user.role`; others check the `roles` array. `middleware` checks `roles`, but `/api/ops` is not covered by middleware at all. A multi-role staff member with primary `PACKER` and secondary `MANAGER` is denied by role-only routes; a deactivated user with stale roles passes role-array routes. There is no single authorization helper or test matrix.

**Fix:** create `lib/authz.ts` with `requireUser`, `requireRole`, `requireAnyRole`, `requireOwner`, and `requireStoreAccess`; use it in every route; define a route/role matrix and test it. Deprecate direct `session.user.role` checks.

---

## 4. Medium and low findings

| ID | Severity | Finding | Evidence / fix |
|---|---|---|---|
| M-1 | Medium | Cashfree `return_url` is built from request `Origin`/`Host`, enabling open redirect/phishing after payment. | [create-order](app/api/payments/cashfree/create-order/route.ts). Use `NEXTAUTH_URL`/allowlisted origin. |
| M-2 | Medium | Cashfree `verify` is callable without a session and accepts any order number; it should require auth and ownership. | [verify](app/api/payments/cashfree/verify/route.ts). |
| M-3 | Medium | Webhook replay: no timestamp skew check, no event-ID dedupe, non-timing-safe signature comparison. | [webhook](app/api/payments/cashfree/webhook/route.ts), [cashfree.ts](lib/cashfree.ts). |
| M-4 | Medium | Raw `error.message` responses leak Prisma/SQL/internal details from many routes. | `ops/riders`, `ops/orders`, `orders`, `addresses`, etc. Add a central error mapper with request IDs. |
| M-5 | Medium | Upload validates only the declared MIME type, not magic bytes; sync disk writes; no per-user/disk quota; no image re-encoding. | [ops/upload](app/api/ops/upload/route.ts). Use `sharp`/`file-type`, async writes, quotas, and object storage. |
| M-6 | Low | Upload path guard uses a prefix check (`startsWith`) rather than `path.relative` containment. | [uploads route](app/api/uploads/%5B...path%5D/route.ts). Use `path.relative` + reject `..`. |
| M-7 | Medium | `WELCOMEFREE` is auto-applied client-side even when the customer is ineligible; server rejects only at checkout, producing a bad UX. Coupon validation is public and enumerable. | [CartDrawer](components/cart/CartDrawer.tsx), [coupons/validate](app/api/coupons/validate/route.ts). Validate eligibility server-side before showing the discount. |
| M-8 | Medium | Deleting a coupon force-unlinks it from historical orders; deleting a product/category deletes order items. | [owner/coupons](app/api/owner/coupons/route.ts), [ops/categories](app/api/ops/categories/route.ts), [ops/products](app/api/ops/products/%5Bid%5D/route.ts). |
| M-9 | Medium | No CSP, COOP/CORP, Permissions-Policy; authenticated API responses lack `Cache-Control: private, no-store`. | [Caddyfile](Caddyfile), [next.config.mjs](next.config.mjs). Add headers and no-store for PII. |
| M-10 | Medium | Custom mutation APIs rely on SameSite cookies but do not check `Origin`/`Sec-Fetch-Site`; no explicit CSRF layer. | Add same-origin checks for POST/PATCH/DELETE. |
| M-11 | Medium | No `/api/health`, no APM/error tracking, no request IDs, no alerting, Docker json-file logs can fill disk. | Add health/readiness, structured logs, log rotation, metrics/alerts, SLOs. |
| M-12 | Medium | SSE opens a new Redis connection per client with no cap or backpressure; staff can open many streams. | [stream route](app/api/orders/%5BorderNumber%5D/stream/route.ts). Cap connections, add heartbeats/cleanup, use a shared subscriber. |
| M-13 | Medium | Backups are `pg_dump` to R2 with no documented encryption, no restore drill, no uploads-volume backup, and no PITR. | [backup-db.sh](scripts/backup-db.sh), [DEPLOYMENT.md](DEPLOYMENT.md). Add encrypted backups, restore tests, WAL/PITR, uploads backup. |
| M-14 | Medium | `.env` is not ignored by `.dockerignore`; build context `COPY . .` can bake local secrets into layers. | [.dockerignore](.dockerignore), [Dockerfile](Dockerfile). Ignore `.env*` except examples. |
| M-15 | Medium | No Play Integrity/App Attest, no certificate pinning, custom scheme deep link is claimable by other apps. | [Info.plist](ios/App/App/Info.plist), [AndroidManifest.xml](android/app/src/main/AndroidManifest.xml). Use App/Universal Links and attestation. |
| M-16 | Medium | Rider applications accept arbitrary phone numbers without verification or route-level rate limiting; fake applications pollute PII. | [rider/apply](app/api/rider/apply/route.ts). Add OTP verification and quotas. |
| M-17 | Medium | Product/category deletes are hard deletes; no soft-delete/audit. | See P1-11. |
| M-18 | Medium | Owner customer PATCH does not verify the target is a CUSTOMER and can change another staff/owner record by ID. | [owner/customers](app/api/owner/customers/route.ts). Restrict target role and audit. |
| M-19 | Low | `isNewUser` in OTP response enables account enumeration. | [otp/send](app/api/auth/otp/send/route.ts). |
| M-20 | Low | Known-scanner User-Agent regex is cosmetic; no real WAF. | [middleware.ts](middleware.ts). Treat as defense-in-depth only. |
| M-21 | Low | `mobile-return` uses inline script for deep-link redirect; static today but CSP-hostile. | [mobile-return](app/auth/mobile-return/page.tsx). Use a nonce or server redirect. |
| M-22 | Low | `packageClassList` in the generated iOS config does not list `NativeUpiPlugin`; current runtime registration may work, but it is not verified in the archive. | [capacitor.config.json](ios/App/App/capacitor.config.json), [SceneDelegate.swift](ios/App/App/SceneDelegate.swift). |
| M-23 | Low | `images.remotePatterns` allows all hosts and Next image cache is unbounded. | See P0-4. |
| M-24 | Low | `owner/backup` and `owner/customers` have no pagination; full exports can exhaust memory. | Add streaming/pagination. |

---

## 5. Production-grade gap analysis

The code has a functioning pilot flow, but a production grocery/payments system needs the following capabilities that are absent or incomplete.

### 5.1 Payments and money

- [ ] Server-authoritative payment state machine; no client-confirmable PAID state (P0-1).
- [ ] One gateway abstraction with consistent create/verify/refund/webhook behavior (Cashfree and Razorpay currently diverge).
- [ ] Payment/refund/settlement ledger with provider IDs, amounts, fees, currency, and status history.
- [ ] Idempotency keys for order creation, capture, refund, and webhook processing.
- [ ] Webhook event table, signature verification, amount/currency checks, timestamp skew, replay protection, IP allowlist, and retries.
- [ ] Razorpay refunds and webhook, or removal of Razorpay.
- [ ] Deterministic refund IDs and a `REFUND_PENDING`/`REFUND_FAILED` workflow with owner approval.
- [ ] Daily gateway-vs-database reconciliation and alerts for mismatches.
- [ ] COD cash collection reconciliation and rider payout ledger.
- [ ] GST invoice/tax handling and order documents.
- [ ] Timeouts, retries with backoff, circuit breakers, and request IDs for all gateway/SMS/cloud calls.

### 5.2 Identity, access, and secrets

- [ ] Remove reviewer/demo/default credentials; fail closed on missing secrets (P0-2/P0-3/P0-5).
- [ ] Strong owner authentication (passkey/WebAuthn or OAuth + recovery) and recovery codes.
- [ ] One authorization helper and a tested role matrix; no mixed `role`/`roles` checks (P1-15).
- [ ] Session revocation/versioning, device/session management, idle timeout, and revoke-on-role-change.
- [ ] Staff PIN hashing, 6+ digits/passphrase, first-login rotation, lockout, and audit (P1-6).
- [ ] 6-digit cryptographic OTPs, hashed at rest, per-phone attempt limits independent of issuance, no OTP logs.
- [ ] Distributed rate limiting keyed by trusted IP/user/phone, and abuse alerting (P1-5/P1-14).
- [ ] Secrets manager or at minimum restricted `.env.prod` permissions, rotation runbook, and no secrets in Docker layers.
- [ ] CSRF/Origin checks for state-changing APIs; CSP/COOP/CORP/Permissions-Policy headers.

### 5.3 Data, audit, and compliance

- [ ] Money as integer paise/Decimal, not Float.
- [ ] Immutable order history; soft delete or `Restrict` for products/categories; no `OrderItem` cascade deletes.
- [ ] `AuditLog`, `OrderStatusHistory`, `PaymentEvent`, `Refund`, `WebhookEvent`, `Session` models.
- [ ] DPDP/GDPR erasure and retention policy; deletion covers coordinates, orders as legally permitted, rider applications, launch subscribers, and sessions (P1-8).
- [ ] Data minimization in backups, rider views, streams, and push notifications (P1-7).
- [ ] Consent/notice versioning, grievance officer, breach-notification process, and processor agreements.
- [ ] Encrypted backups, restore drill, PITR, and uploads-volume backup.
- [ ] FSSAI/legal-metrology/packaged-commodity data where applicable.

### 5.4 Reliability and operations

- [ ] Staging environment, blue-green/canary deploy, image tags, rollback, and pre-deploy backups.
- [ ] `prisma migrate deploy` only, with migration lock, failure gating, and no `db push`.
- [ ] Health/readiness endpoints and container healthchecks; Caddy depends on healthy app.
- [ ] APM/error tracking, structured logs with request IDs, metrics, dashboards, alerts, SLOs, on-call, and runbooks.
- [ ] Log rotation and disk quotas; Redis maxmemory policy; Postgres connection limits/tuning.
- [ ] Distributed rate limiting, queue/background jobs for notifications/refunds/reconciliation.
- [ ] Load/soak tests at expected peak (orders, SSE, staff polling, OTP).
- [ ] Disaster recovery: RPO/RTO, restore drill, key rotation, dependency outage behavior.
- [ ] Node 22/24 LTS runtime; patched Next.js and dependency policy.

### 5.5 Mobile and release

- [ ] Release-build hardening: no WebView debugging, no cleartext/mixed content, no backup of WebView data (P1-9).
- [ ] Verified iOS native plugin in the actual archive; physical-device test of UPI/Cashfree flow.
- [ ] Play Integrity/App Attest, Universal/App Links, and deep-link validation.
- [ ] App Store/Play policy review for remote WebView/minimum functionality; privacy manifests and location permissions.
- [ ] Crash/error reporting, version gating, forced-update path, and staged rollout.
- [ ] Test on low-end Android, notch/safe-area devices, and slow networks.

### 5.6 Testing and CI security

- [ ] Unit tests (state machine, pricing, coupons, authz, OTP, webhook parsing).
- [ ] Integration tests with Postgres/Redis and a gateway sandbox/mock.
- [ ] Route authorization matrix tests for every role, including deactivated staff.
- [ ] Payment tests: unpaid confirm rejected, amount mismatch, duplicate webhook, refund idempotency, Razorpay ownership.
- [ ] E2E tests for checkout, COD, direct UPI, Cashfree redirect, cancellation, and account deletion.
- [ ] CI gates: `tsc`, lint, build, unit/integration, `npm audit --audit-level=high`, secret scanning, SAST/CodeQL, dependency review, SBOM.
- [ ] Pin GitHub Actions by SHA; protect the production deploy with an approval/environment.
- [ ] Load tests, backup restore drill, and an external penetration test before launch.

---

## 6. Cashfree go-live checklist status

I did not have production Cashfree credentials or dashboard access, so I did not process a real payment/refund or inspect the merchant dashboard. The table separates code evidence from dashboard items that must be confirmed by the owner.

| Checklist item | Status | Evidence / required action |
|---|---|---|
| Domain/app whitelisted (HTTPS, production domain/package) | **UNKNOWN — blocker** | No evidence in repo. Confirm in Cashfree Dashboard → Developers → Whitelisting; test from the production domain and the store build. |
| SDK initialised once | **PASS (web)** | `loadCashfreeSdk` caches the script; native plugin is registered in `capacitorDidLoad`. Verify the actual iOS archive. |
| 3-state Promise handling (`error`, `redirect`, `paymentDetails`) | **PARTIAL** | Modal handles `result.error` and verifies; `_self` redirect relies on `/pay/verify`; native callback only signals return, server verifies. Add explicit `redirect`/`paymentDetails` handling and tests. |
| Backend is the source of truth | **FAIL** | `confirm-upi` branch C marks paid without a gateway result (P0-1). |
| Webhook signature verified with secret + raw body | **PASS (code)** | `verifyCashfreeWebhookSignature` uses timestamp + raw body and rejects invalid signatures in production. Add timing-safe compare. |
| Webhook idempotency | **PARTIAL** | `paymentStatus !== PAID` guard only; no event table/transaction. Duplicate concurrent deliveries can double-alert/race. |
| Dead/test code removed | **PARTIAL** | Mock Cashfree paths, reviewer/demo auth, and test credentials remain. |
| Env vars used; no hardcoded Cashfree keys | **PASS (Cashfree)** | `CASHFREE_APP_ID`/`CASHFREE_SECRET_KEY` from env. The auth secrets/defaults are a separate failure (P0-2/P0-3/P0-5). |
| Sandbox → production keys/mode/base URL/webhook URL | **PARTIAL / UNKNOWN** | Compose sets `CASHFREE_ENV=PRODUCTION`; base URL derives from env. Dashboard webhook registration and whitelist are unverified. |
| `return_url` realistic and fixed | **FAIL** | Derived from request `Origin`/`Host` (P1-4); use `NEXTAUTH_URL`. |
| Webhook IPs whitelisted | **FAIL / UNKNOWN** | No Caddy allowlist for Cashfree production IPs. |
| API version pinned consistently | **PARTIAL** | Pinned to `2023-08-01`; project convention is `2026-01-01`. Upgrade and retest. |
| Control flow branches on codes, not message text | **FAIL** | `isCashfreeSdkPolicyBlock` and `createCashfreeOrder` recovery use string matching; use codes/enums. |
| Test payment (₹1) in production | **UNKNOWN** | Must be completed after P0 fixes. |
| Test refund in production | **UNKNOWN / FAIL** | Auto-refund routes Razorpay orders to Cashfree; no refund workflow. |
| Payment methods enabled/API alerts configured | **UNKNOWN** | Dashboard item. |
| Mobile app integrity/package whitelist | **UNKNOWN** | Cashfree Integrity blocks sideloaded builds; code falls back to hosted checkout. Test via Play Store internal testing/TestFlight. |

**Cashfree verdict:** the happy-path integration is partially implemented and the webhook signature code is a good foundation, but the backend-source-of-truth failure, webhook amount/idempotency gaps, dynamic return URL, outdated API version, and message-text branching mean it is **not ready for live payments**.

---

## 7. Detailed remediation plan

Estimates are indicative for one senior full-stack engineer with ops support; parallelize where possible. Do not start Phase 1 until Phase 0 exit criteria pass.

### Phase 0 — Stop live-money and takeover risk (0–72 hours)

**Goal:** make it safe to leave the storefront online while payments are frozen or restricted.

1. **Freeze risky payment paths.**
   - Disable `ONLINE_UPI` and `RAZORPAY` in the checkout UI and reject them server-side with a feature flag.
   - Temporarily allow only Cashfree hosted checkout (or COD) and only after P0-1 is fixed.
   - Remove/disable `confirm-upi` auto-confirmation; customer confirmation must return “awaiting verification.”
   - Keep a maintenance notice for payment methods if needed.

2. **Remove backdoors and rotate credentials.**
   - Delete reviewer/demo branches from `lib/auth.ts` and `/api/auth/otp/verify`; remove credentials from docs/scripts.
   - Require `OWNER_PASSCODE` or disable owner passcode login; force rotation.
   - Remove `NEXTAUTH_SECRET` fallback and wire `validateProductionEnv` into `instrumentation.ts`.
   - Rotate owner, reviewer, staff PINs and `NEXTAUTH_SECRET`; invalidate sessions.

3. **Patch the critical dependency.**
   - Upgrade Next.js to a patched release in a branch; restrict `remotePatterns`; set image cache limits.
   - Run `tsc`, `build`, lint, and the Cashfree/order scripts; deploy with a pre-deploy database backup and a rollback image tag.

4. **Close the deactivation hole.**
   - On staff DELETE: clear `roles`, set rider offline, delete device tokens, set `disabledAt`/session version.
   - Add an authz helper and a regression test for ex-MANAGER/ex-RIDER/ex-PACKER.
   - Audit existing staff records for stale roles.

5. **Stop OTP/rate-limit abuse.**
   - Remove the prefetch exemption for `/api/*`; trust Caddy’s IP, not client `CF-Connecting-IP`.
   - Use `crypto.randomInt`, 6 digits, per-phone attempts independent of send, and never log OTPs in production.
   - Hash staff PINs at both staff endpoints; invalidate plaintext PINs.

6. **Fix Razorpay IDOR/verify or remove Razorpay.**
   - Require session/ownership/amount/order-ID checks; add a webhook or delete the routes.
   - Do not leave a half-integrated gateway enabled.

7. **Protect data exports.**
   - Restrict `owner/backup` to OWNER + explicit permission, add audit logging, and stop returning full PII to managers by default.
   - Add `Cache-Control: no-store` to authenticated responses.

**Phase 0 exit criteria:**
- An unpaid order cannot become PAID via any customer request.
- Known reviewer/demo credentials are rejected in a production build.
- Production startup fails without `NEXTAUTH_SECRET` and owner credentials.
- A deactivated staff account gets 403 on every staff/rider/owner API and receives no pushes.
- `npm audit --omit=dev` has no critical/high findings.
- `tsc`, build, lint, and payment regression tests pass.
- A pre-deploy backup exists and a rollback image is available.

### Phase 1 — Make money correct (1–3 weeks)

1. **Order state machine and ledger.**
   - Implement `lib/orderState.ts`; allowed transitions; actor/role checks; `OrderStatusHistory`.
   - Add `Payment`, `Refund`, `Settlement`, `CashCollection`, `WebhookEvent`, `AuditLog` models.
   - Make cancellation/refund/stock/coupon idempotent in one transaction.
   - Choose refund provider by payment method; implement Razorpay refunds or remove Razorpay.

2. **Payment correctness.**
   - Cashfree: fixed return URL, session+ownership on verify, amount/currency/order-status checks, event dedupe, IP allowlist, API version upgrade, timeout/retry/idempotency.
   - Store the actual Cashfree order ID for retries; never create an unmatchable suffixed order.
   - Razorpay: ownership, amount, signature, webhook, refunds, or deletion.
   - Add gateway mocks and sandbox integration tests.

3. **Auth and authorization.**
   - Single `lib/authz.ts`; route/role matrix tests.
   - Session versioning/revocation; owner passkey/2FA; staff PIN rotation; account lockout/backoff.
   - Remove `isNewUser`; protect OTP/phone enumeration.

4. **Data integrity.**
   - Migrate money to paise/Decimal.
   - Soft-delete products/categories; forbid cascade deletion of order items.
   - Model `RiderApplication`; remove runtime DDL.
   - Add retention/erasure jobs; revoke sessions on deletion.

5. **CI security gates.**
   - Add unit/integration tests, `npm audit --audit-level=high`, secret scanning, SAST, dependency review, SBOM.
   - Replace `db push` with migrations; add a staging deploy and smoke test.
   - Pin actions by SHA; use a non-root deploy user; backup before migrate; tag/rollback images.

**Phase 1 exit criteria:**
- Payment/refund tests cover success, failure, timeout, duplicate webhook, amount mismatch, cancellation, and Razorpay ownership.
- A double-cancel does not change stock/coupon/refund twice.
- Deactivated and demoted staff cannot access any staff data.
- Money fields are integer/Decimal and reconcile to the gateway.
- CI fails on critical/high vulnerabilities and authz regressions.

### Phase 2 — Operate it safely (3–6 weeks)

1. **Observability and SLOs:** health/readiness, structured logs with request IDs, error tracking, metrics/dashboards, alerts for payment failures, webhook lag, OTP spend, DB/Redis saturation, and deploy failures.
2. **Reliability:** zero-downtime deploy (blue-green/canary), DB migration expand/contract, rollback runbook, load/soak tests, Redis/Postgres tuning, queue for notifications/refunds/reconciliation.
3. **Backup/DR:** encrypted backups, PITR, restore drill, uploads backup, documented RPO/RTO.
4. **Security hardening:** CSP/COOP/CORP/Permissions-Policy, Origin checks, body/upload limits, secret manager, dependency policy, external penetration test.
5. **Compliance:** DPDP retention/erasure, consent/notice versioning, grievance/breach process, GST invoices, processor agreements, app privacy manifests.
6. **Mobile release:** release-build hardening, iOS plugin verification on device, Play Integrity/App Attest, Universal Links, staged rollout, crash reporting, version gate.
7. **Reconciliation and finance:** daily Cashfree/Razorpay settlement reconciliation, COD cash reconciliation, refund approvals, rider payout ledger, dispute runbook.

### Phase 3 — Scale and product maturity

- Multi-store/tenant model, delivery zones, capacity/slotting, inventory ledger, demand forecasting.
- Experimentation/feature flags, A/B testing, analytics with consent.
- Multi-region/read replicas, CDN, queue-based order pipeline, autoscaling.
- Support tooling: order search, refund/dispute console, customer timeline, audit search.
- Periodic pen tests, chaos/DR exercises, dependency and API lifecycle reviews.

---

## 8. Release gate (must all be true before “live”)

- [ ] All P0 findings closed and regression-tested.
- [ ] No critical/high dependency findings; Next.js and Node are supported versions.
- [ ] Cashfree production domain/app package whitelisted; production keys, webhook URL, IP allowlist, and API version verified in the dashboard.
- [ ] A real ₹1 payment and a real refund complete end-to-end; webhook signature, amount, and idempotency verified.
- [ ] Razorpay is either fully verified (ownership, amount, webhook, refund) or disabled.
- [ ] Unpaid/cancelled/delivered transitions cannot be forged; double-cancel is idempotent.
- [ ] Deactivated staff lose all access and device tokens immediately.
- [ ] No known/default credentials remain; `NEXTAUTH_SECRET` and owner credentials are strong and rotated.
- [ ] OTP abuse controls and distributed rate limits are active; no OTPs in production logs.
- [ ] Owner/manager backups are permissioned and audited.
- [ ] DPDP deletion/export tested; retention documented.
- [ ] Backup restore drill passed; rollback deploy tested.
- [ ] iOS and Android release builds tested on physical devices; payment flow works without raw plugin errors.
- [ ] APM/alerts/on-call and incident runbook are live.
- [ ] External penetration test or at least a focused security review is complete.

---

## 9. Limitations and open questions

**What I could not verify:**
- Production `.env.prod` values and whether `OWNER_PHONE`, `OWNER_PASSCODE`, `REVIEWER_*`, `DEMO_REVIEW_*`, and `NEXTAUTH_SECRET` are set safely. These must be checked on the server; do not paste secrets into chat.
- Cashfree merchant dashboard: domain/app whitelist, production keys, webhook URL, IP allowlist, enabled payment methods, API alerts.
- A live Cashfree/Razorpay payment, refund, or webhook replay.
- Physical iOS/Android device behavior; the screenshot was reviewed but the app was not attached.
- Load/soak behavior, backup restore, and production migration behavior.
- Full line-by-line review of the 811-line `MainActivity.java` Android bridge and the native payment SDK integration.

**Questions to resolve before launch:**
1. Is the production owner phone `9109066668` or the `seed.prod` default `9876500001`? Which `.env.prod` values are actually set?
2. Does the production database contain the old demo phone `9999999999` or any reviewer account?
3. Is the iOS build currently in TestFlight/App Store newer than commit `7fb605e`? Does it include `NativeUpiPlugin` in the archive and `packageClassList`?
4. Is Razorpay intended to be live, or only a fallback? If not live, remove it.
5. What are the legal retention requirements for orders, payment IDs, and rider applications?
6. Who is allowed to download the full customer backup, and where is it stored?

---

## 10. Appendix — commands run and files reviewed

**Commands**
```bash
npx tsc --noEmit                 # pass
npm run build                    # pass
npm run lint                     # pass, warnings only
npm audit --json                 # fail: 1 critical, 13 high, 5 moderate
npm audit --omit=dev --json      # fail: 1 critical, 10 high, 5 moderate
```

**High-value files reviewed**
- Auth: `lib/auth.ts`, `lib/otp.ts`, `lib/passcode.ts`, `middleware.ts`, `lib/rateLimit.ts`
- Orders/payments: `app/api/orders/*`, `app/api/payments/*`, `lib/orderStatus.ts`, `lib/cashfree.ts`, `lib/razorpay.ts`
- Access/data: `app/api/owner/*`, `app/api/ops/*`, `app/api/rider/*`, `app/api/user/*`, `prisma/schema.prisma`
- UI/mobile: `CartDrawer.tsx`, `UpiPaymentModal.tsx`, `capacitor.config.ts`, `ios/App/App/*`, `android/app/src/main/AndroidManifest.xml`
- Infra: `Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`, `Caddyfile`, `.github/workflows/ci.yml`, `DEPLOYMENT.md`
- Skills: Cashfree validation/testing and go-live checklists

**Positive controls observed**
- Server recomputes prices, delivery/handling fees, coupon limits, and stock; client prices are not trusted.
- Conditional `updateMany` stock decrement prevents overselling.
- Order creation has a per-user Redis lock and idempotency cache.
- Cashfree webhook uses raw-body HMAC verification.
- Rider applications and staff lookups use parameterized SQL.
- Caddy sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
- No user-controlled `dangerouslySetInnerHTML` or obvious DOM XSS sink was found; React escapes rendered values.
- Owner/staff-create hashing, order OTP generation (`crypto.randomInt`), and delivery OTP attempt limiting are good patterns to extend.

**Working tree note:** the checkout had pre-existing uncommitted product-image-gallery changes (`components/catalog/ProductImageCarousel.tsx`, `ProductImageGalleryEditor.tsx`, `lib/productImages.ts`, a migration, and edits to catalog pages/schema). They were not part of this audit and are not included in a `git pull`-based deploy until committed. Do not deploy a mixed working tree without reviewing them.

---

**Bottom line:** the app is a credible pilot, not a production payments system. Fix the four P0 money/auth issues first, then the state-machine and data-integrity work, then the operational and compliance layer. Do not accept live payments until the release gate is green.
