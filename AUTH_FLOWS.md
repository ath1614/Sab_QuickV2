# SabQuick — Authentication & Verification Flows (Web + Mobile App)

Single source of truth for how every phone number / identity is verified, per
role, across the deployed website and the Flutter app. Both consume the
**same** NextAuth endpoints — there are no parallel auth systems.

---

## 1. Roles and entry points

| Role | Entry (web) | Entry (app) | Credential |
|---|---|---|---|
| CUSTOMER | `/` AuthModal | Auth screen | Phone + 4-digit OTP (or Google) |
| MANAGER | AuthModal → `/manager` | Staff portal section | Phone + 4-digit Staff PIN |
| PACKER | AuthModal → `/packer` | Staff portal section | Phone + 4-digit Staff PIN |
| RIDER | AuthModal → `/rider/dashboard` | Staff portal section | Phone + 4-digit Staff PIN |
| OWNER | AuthModal → `/owner` | Staff portal section | Phone + 6-digit passcode (or Google) |

---

## 2. Customer phone verification (OTP path)

1. Client requests `POST /api/auth/otp/send { phone }` (10-digit, `^[6-9]\d{9}$`).
2. Owner/staff phones short-circuit to PIN mode (no SMS consumed).
3. Customers: 4-digit OTP generated with `crypto-random` entropy, stored in
   Redis at `otp:phone:{phone}` with a **300 s TTL**, plus a **60 s cooldown**
   key (`otp:cooldown:{phone}`) to prevent SMS spam.
4. Delivery depends on `OTP_DELIVERY_MODE` (see §7): real SMS via Fast2SMS /
   2Factor when keys are configured, otherwise the code is displayed in the
   client (the mechanism production uses today).
5. Client submits the code through **NextAuth credentials** —
   `POST /api/auth/callback/credentials { phone, otp, name? , csrfToken }`.
6. In `lib/auth.ts` the `authorize()` callback:
   - enforces the attempt limiter (`otp:attempts:{phone}`, max **5**, reset on
     success or on a fresh OTP request),
   - compares the OTP with the Redis value (single-use — deleted on success),
   - auto-creates the `User` row with `role=CUSTOMER, phoneVerified=true` on
     first login,
   - returns the user payload that becomes the JWT.
7. The JWT (30-day strategy) carries `id, role, roles[], phone,
   phoneVerified` and is refreshed from the DB on every callback tick, so role
   changes take effect without re-login.

## 3. Staff & owner login (PIN paths — zero SMS)

1. `POST /api/auth/otp/send` detects the phone belongs to OWNER or staff and
   responds `{ requirePin: true, isOwner?, role, pinLength }` — the client
   switches to the PIN input.
2. Client sends `{ phone, pin }` to the same NextAuth credentials callback.
3. Owner: passcode is compared with a **constant-time** equality check
   (`crypto.timingSafeEqual`) against the DB `pin` (self-provisioned from
   `OWNER_PASSCODE` on first login, documented default `140974`).
4. Staff: PIN checked the same way; wrong PIN → `Incorrect Staff PIN`.
5. On success the session JWT carries the staff role(s); middleware and API
   routes gate `/owner`, `/manager`, `/packer`, `/rider/*` accordingly.

## 4. Google sign-in (customer & owner)

Web: `signIn("google")` → NextAuth Google provider → `jwt` callback upserts the
User by email.

Flutter app (and the legacy APK): the app opens the system browser to
`/api/auth/signin/google?callbackUrl=/auth/mobile-return`. After consent, the
`mobile-return` page mints a **90-second single-use exchange token** in Redis
(`auth:mobile-exchange:*`), then deep-links back into the app:
`sabquick://auth-callback?token=...`. The app posts that token to the
credentials callback as `mobileExchangeToken`, which resolves/creates the user
and issues the session cookie. The Flutter manifest already declares the
`sabquick://auth-callback` intent filter.

## 5. Delivery OTP (order hand-off — not login)

- Generated per order at creation time: `crypto.randomInt(1000, 10000)`
  (no leading-zero ambiguity), stored on the Order row.
- Visible to the **customer only** (orders page, tracker, app tracking screen).
- Rider enters it at delivery via `POST /api/rider/orders/verify-otp`;
  mismatch → rejected. The rider app/web never receives the code in advance.

## 6. Account deletion (DPDP/GDPR-style)

`POST /api/user/delete-account` now has two steps: `action:"request"` sends a
dedicated deletion OTP to the registered phone (rate-limited, 300 s TTL);
`action:"confirm"` verifies it (max 5 attempts) and then purges PII — name,
email, phone (anonymized), pin, and all addresses. Owner accounts and staff
accounts are protected; staff are deactivated by the Owner instead.

## 7. OTP delivery modes (`OTP_DELIVERY_MODE`)

| Mode | Behavior |
|---|---|
| `auto` (default) | Real SMS when `FAST2SMS_API_KEY`/`SMS_GATEWAY_API_KEY`/`TWOFACTOR_API_KEY` is set; otherwise display mode. |
| `display` | Code returned in the API response and shown in the client. **Current production mechanism** — no SMS provider configured yet. Trade-off: anyone hitting the endpoint can request a code for any number; acceptable only until an SMS key is configured. |
| `sms` (strict) | Real SMS only; requests fail without a configured gateway (recommended once Fast2SMS/2Factor keys exist). |

Add the key to `/opt/sabquick/.env.prod` and login upgrades to real SMS with
**zero code changes** (also set `OTP_DELIVERY_MODE=sms` to enforce it).

## 8. Attempt limiting & hardening (this release)

- Max **5** failed OTP verifications per phone → locked until a fresh OTP is
  requested (`lib/otp.ts`, shared by login and deletion flows).
- Master test OTP `1234` is inert unless `ALLOW_MASTER_OTP=true` (dev/CI only;
  production env has no such flag).
- The dev-OTP banner can never leak in production; the only production code
  reflection is the documented `display` mode above.
- Staff PINs are no longer returned by any API (owner UI shows a masked ••••).
- Session cookie: `next-auth.session-token` httpOnly, 30-day JWT strategy —
  same contract consumed by web and the Flutter app.

## 9. Flutter app parity map

| Web flow | App implementation |
|---|---|
| AuthModal phone → OTP → session | `AuthScreen` → `ApiClient.sendOtp` → `loginWithOtp` |
| Staff/owner PIN branch | Same screen, auto-switched by `requirePin` response |
| Google deep-link bridge | `sabquick://auth-callback` intent filter → `completeGoogleLogin` |
| Session persistence | Encrypted-store cookie jar (SharedPreferences) mirrored from NextAuth |
| Order hand-off OTP | Shown in `TrackingScreen` (customer side) |
