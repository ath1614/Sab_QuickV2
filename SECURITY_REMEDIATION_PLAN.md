# SabQuick — Security Remediation & Production Readiness: Implementation Plan

**Source audit:** [PRODUCTION_AUDIT_2026-10-28.md](PRODUCTION_AUDIT_2026-10-28.md)
**Scope:** All P0 and P1 findings, plus every M/L item that can be fixed in code. External dashboard, device, and infrastructure checks are listed separately and cannot be closed by a code change alone.

---

## 0. Current status (updated 2026-10-28)

`npx tsc --noEmit`, `npm run lint`, and `npm run build` pass on the working tree.

| Batch | State | Notes |
|---|---|---|
| **0** — test harness, secret sweep | **Partial** | Reviewer/demo credentials, owner default passcode, and script defaults are removed. **No test runner and no tests exist yet.** |
| **1** — auth, access, boot safety | **Done in code** | Fail-closed env validation (`instrumentation.ts` + `lib/env.ts`), reviewer/demo backdoor removal, owner passcode from env, `sessionVersion`/`disabledAt` revocation, staff deactivation transaction, OTP hashing + attempt lockout + send limits, scrypt PINs + `db:migrate-pins`. No `lib/authz.ts`; checks are inline per route. |
| **2** — payments, orders | **Partial** | Cashfree amount/currency/order checks, webhook HMAC + replay guard, `switch-cod` conditional update, client self-confirm removed from `confirm-upi`. **Razorpay not removed. No `PaymentClaim` claim flow, no manager `mark-paid` route, no `lib/orderState.ts`, no `Payment`/`Refund`/`AuditLog`/`WebhookEvent` models.** Direct-UPI customers now get a 402 with no way to submit a UTR for reconciliation. |
| **3** — PII, headers, uploads | **Partial** | Rider pre-accept PII, delivery OTP removed from push, backup OWNER-only, order stream auth, staff/customer edit guards. **CSP not added; `next.config.mjs` still allows arbitrary image hosts; upload MIME re-encoding not verified.** |
| **4** — deps, Docker, CI, health | **Not started** | `next` is still `14.2.24` (P0 advisory). No `/api/health`, no CI hardening, no log rotation. |
| **5** — money model, DDL, soft delete | **Not started** | Money is still `Float`; `lib/db-self-heal.ts` still runs runtime DDL from 15 files; `deliveryOtp` still defaults to `1234`; no soft delete. |
| **6** — external verification | **Not started** | Needs dashboard, keys, devices, and a restore drill. |

**Verdict:** the P0-1 (client-confirmable payment), P0-2 (reviewer backdoor), P0-3 (owner default), P0-5 (fail-open secrets), P0-6 (non-revocable sessions), and P1-6 (plaintext PINs) findings are closed in code. The build still ships a known-vulnerable Next.js, Razorpay is still present, and direct UPI has no reconciliation path — those must close before go-live.

---

## 1. Decisions this plan is built on

| Decision | Choice | Why |
|---|---|---|
| Payment gateway | **Cashfree only.** Remove Razorpay completely. | Stated by the owner; a half-integrated second gateway is an attack surface and a source of wrong-refund bugs. |
| Direct UPI (static VPA / QR) | **Keep as a claim, never as payment proof.** The customer submits a UTR, the order stays `PENDING`, and a MANAGER/OWNER confirms settlement against the bank statement. | Preserves the Blinkit/Zepto-style flow without allowing a client request to create a paid order. |
| Cashfree UPI intent (Android/iOS) | **Keep the native Cashfree UPI intent and the hosted WebView bridge.** They are the primary instant-verified UPI path and are not the same thing as the static-VPA flow. | The customer explicitly needs UPI apps to open on both platforms; this path already funnels every callback through server-side Cashfree verification. |
| Online payment success | **Only** a server-to-server Cashfree result (`order_status === "PAID"` with exact amount/currency) or an audited MANAGER/OWNER bank-settlement override may set `PAID`. | Closes P0-1 and makes the backend the single source of truth. |
| Owner login | Keep the existing phone + passcode screen exactly as it is. Remove every owner/reviewer credential from the repository and docs, require a **new** `OWNER_PASSCODE` through the environment (no default), hash it with scrypt, and keep it out of source. No forced rotation screen unless the owner asks for one; sessions are still revocable. | The owner asked to keep the login experience unchanged. Removing the source default and requiring a new env value closes the takeover path without changing how they sign in. |
| Staff login | Phone + 6-digit PIN, hashed at rest, lockout, forced rotation on first login. | Removes plaintext PINs and the 10,000-guess space. |
| Money representation | Move to integer paise. | Float money cannot be reconciled. This is a separate, data-migrating batch (Batch 5) so it does not block the security fixes. |
| Test framework | Add Vitest for unit + integration tests. Keep the existing `scripts/verify-*.ts` flows as smoke scripts. | The repo has no real test runner; security fixes need regression tests. |
| Deployment | Patch the current pipeline rather than introduce a new platform. Node 22 LTS, `prisma migrate deploy` only, pre-deploy backup, healthcheck, image tag, rollback. | Lowest operational risk for a single-VPS deployment. |

### Non-goals for this pass

- No PCI scope expansion: card data never touches the app; Cashfree hosts checkout.
- No full observability stack (APM/SLO/on-call). We add structured logs, request IDs, `/api/health`, and alert hooks; a managed APM is an external choice.
- No GST invoice engine or settlement reconciliation product. We add the ledger tables and the reconciliation report; statutory invoice format must be confirmed by the owner/CA.
- No App Store / Play Store submission. We harden the shell and verify the native plugin; store review is external.

---

## 2. Execution order and checkpoints

Each batch ends with `tsc`, lint, build, and the batch's own tests. A batch is not “done” until its acceptance checks pass.

| Batch | Theme | Findings closed | Depends on |
|---|---|---|---|
| **0** | Baseline, branch, test harness, secret hygiene | Prep for all | — |
| **1** | Boot-time secrets, auth, authorization, deactivation, OTP/rate limits, PINs | P0-2, P0-3, P0-5, P0-6, P1-5, P1-6, P1-14, P1-15, M-19 | 0 |
| **2** | Payments: remove Razorpay, Cashfree correctness, order state machine, refunds | P0-1, P1-1, P1-2, P1-3, P1-4, P1-12 (code side), M-1, M-2, M-3 | 1 |
| **3** | PII exposure, audit trail, CSRF, error handling, uploads, headers | P1-7, P1-8, M-4…M-10, M-18, M-21, M-24 | 1, 2 |
| **4** | Dependencies, Next.js, Docker, CI/CD, health, backups | P0-4, P1-10, M-11, M-13, M-14, M-20, M-23 | 0 |
| **5** | Money model, soft delete, schema cleanup, remove runtime DDL, account deletion, full test suite | P1-8 (final), P1-11, P1-13, M-5, M-6, M-8, M-17 | 2, 3 |
| **6** | External verification: Cashfree sandbox E2E, iOS rebuild, device tests, dashboard, restore drill | P1-9 device proof, Cashfree go-live checklist | 1–5 |

Batch 4 can run in parallel with Batch 1 if the Next.js upgrade is isolated. I will do Batch 4 immediately after Batch 1 so dependency risk is surfaced before the big payment rewrite.

---

## 3. Batch 0 — Baseline and test harness

### Work

1. **Preserve existing work.** The working tree already contains uncommitted product-gallery changes (`app/owner/catalog`, `components/catalog/*`, `lib/productImages.ts`, a new migration). I will not revert, stage, or overwrite them. I will take a patch snapshot for rollback and work on top.
2. **Add Vitest** (`vitest`, `@vitest/coverage-v8`) with `vitest.config.ts`, `tests/` directories, and `npm test` / `npm run test:watch` scripts. No test currently exists, so this is additive.
3. **Secret sweep.** Remove real-looking credentials from `PROJECT_CONTEXT.md` (Razorpay test keys), `APP_STORE_READINESS.md`, `journey_audit/2026-10-23/REVIEW.md`, `AUTH_FLOWS.md`, and hardcoded defaults in `scripts/*audit.mjs`, `scripts/verify-firebase-auth.ts`. Scripts take phone/code from args or env with no default.
4. **Ignore rules.** Add `build/`, `*.mobileprovision`, `.env*` (except examples), and generated iOS artifacts to `.dockerignore` / `.gitignore` where missing. Do not delete tracked files in this batch.

### Acceptance

- `npm test` runs (initially a placeholder suite that asserts the harness works).
- `grep` for the known reviewer phone/passcode/owner passcode returns no source or docs hits (except the audit report, which redacts them).
- No existing product-gallery file is modified by this batch.

---

## 4. Batch 1 — Identity, access, and boot safety

### 4.1 Fail-closed environment validation (P0-5)

**New:** `instrumentation.ts` with `register()` → `validateProductionEnv()`.
**Rewrite:** `lib/env.ts`.
**Note:** on Next 14, `instrumentation.ts` only runs with `experimental.instrumentationHook: true`; Batch 1 adds that flag, and Batch 4 removes it once Next 15+ is installed (where instrumentation is stable).

- Validate with Zod, not a list of names:
  - `NEXTAUTH_SECRET`: required in production, min 32 chars, rejected if it equals `local_development_secret_32_chars_minimum` or any known example.
  - `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`: required, HTTPS in production, same origin.
  - `DATABASE_URL`, `REDIS_URL`: required and parseable.
  - `OWNER_PHONE`: required, valid Indian mobile.
  - `OWNER_PASSCODE`: required in production, min 8 chars, not a known default, not all digits.
  - `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: required when `ONLINE_PAYMENTS_ENABLED=true`.
  - `ALLOW_MASTER_OTP`: must be `false`/absent in production.
  - `REVIEWER_PHONE`, `REVIEWER_PASSCODE`, `DEMO_REVIEW_PHONE`, `DEMO_REVIEW_OTP`: must be absent in production.
- Refuse to boot (throw before serving) if any check fails. No console-and-continue.
- `middleware.ts` no longer has a fallback secret. It reads `process.env.NEXTAUTH_SECRET` and returns 500 with a generic body if missing (middleware cannot run the full validator because it is Edge).
- `lib/auth.ts` no longer has a fallback secret.
- `scripts/verify-prod-config.ts` uses the same schema so CI and runtime cannot disagree.
- `docker-compose.prod.yml` stops defaulting `CASHFREE_API_VERSION` to a vulnerable/old value and passes the required vars through.

**Acceptance:** a production build with `NEXTAUTH_SECRET` unset, set to the dev value, or with `ALLOW_MASTER_OTP=true` exits non-zero. A JWT signed with the dev secret is rejected by middleware and API auth.

### 4.2 Remove reviewer/demo backdoors (P0-2)

**Modify:** `lib/auth.ts`, `app/api/auth/otp/send/route.ts`, `app/api/auth/otp/verify/route.ts`, `app/page.tsx`.

- Delete the reviewer branch and its OWNER upsert from `lib/auth.ts`.
- Delete the `DEMO_REVIEW_PHONE` / `DEMO_REVIEW_OTP` bypass from both the credentials provider and `/api/auth/otp/verify`.
- Delete the reviewer special-case from `/api/auth/otp/send`.
- Remove `session.user.phone === "9999999999"` from `app/page.tsx`.
- Remove `isNewUser` from OTP responses (M-19).
- `ALLOW_MASTER_OTP` remains only for CI/dev and is checked by the boot validator; production refuses to start if true.
- No code path can auto-create an OWNER account. Owner provisioning happens only through the explicit owner branch with a valid passcode, or through `db:seed:prod` with required env.

**Acceptance:** the known reviewer phone/passcode and demo phone/OTP are rejected in a production build; no reviewer/demo branch remains in the bundle.

### 4.3 Owner credential policy (P0-3)

**Modify:** `lib/auth.ts`, `prisma/seed.ts`, `prisma/seed.prod.ts`, `DEPLOYMENT.md`, `.env.example`, `.env.prod.example`.

- Single source of truth: `OWNER_PHONE`, `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSCODE`.
- `lib/auth.ts` no longer provisions `140974`; if the owner row has no PIN and `OWNER_PASSCODE` is missing, login fails with “Owner account not provisioned. Contact the administrator.”
- The owner PIN is always stored as `scrypt:...`. Remove the plaintext branch for owner.
- `prisma/seed.ts` (dev) uses the same `OWNER_PHONE` / `OWNER_PASSCODE` values and hashes the passcode; `prisma/seed.prod.ts` requires them and refuses to run with defaults.
- Do **not** force a rotation screen; the login flow stays the same. The passcode must come from `OWNER_PASSCODE`, so the value that was previously in the repository is no longer accepted after the operator sets a new one.
- Add an optional `POST /api/owner/security/rotate-passcode` (OWNER only, requires current passcode, min 8 chars, increments `sessionVersion`, deletes other sessions, audit log).
- Add an optional owner “Security” panel in `app/owner/page.tsx`; it is not a login blocker.
- Deployment runbook switches to `npm run db:seed:prod`; `npx prisma db seed` is documented as dev-only.

**Acceptance:** no default owner credential exists in source; startup fails if owner provisioning is incomplete; the owner can rotate the passcode and all prior sessions stop working.

### 4.4 Session revocation and staff deactivation (P0-6)

**Schema:** `User.sessionVersion Int @default(0)`, `User.disabledAt DateTime?`, `User.pinChangedAt DateTime?`, `User.mustChangePin Boolean @default(false)`.

**Modify:** `lib/auth.ts` (jwt/session callbacks), `app/api/owner/staff/route.ts`, `middleware.ts`, all staff/rider/owner routes.

- JWT callback re-reads `role`, `roles`, `sessionVersion`, `disabledAt`.
- If `disabledAt` is set or `token.sessionVersion !== user.sessionVersion`, mark the token invalid (`token.invalid = true`, clear `id`/`role`/`roles`).
- Session callback returns an empty user for invalid tokens.
- Middleware rejects `token.invalid`.
- `DELETE /api/owner/staff` becomes a transaction:
  - `role: CUSTOMER`, `roles: [CUSTOMER]`, `pin: null`, `disabledAt: now`, `sessionVersion: { increment: 1 }`.
  - `riderProfile.isOnline = false`.
  - `deviceToken.deleteMany({ userId })`.
  - Audit log entry with actor/target.
- Re-activation (staff POST for an existing `disabledAt` user) clears `disabledAt` and increments `sessionVersion`, requiring a new login.
- Staff POST/PATCH never returns `pin`.

**Acceptance:** an ex-MANAGER/ex-RIDER/ex-PACKER gets 403 on every staff/rider/owner API and cannot open staff pages; device tokens are gone; an old JWT stops working immediately after deactivation.

### 4.5 One authorization helper (P1-15)

**New:** `lib/authz.ts`.

- `getAuthContext()`: reads the session, loads the fresh user (`id`, `role`, `roles`, `disabledAt`), returns `null` if invalid.
- `requireUser()`, `requireRole(role)`, `requireAnyRole(roles)`, `requireOwner()`, `requireStoreStaff()`, `requireRiderForOrder(orderId)`, `requireCustomerOwns(order)`.
- `effectiveRoles(user)` = `roles.length ? roles : [role]`, but `role` must always be one of the effective roles. A user with `role=CUSTOMER` and `roles=[MANAGER]` is treated as MANAGER by the helper; the deactivation path removes both.
- Replace direct `session.user.role` checks in every route that touches orders, payments, staff, backups, or PII.
- Add `/api/ops` to middleware's protected prefixes (defense in depth; route-level checks remain authoritative).

**Acceptance:** a route/role matrix test proves allowed/denied for OWNER, MANAGER, PACKER, RIDER, CUSTOMER, and deactivated staff on every sensitive route.

### 4.6 OTP and rate-limit hardening (P1-5, P1-14)

**Modify:** `lib/otp.ts`, `lib/rateLimit.ts`, `lib/sms.ts`, `app/api/auth/otp/send/route.ts`, `app/api/auth/otp/verify/route.ts`, `middleware.ts`, `app/api/user/delete-account/route.ts`.

- OTP: 6 digits via `crypto.randomInt(100000, 1000000)`.
- Store an HMAC-SHA256 of the OTP with a server pepper, not the plaintext code. Compare with `crypto.timingSafeEqual`.
- Attempt counter is independent of issuance:
  - key `otp:attempts:${phone}` with 15-minute TTL,
  - increment on every failed verification,
  - lock at 5 failures,
  - reset **only on successful verification**, never on send.
- Send cooldown stays 60 seconds per phone; add a per-IP send limit in Redis.
- `/api/auth/otp/verify` gets the same attempt counter and lockout as the NextAuth path.
- Remove `resetOtpAttempts()` from the send route.
- Remove `console.log` of OTPs in production. Dev display only when `NODE_ENV !== "production"` and `OTP_DELIVERY_MODE=display`.
- Remove the prefetch exemption for `/api/*`; keep a narrow exemption only for page `GET`s if measurements show it is needed.
- `getClientIp` uses `x-real-ip` (set by Caddy from `{remote_host}`) and ignores `CF-Connecting-IP` unless an explicit `TRUST_CLOUDFLARE=true` is set. Caddy overwrites `X-Real-IP` and `X-Forwarded-For`; the app port is not published.
- Add a Redis-backed `enforceRateLimit({ key, limit, windowMs })` used at the top of OTP send/verify, login, order create, payment create/verify, upload, and account-deletion routes. Middleware keeps a coarse in-memory flood shield but is no longer the authoritative limiter.
- Account-deletion OTP uses the same 6-digit generator/hash/attempt logic.

**Acceptance:** OTP brute force is bounded by a per-phone counter that survives re-sends; rotating `CF-Connecting-IP` does not create a new bucket; a prefetch header does not bypass API limits; no OTP appears in production logs.

### 4.7 Staff PIN storage (P1-6)

**Modify:** `lib/passcode.ts`, `app/api/owner/staff/route.ts`, `app/owner/page.tsx`.
**Delete/merge:** `app/api/owner/staff/create/route.ts` (dead code; the UI uses `/api/owner/staff`).

- Schema validation: PIN is 6 digits (not 4).
- Both create and update paths call `hashPasscode(pin)`; never write plaintext.
- `verifyPasscode` no longer accepts plaintext after the one-time migration runs. During the migration window it accepts plaintext, re-hashes, and writes an audit entry.
- Add `scripts/migrate-pin-hashes.ts`: idempotent, finds non-`scrypt:` values, hashes them, logs counts only (never the values). Run once during deploy before the new code serves traffic.
- UI `maxLength=6`, numeric input, confirmation field, “PIN changed on next login” flag.
- Owner can reset a staff PIN; the reset sets `mustChangePin=true` and increments `sessionVersion`.

**Acceptance:** no plaintext PIN can be written or read through any API; the migration leaves zero non-hashed PINs; a 4-digit PIN is rejected.

---

## 5. Batch 2 — Payments, orders, refunds

### 5.1 Remove Razorpay completely (P1-3)

**Delete:** `lib/razorpay.ts`, `app/api/payments/razorpay/**`, `scripts/verify-razorpay-coupons-catalog.ts` (replace its non-Razorpay assertions in the new test suite).
**Modify:** `package.json` (remove `razorpay`), `prisma/schema.prisma`, `lib/env.ts`, `.env.example`, `.env.prod.example`, `docker-compose.prod.yml`, `Dockerfile`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `PROJECT_CONTEXT.md`, `lib/orderStatus.ts`, `lib/orderHygiene.ts`, `app/api/orders/**`, `app/api/ops/orders/route.ts`, `app/api/rider/orders/collect-payment/route.ts`, `components/**` references.

- Remove `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature` columns.
- Migrate any existing `RAZORPAY` orders to `ONLINE_PREPAID`; rebuild the `PaymentMethod` enum to `ONLINE_PREPAID`, `UPI_DOORSTEP`, `CASH_ON_DELIVERY` in one Prisma migration. The API still accepts the string `"CASHFREE"` as an alias and normalizes it to `ONLINE_PREPAID`.
- Remove Razorpay from privacy/terms copy: Cashfree is the only online processor.
- Rotate the exposed Razorpay test keys and purge them from git history in a separate, owner-approved history rewrite. Purging the current tree is in scope; rewriting history is not done silently.

**Acceptance:** `grep -ri razorpay` returns only the audit/plan/history notes; no Razorpay route, dependency, env var, or DB column remains; the app builds without it.

### 5.2 Stop client-confirmed payments (P0-1, P1-1)

**Rewrite:** `app/api/orders/[orderNumber]/confirm-upi/route.ts` → payment claim endpoint.
**New:** `app/api/ops/orders/[orderId]/mark-paid/route.ts`.
**Modify:** `components/cart/UpiPaymentModal.tsx`, `app/orders/[orderNumber]/page.tsx`, `components/orders/OrderTrackerClient.tsx`.

- Customer path (`POST /api/orders/[orderNumber]/payment-claim`):
  - Requires session and ownership.
  - Allowed only when `paymentStatus === PENDING` and `status === PENDING`.
  - UTR is required, 12 digits, unique across claims; `appUsed` is an enum/allowlist, not free text.
  - Creates a `PaymentClaim` row (`PENDING`), publishes a staff alert, returns `202 { status: "AWAITING_VERIFICATION" }`.
  - **Never** changes `Order.paymentStatus` or `Order.status`.
  - Rate-limited per user/order (3 claims / 10 minutes).
  - If Cashfree is configured and the order has a Cashfree reference, the route may call the shared settlement function; only a verified Cashfree `PAID` result can settle. Otherwise the claim waits for staff.
- Staff path (`POST /api/ops/orders/[orderId]/mark-paid`):
  - MANAGER/OWNER only.
  - Requires a reason and either a UTR or a Cashfree payment ID.
  - Allowed only from `PENDING`; writes `PaymentClaim.REVIEWED`, `Payment` (`MANUAL`), `OrderStatusHistory`, `AuditLog`, sets `PAID`/`CONFIRMED`; idempotent.
- UI:
  - UPI modal becomes “I have paid” → submits claim → shows “Payment submitted. The store will verify it against the bank statement.” No confetti, no automatic cart clear until the claim is accepted.
  - Order tracker shows `AWAITING_VERIFICATION` and the submitted UTR to the customer; staff see the claim queue.
  - Remove the “1234” delivery-OTP fallback from the order page; if missing, show “OTP unavailable” and log, never a default.

### 5.2a UPI flow audit (Android/iOS) — what is kept and what is changed

There are **three** UPI paths in the code today, and they must not be confused:

| Path | Where it lives | Current safety | Decision |
|---|---|---|---|
| **Cashfree native UPI intent** — `CFUPI.Mode.INTENT` with the chosen package (PhonePe, GPay, Paytm) | `lib/upi.ts` → `NativeUpiPlugin.swift` / `MainActivity.java` → Cashfree SDK | **Keep.** The SDK callback only reports that the customer returned; `CartDrawer` then calls `verifyCashfreePaymentOnServer`, which queries Cashfree. | Keep, and harden `verify` as in §5.5. This is the primary instant-verified UPI path. |
| **Cashfree hosted checkout inside the WebView** — `window.Android` / `nativeProcess` bridge enumerates installed UPI apps and opens the chosen one | `MainActivity.java` (`CashfreeUpiBridge`), `AppDelegate.swift` (`nativeProcess`), `CartDrawer` hosted fallback | **Keep.** The page's `showVerifyUI` / `verifyPaymentForiOS` only advances the checkout; settlement still comes from Cashfree. | Keep for older builds, sideloaded APKs blocked by Cashfree Integrity, cards, and the “any UPI app” path. |
| **Direct static-VPA UPI** — `upi://pay?pa=<store VPA>` built in `lib/upi.ts`, opened by `launchUpiPayment`, confirmed by `confirm-upi` | `UpiPaymentModal.tsx`, `app/api/orders/[orderNumber]/confirm-upi/route.ts` | **Unsafe.** `confirm-upi` sets `PAID` even when Cashfree found nothing and even when no UTR was supplied. | Convert to a **claim**: require a UTR, store `PaymentClaim`, leave the order `PENDING`, staff reconcile. Keep the UI so customers who need zero-fee direct UPI can still use it. |

**The iOS error in the screenshot is a build/deployment problem, not a code-path problem.** `SceneDelegate.swift` registers `NativeUpiPlugin` in `capacitorDidLoad()` before the WebView loads, and `AppDelegate` registers the `nativeProcess` handler. The installed TestFlight/App Store build predates that registration. Batch 6 rebuilds the archive and verifies the plugin is present in `packageClassList` and in the binary. Do not “fix” this by adding more JS fallbacks; the source already has them.

**The Android bridge is not a payment trust boundary.** `getAppList`/`openApp` only launch a UPI app; `showVerifyUI` is a page signal. No amount is trusted from the bridge, and none should be. The server check in §5.5 remains the only settlement authority.

**Acceptance:** an unpaid customer calling any endpoint cannot move an order to `PAID`; the order stays `PENDING`; stock/coupon unchanged; a manager override is audited and idempotent.

### 5.3 `switch-cod` guards (P1-1)

- Allowed only when `status === PENDING`, `paymentStatus === PENDING`, and `paymentMethod === ONLINE_PREPAID`.
- Transaction with a conditional update (`where: { id, status: PENDING, paymentStatus: PENDING }`).
- Reject `PAID`, `DELIVERED`, `CANCELLED`, `OUT_FOR_DELIVERY`, `PACKING`, `READY_FOR_PICKUP`.
- On success: `paymentMethod: CASH_ON_DELIVERY`, `status: CONFIRMED`, audit + status history, one dispatch event.

**Acceptance:** switching COD on a paid/delivered/cancelled order returns 409 and changes nothing.

### 5.4 Order state machine and idempotent cancellation (P1-2)

**New:** `lib/orderState.ts`.

| From | Allowed to | Actor |
|---|---|---|
| `PENDING` | `CONFIRMED`, `CANCELLED` | system (payment) / customer (cancel) / MANAGER+ |
| `CONFIRMED` | `PACKING`, `CANCELLED` | PACKER (packing), customer before packing, MANAGER+ |
| `PACKING` | `READY_FOR_PICKUP`, `CANCELLED` | PACKER, MANAGER+ |
| `READY_FOR_PICKUP` | `OUT_FOR_DELIVERY`, `CANCELLED` | MANAGER+ / assigned RIDER for pickup |
| `OUT_FOR_DELIVERY` | `DELIVERED`, `CANCELLED` | assigned RIDER (with OTP/collection), MANAGER+ |
| `DELIVERED` | — | — |
| `CANCELLED` | — | — |

- `updateOrderStatus(orderId, next, actor, opts)`:
  - rejects illegal transitions and wrong actors,
  - uses `updateMany({ where: { id, status: current } })` so concurrent callers cannot both win,
  - writes `OrderStatusHistory`,
  - only after the transaction commits publishes Redis events and sends push.
- `PACKER` may only send `PACKING` / `READY_FOR_PICKUP`. It may not cancel, deliver, or refund.
- `RIDER` may only act on an assigned order and only the rider transitions.
- Cancellation runs in one transaction:
  - claim the order with a conditional update,
  - restore stock once,
  - decrement coupon once,
  - create a `Refund` row (`PENDING`) if `paymentStatus === PAID`,
  - set `paymentStatus` to `REFUND_PENDING` (new enum value) rather than `REFUNDED`,
  - call Cashfree outside the transaction with a deterministic refund ID; on failure set `REFUND_FAILED`, alert, and keep the refund visible to operations.
- Refund provider is Cashfree only. There is no Razorpay branch.
- `PaymentStatus` adds `REFUND_PENDING`, `REFUND_FAILED`.
- Add `OrderStatusHistory`, `AuditLog`, `Payment`, `Refund`, `WebhookEvent`, `PaymentClaim` models in the same migration.

**Acceptance:** double cancellation restores stock/coupon once and creates one refund; a second concurrent cancellation gets 409; a PACKER cannot cancel or deliver; an out-of-order transition is rejected.

### 5.5 Cashfree correctness (P1-4, M-1, M-2, M-3)

**Rewrite:** `lib/cashfree.ts`; `app/api/payments/cashfree/create-order`, `verify`, `webhook`.

- API version defaults to `2026-01-01`; one constant, used by every call. Remove `2023-08-01` from env examples and compose.
- `create-order`:
  - session + ownership (or MANAGER/OWNER),
  - only `PENDING` unpaid orders,
  - amount from the DB, never the client,
  - fixed `return_url` from `NEXTAUTH_URL`/`APP_URL`, validated against an allowlist; never `Origin`/`Host`,
  - idempotent: if `cashfreeOrderId` exists and Cashfree says the order is `ACTIVE`, reuse; if `PAID`, settle; if expired, create a new order ID and **store it** (merchant order id + cf order id + session id are separate columns).
- `verify`:
  - requires a session and ownership (or MANAGER/OWNER); no public confirm,
  - only `PENDING` orders,
  - fetches by the stored merchant order ID, requires `order_status === "PAID"`,
  - requires a `SUCCESS` payment with `payment_amount === order.totalAmount` (exact, not `>=`) and `payment_currency === "INR"`,
  - settles in one transaction, idempotent on `providerPaymentId`.
- `webhook`:
  - timestamp skew ≤ 5 minutes,
  - `crypto.timingSafeEqual` for the HMAC,
  - parse `type`, `data.order.order_id`, `data.payment.*`,
  - match the stored merchant order ID; reject unknown/other order IDs,
  - exact amount/currency check,
  - event key from `x-idempotency-key` or `cf_payment_id:eventType`; insert `WebhookEvent` with a unique `(provider, eventId)`; duplicate → 200 without side effects,
  - settlement and event insert in one transaction; invalid signature → 401; malformed → 400.
- Settlement shared with verify in `lib/payments/settle.ts`; only this function can set `PAID`.
- `createCashfreeRefund` uses `refund_id` from the `Refund` row (`sq_refund_<orderNumber>_<seq>`), so retries are idempotent.
- Replace message-text branching with `data.code` (`order_already_exists`) and HTTP status. Keep a log of the raw error for unknown cases.
- Caddy: allowlist Cashfree webhook source IPs from the dashboard; the app also verifies the signature. The IP list is an external configuration item.

**Acceptance:** amount mismatch, wrong currency, wrong order ID, replayed webhook, and unauthenticated verify are all rejected; a valid webhook settles exactly once; a retried refund creates one Cashfree refund.

### 5.6 Payment ledger (P1-12, code side)

- `Payment`: one row per gateway attempt/settlement with provider, provider order/payment IDs, amount/currency, status, method, raw response hash, timestamps.
- `Refund`: one row per refund request with provider refund ID, amount, status, reason, requester, timestamps.
- `PaymentClaim`: one row per direct-UPI claim with UTR, app, status, reviewer.
- `WebhookEvent`: replay protection.
- `OrderStatusHistory` and `AuditLog` cover every state change and every manual money action.
- Owner refund screen: list paid orders, request refund with reason, approve/cancel; shows gateway status. No silent refunds.
- Daily reconciliation script (`scripts/reconcile-payments.ts`) compares Cashfree orders/payments with `Payment`/`Order` for a date range and prints mismatches; scheduled externally (cron).

**Acceptance:** every `PAID` order has exactly one settled `Payment`; every `REFUNDED`/`REFUND_PENDING` order has a `Refund`; reconciliation finds no unexplained mismatch in a seeded test day.

---

## 6. Batch 3 — PII, audit, CSRF, uploads, headers

### 6.1 Data minimization (P1-7)

- `/api/owner/backup`: OWNER only (not MANAGER); `AuditLog` entry before streaming; exclude `pin`, session tokens, and internal fields; paginate or stream; `Cache-Control: no-store`.
- `/api/rider/status`: available orders show order number, item count, area/landmark, distance, and pay; **no** flat/building, coordinates, customer name, or phone until the rider accepts. After accept, full details for that order only.
- `/api/orders/[orderNumber]` page and `/stream`: 
  - customer sees own order,
  - assigned rider sees the order,
  - PACKER/MANAGER/OWNER see operational data,
  - unassigned riders see none,
  - OTP only to the customer (and the assigned rider at delivery).
- `lib/notifications.ts`: remove the delivery OTP from push bodies. Say “Open the order to view your delivery code.”
- `/api/owner/customers`: PATCH only targets `role=CUSTOMER`; cannot edit staff/owner; audit before/after; no phone change without a verification flow.
- Add `AuditLog` writes for backup downloads, staff changes, customer edits, order status changes, refunds, manual payment overrides, and data exports.

### 6.2 Account deletion and retention (P1-8)

- Deletion transaction:
  - redact address `flatBuilding`, `streetArea`, `landmark`, **latitude/longitude** (set to store coordinates or null after making them nullable),
  - delete unlinked addresses,
  - delete `RiderApplication` rows for the phone,
  - delete `LaunchSubscriber` rows for the phone/email,
  - redact order `paymentTxnId` where not legally required; keep order amount/date for tax,
  - delete device tokens,
  - anonymize user, set `disabledAt`, increment `sessionVersion`.
- Document retention in `PRIVACY.md` / privacy page: financial records retained per statutory requirement; PII minimized.
- Add a DPDP erasure test: after deletion, the old JWT gets 401, phone search returns nothing, coordinates are gone, and the order remains for accounting without PII.

### 6.3 API errors, no-store, CSRF (M-4, M-9, M-10)

- **New** `lib/apiError.ts`: `toApiError(error, requestId)` logs the real error with a request ID and returns `{ error: "Something went wrong.", requestId }`. No Prisma/SQL text in responses.
- Apply to all routes that currently return `error.message`. Keep specific 4xx validation messages.
- **New** `lib/csrf.ts`: `assertSameOrigin(req)` for `POST`/`PATCH`/`PUT`/`DELETE`. Accept only `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and explicitly configured origins; reject missing `Origin` for cookie-authenticated mutations (allow native app requests with a custom `X-Requested-With`/app header if needed).
- All authenticated API responses get `Cache-Control: private, no-store` (helper or route wrapper).
- Add `requestId` to logs and error responses; no PII in logs.

### 6.4 Uploads (M-5, M-6)

- Decode with `sharp` (already a dependency), verify the real format (JPEG/PNG/WebP only), re-encode to WebP, strip metadata, cap dimensions (e.g. 2000×2000).
- Reject SVG/GIF/AVIF uploads for now (SVG is an XSS vector; GIF/AVIF not needed).
- Async `fs.promises.writeFile`, random filename, `0600`-ish permissions.
- Per-user/role quota: max 20 uploads/hour and a total disk budget check before writing.
- `app/api/uploads/[...path]`: use `path.relative(uploadsDir, target)` and reject `..`, absolute paths, and symlinks; `Content-Type` from a strict extension map; `X-Content-Type-Options: nosniff`; no `Access-Control-Allow-Origin: *`.
- Prefer Cloudinary/ImgBB when configured; local storage is the fallback.

### 6.5 Headers and CSP (M-9, M-21)

- `next.config.mjs`: `poweredByHeader: false`, `images.remotePatterns` limited to the app host, `images.unsplash.com` (only if used), Cashfree CDN if needed, and the configured CDN hosts. `minimumCacheTTL`, `deviceSizes`/`imageSizes` bounded; disable SVG optimization (`dangerouslyAllowSVG: false`).
- CSP (nonce-based for pages, report-only first, then enforce):
  - `default-src 'self'`
  - `script-src 'self' 'nonce-...' https://sdk.cashfree.com https://checkout.razorpay.com` (Razorpay removed; keep only Cashfree)
  - `connect-src 'self' https://api.cashfree.com https://sandbox.cashfree.com https://*.googleapis.com https://nominatim.openstreetmap.org`
  - `img-src 'self' data: blob: https://*.tile.openstreetmap.org https://images.unsplash.com https://*.cashfree.com`
  - `frame-src https://sdk.cashfree.com https://*.cashfree.com`
  - `style-src 'self' 'unsafe-inline'` (Tailwind/Leaflet inline styles)
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
- Add `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` (camera/mic/geolocation restricted), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` in both Next and Caddy (Caddy is the edge; keep both consistent).
- `app/auth/mobile-return/page.tsx`: remove the inline script; use a client component with a nonce or a server redirect.
- `middleware.ts`: remove the scanner regex as a security control (keep as a cheap 403 if desired, documented as cosmetic).

---

## 7. Batch 4 — Dependencies, Docker, CI/CD, health, backups

### 7.1 Next.js and dependency remediation (P0-4)

- Upgrade `next` to the newest patched 15.5.x first; if `npm audit` still reports the critical advisory, move to 16.4.x. Upgrade React/React DOM to the version Next requires, plus `eslint-config-next`.
- Adapt to Next 15/16 breaking changes: async `cookies()`/`headers()`/`params`, `serverExternalPackages` for Prisma/sharp, and the new image config defaults. Keep `output: "standalone"`.
- Fix the resulting type/build issues; do not use `npm audit fix --force`.
- Resolve the remaining high advisories:
  - `sharp` ≥ 0.35.5,
  - `zod` 4.x (adapt schemas: `error.issues`, email/url APIs),
  - `firebase` update or `overrides` for `@grpc/grpc-js` ≥ 1.13.6,
  - `follow-redirects` ≥ 1.16.1,
  - `brace-expansion`, `glob`, `source-map-js` via lockfile/overrides.
- Add `overrides` only when the parent cannot be upgraded; document each one.
- Confirm `npm audit --omit=dev --audit-level=high` is clean.
- Re-run the full build and the Cashfree/order verification scripts after the upgrade.

### 7.2 Docker and compose

- Node 22 LTS in `Dockerfile` and CI (Capacitor already uses 22).
- `.dockerignore`: `.env`, `.env.*` (except examples), `build/`, `ios/App/build`, `journey_audit`, `*.mobileprovision`, `backups/`.
- Runtime image: non-root `nextjs` (already), `HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e ... /api/health`.
- Compose: `app` healthcheck; `caddy` `depends_on: app: condition: service_healthy`; do not publish the app port; Redis `maxmemory`/`maxmemory-policy`; Postgres connection limits; log rotation (`logging: json-file: max-size/max-file`).
- Remove hardcoded default Firebase values from compose? Public Firebase config is not secret, but defaults hide misconfiguration. Require them explicitly in production.

### 7.3 CI/CD

- CI Node 22; `npm ci`; `prisma generate`; `prisma migrate deploy` **only** (remove `db push`); seed; `npm test`; `tsc`; `lint`; `build`; `npm audit --omit=dev --audit-level=high`; secret scan (gitleaks); upload test reports.
- Pin GitHub Actions to commit SHAs; add a `production` environment with required reviewers for deploy.
- Deploy:
  - non-root deploy user with a narrow sudoers rule for `docker compose` only,
  - no hardcoded IP/root fallback,
  - `pg_dump` backup before migrations, upload to R2 with encryption,
  - build an image tagged with `GIT_SHA`,
  - run `prisma migrate deploy` once in a one-off container; fail the deploy on error,
  - start the new app, poll `/api/health`, and roll back to the previous image if unhealthy,
  - keep the previous image for rollback; remove the `|| true` migration loop and the `ALTER TABLE pin` hack.
- Add `scripts/backup-db.sh` encryption (age/GPG) and a restore drill; document RPO/RTO.
- Remove `--force-recreate` in favor of a health-gated recreate; if brief downtime is acceptable, document it.

### 7.4 Health, logs, backups (M-11, M-13)

- `app/api/health/route.ts`: `SELECT 1` + Redis `PING`; 200 `{ status: "ok", db: "ok", redis: "ok" }`, 503 otherwise; no secrets; cached for 5 seconds.
- Structured JSON logs with `requestId`, route, status, duration, userId (hashed); no PII, OTPs, PINs, or tokens.
- Docker log rotation; disk alert hook.
- Encrypted Postgres backups + uploads-volume backup; monthly restore test documented.

---

## 8. Batch 5 — Data integrity, money model, removal of runtime DDL

### 8.1 Runtime DDL removal (P1-13)

- Delete `lib/db-self-heal.ts` and all 34 call sites.
- Move every DDL statement into a Prisma migration:
  - `pin`, `roles`, Cashfree columns, `offline*`, `imageUrls`, `DeviceToken`, `ThemeConfig.isStoreLive/launchDate`, `LaunchSubscriber`, `RiderApplication`, FK changes.
- Add `prisma/migrations/..._repair_legacy_schema/migration.sql` for legacy databases, idempotent, run manually and audited.
- Startup readiness checks migration status (`_prisma_migrations`), never mutates schema.
- CI fails if `prisma migrate diff` shows drift.

### 8.2 Money as integer paise (P1-11)

- Add `*Paise Int` columns for `Product.mrp/salePrice`, `Order.subtotal/deliveryFee/handlingFee/tipAmount/totalAmount/discountAmount`, `OrderItem.price`, `Coupon.discountValue/minOrderAmount/maxDiscount`.
- Backfill with `ROUND(value * 100)` in a migration; keep the Float columns temporarily for rollback.
- Convert API and UI at the boundary (`formatPaise`, `toPaise`); Cashfree receives rupees (`paise / 100`).
- After one release with no mismatches, drop the Float columns.
- Add a reconciliation assertion: `Order.totalAmount` equals the sum of items + fees − discount + tip.

### 8.3 Soft delete and order history (P1-11, M-8, M-17)

- `Product.deletedAt`, `Category.deletedAt`; all catalog queries filter `deletedAt: null`.
- `OrderItem.product` relation `onDelete: Restrict`; add snapshot fields (`productTitle`, `productUnit`, `productImageUrl`) so historical orders render even if a product is archived.
- Remove the code that deletes order items before deleting a product/category.
- Coupon deletion: soft delete or unlink only with an audit trail; never mutate historical orders.
- `@@unique([orderId, productId])` on `OrderItem`.
- `deliveryOtp` no longer defaults to `"1234"`; backfill existing rows with random 4-digit values in a migration.

### 8.4 Model cleanup

- Add `RiderApplication` to Prisma; remove the raw-SQL creation.
- Make `roles` the source of truth; keep `role` as the primary role for compatibility, with a DB trigger/check or application invariant. Add a one-time script to repair rows where `role` is not in `roles`.
- Add `AuditLog`, `OrderStatusHistory`, `Payment`, `Refund`, `WebhookEvent`, `PaymentClaim`, `Session` (optional) models.
- Add indexes for the new query paths (`AuditLog(createdAt)`, `Payment(orderId)`, `Refund(orderId)`, `WebhookEvent(provider,eventId)` unique, `PaymentClaim(orderId,status)`).

### 8.5 Account deletion finalization

- Complete the retention/anonymization work from §6.2 once the new models exist.
- Add the deletion test to CI.

---

## 9. Batch 6 — External verification (cannot be completed by code alone)

These are release gates, not code tasks. I will surface them again before any “go live” statement.

| Item | What is needed | Owner action |
|---|---|---|
| Cashfree domain/app whitelist | Dashboard → Developers → Whitelisting: production domain, Android package, iOS bundle | Owner |
| Cashfree webhook URL + secret | Dashboard webhook to `https://<domain>/api/payments/cashfree/webhook`; same secret as `CASHFREE_SECRET_KEY` | Owner |
| Cashfree API version | Confirm `2026-01-01` is enabled for the account; sandbox test first | Owner + me |
| Cashfree sandbox E2E | `CASHFREE_ENV=SANDBOX` keys in a local `.env`; run create → pay → webhook replay → verify → refund | Me, with sandbox keys |
| Cashfree production ₹1 test | Only after all P0/P1 checks pass; test payment + refund | Owner + me |
| Cashfree webhook IP allowlist | IP list from Cashfree dashboard/docs | Owner |
| iOS archive rebuild | Rebuild after the plugin registration fix; verify `NativeUpiPlugin` in `packageClassList` and the binary; test on a physical iPhone | Owner/device |
| Android release build | `allowMixedContent=false`, `usesCleartextTraffic=false`, `allowBackup=false`, debug off; test on a release APK | Me + owner/device |
| Play Integrity / App Attest | Google Play Console + Apple entitlement setup | Owner |
| VPS deploy user + SSH key | Non-root user, scoped sudoers, no root login | Owner |
| R2 backup credentials | Bucket + encrypted backup policy | Owner |
| Production env values | `NEXTAUTH_SECRET`, `OWNER_PHONE`, `OWNER_PASSCODE`, Cashfree keys, `NEXTAUTH_URL` | Owner (never paste secrets in chat) |
| APM/alerting | Choose a provider (Sentry/OpenTelemetry/etc.) | Owner |

---

## 10. Verification matrix

| Check | When | Pass criteria |
|---|---|---|
| `npx tsc --noEmit` | Every batch | No errors |
| `npm run lint` | Every batch | No errors (warnings reviewed) |
| `npm run build` | Every batch | Standalone build succeeds |
| `npm test` | Every batch after Batch 0 | All unit/integration tests pass |
| `npm audit --omit=dev --audit-level=high` | Batch 4 and final | Zero critical/high |
| `grep` secret sweep | Batch 0 and final | No reviewer/demo/default credentials, no live keys |
| Auth matrix tests | Batch 1 | All roles + deactivated staff behave as specified |
| Payment regression tests | Batch 2 | Unpaid confirm rejected; amount mismatch rejected; duplicate webhook once; double cancel once; refund idempotent |
| Order state tests | Batch 2 | Illegal transitions rejected; PACKER cannot cancel/deliver |
| PII tests | Batch 3 | Rider pre-accept sees no address/phone; backup OWNER-only + audited; OTP absent from push |
| Migration test | Batch 5 | `prisma migrate deploy` on a fresh DB and on a legacy dump; no drift |
| Health check | Batch 4 | 200 when DB/Redis up; 503 when either is down |
| Cashfree sandbox E2E | Batch 6 | Create → pay → webhook → verify → refund, with replay |
| Mobile release test | Batch 6 | Physical iOS + Android release build; native sheet or hosted fallback; server verification |
| Backup restore | Batch 6 | Restore into a scratch DB; row counts and a sample order match |

**Commands that will not be treated as proof:** a successful build alone, a `tsc` pass alone, or a curl that returns 200. Each acceptance item above has a behavioral assertion.

---

## 11. Rollback and migration safety

- Every schema change is additive first (new nullable columns/tables), then backfilled, then a later migration drops/renames. No destructive migration ships in the same deploy as the code that needs the old shape.
- Each batch gets a pre-deploy `pg_dump` and a tagged image.
- Payment changes ship behind `ONLINE_PAYMENTS_ENABLED`:
  - `false` → Cashfree create/verify/webhook return 503 “Online payments are temporarily unavailable”; COD and doorstep UPI remain.
  - Enable only after the sandbox E2E and the P0 gate pass.
- Direct-UPI claims remain available with payments disabled (staff can still reconcile), but no automatic `PAID`.
- If the Next.js upgrade fails verification, revert only the dependency commit/batch, keep the security work, and ship on the last patched 14.x/15.x that passes `npm audit`; if none passes, online payments stay disabled until the upgrade is fixed.

---

## 12. What “done” will mean

After Batches 0–5, the code will:

- fail closed on missing/weak secrets and refuse production boot with reviewer/demo/default credentials,
- have no client-confirmable paid state and no Razorpay surface,
- settle Cashfree payments only from a verified server-side result, with replay protection and exact amount/currency checks,
- have an explicit order state machine with audited, idempotent cancellation/refunds,
- revoke access immediately when staff are deactivated,
- hash all PINs, use 6-digit cryptographic OTPs, and enforce distributed rate limits on sensitive routes,
- minimize PII in rider/backup/stream/push surfaces and audit every sensitive action,
- run on a patched Next.js with a restrictive image allowlist, CSP, and security headers,
- deploy with migrations-only, healthchecks, backups, and a rollback path,
- have regression tests for every P0/P1 behavior above.

It will **not** yet be “production-ready” in the full sense until Batch 6 is complete: Cashfree sandbox and production tests, dashboard whitelisting/webhook configuration, a physical iOS/Android release test, a backup restore drill, and the external APM/alerting choice. The final verdict will list those explicitly, per the Cashfree go-live checklist, rather than declaring a blanket “ready”.

---

## 13. Approval requested

1. **Approve this plan and the batch order** (recommended), or tell me to stop after Batch 1/2.
2. **Confirm the direct-UPI decision:** claim + staff reconciliation (recommended), or remove direct UPI entirely and offer only Cashfree + COD/doorstep UPI.
3. **Cashfree App ID:** optional; paste it if you want the eligible-payment-methods check run before implementation. **Where to find it:** Cashfree Merchant Dashboard → **Payment Gateway → Developers → API Keys**. The **App ID** is the `x-client-id`; the **Secret Key** is the `x-client-secret`. Test-environment keys are generated automatically; production keys require 2FA to view. Do not paste the secret key in chat — put it in `.env`/`.env.prod`.
4. **Confirm online payments stay disabled** until the sandbox E2E and the P0 gate pass.

Once approved, I will start with Batch 0 (snapshot + test harness + secret sweep), then Batch 1, and report after each batch with the checks that passed and any that could not run.
