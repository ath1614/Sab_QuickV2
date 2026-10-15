# SabQuick — UPI payment fix (Cashfree inside a Capacitor WebView)

**Symptom reported by customers:** in the Android app, tapping **PhonePe / Google Pay / Paytm**
did not open the app. It either dropped the choice and opened Cashfree's hosted web page, or the
Cashfree checkout only offered **"Pay by UPI ID / QR"** with no UPI app list at all.

**Root cause:** Cashfree's *hosted* checkout cannot launch UPI apps from inside a WebView, and its
checkout page deliberately hides the UPI app list when it cannot detect a native bridge. A WebView
app therefore has to either (a) hand the payment to Cashfree's native Android SDK, or (b) expose the
JS bridge the hosted page looks for. Both paths were broken; both are fixed.

This was fixed across a chain of commits on `main`. The final commit that removed the customer-facing
symptom is **`e99c3e6`** — *"expose Cashfree's WebView UPI bridge so installed UPI apps appear"*.

---

## 1. The decisive fix — `window.Android` bridge (`e99c3e6`)

Cashfree's checkout page identifies an Android WebView by looking for a JS object at
`window.Android` exposing **both** `getAppList()` and `openApp()`. When that object is missing the
page concludes "WebView, cannot enumerate apps" and renders only **Pay by UPI ID / QR** — exactly
what customers saw. No support ticket or feature flag is involved; this is Cashfree's documented
"code-based solution", and unlike the native SDK it keeps working for APKs installed outside the
Play Store.

### `android/app/src/main/java/com/sabquick/app/MainActivity.java`

New `CashfreeUpiBridge` class annotated with `@JavascriptInterface`:

```java
@JavascriptInterface
public String getAppList(String uriString)          // called synchronously by the page
@JavascriptInterface
public boolean openApp(String packageName, String upiUrl)
@JavascriptInterface public void enableCancelButton()
@JavascriptInterface public void disableCancelButton()
```

- **`getAppList(uriString)`** — builds a probe `Intent` (`Intent.parseUri(..., URI_INTENT_SCHEME)`
  for `intent://` links, otherwise `ACTION_VIEW` on the parsed URI, defaulting to `upi://pay`),
  then calls `PackageManager.queryIntentActivities(probe, 0)`.
  - Flag **`0`, deliberately not `MATCH_DEFAULT_ONLY`** — several UPI apps do not declare
    `CATEGORY_DEFAULT`, and an app missing from this list never appears as a payment option.
  - Results are **de-duplicated by package** (`LinkedHashMap`, one row per app even when an app
    registers several UPI activities), the app's own package is skipped, and `loadLabel(pm)` is
    used for the display name.
  - Returns a JSON string of `[{"appName": ..., "appPackage": ...}]`. An **empty array means "no
    UPI apps found"**, which makes the page fall back to its own list.
  - Wrapped in `catch (Throwable)` and still returns whatever it has — a throw here would break the
    checkout page itself.
- **`openApp(packageName, upiUrl)`** — launches the tapped app pinned to that exact package via
  `launchUpiForResult(...)`, which calls `startActivityForResult(intent, UPI_LAUNCH_REQUEST)` with
  `intent.setPackage(packageName)`.
  - **No `FLAG_ACTIVITY_NEW_TASK`** here — that flag would detach the activity and the return result
    would never come back to us.
  - Every URL handed over by the page is validated first (`isAllowedBridgeUrl`): a page loaded in
    the WebView must not be able to use the bridge to launch arbitrary apps, so only UPI deep links
    are accepted — directly, or as the data URI inside an `intent://` link.
- **Bridge registration**, inside `onCreate` after `super.onCreate(...)`:

  ```java
  webView.addJavascriptInterface(new CashfreeUpiBridge(this), "Android");
  ```

  `"Android"` is safe: Capacitor registers its own interfaces as `androidBridge` /
  `CapacitorHttpAndroidInterface`, so there is no collision.
- **Return trip (`onActivityResult`, request code `10007`)** — Cashfree's page assigns
  `window.showVerifyUI` right after `openApp()`; calling it makes the page confirm the payment and
  continue instead of hanging on *"waiting for payment status"*:

  ```java
  webView.evaluateJavascript(
    "(function(){try{if(typeof window.showVerifyUI==='function'){window.showVerifyUI();return 'verified';}" +
    "return 'showVerifyUI-missing';}catch(e){return 'error:'+e.message;}})()", ...);
  ```

### `android/app/src/main/AndroidManifest.xml` — package visibility

Android 11+ hides other installed apps unless each scheme is declared. An undeclared scheme makes
`queryIntentActivities()` return an **empty list**, which is indistinguishable from "no UPI apps
installed" and produces the same symptom. `<queries>` now declares every scheme Cashfree's WebView
guide lists (14 entries):

```
upi, tez, gpay, phonepe, paytmmp, paytm, bhim, credpay, amazonpay,
navipay, mobikwik, myairtel, whatsapp-consumer, sabquick
```

**These two lists are intentionally different lengths and must not be "synced".** The manifest
`<queries>` list controls which apps can *appear in the picker*; the runtime `isUpiScheme()`
allow-list (25 schemes, same file) controls which deep links we will *accept and launch*. They serve
different purposes — but a scheme that is launchable yet missing from `<queries>` gives the worst
outcome of all: we could launch the app, it just never shows up for the customer to tap. If a new
UPI app is added as a one-tap option in `UPI_APP_PACKAGES` (`lib/upi.ts`), add its scheme to
**both**.

### iOS equivalent — `ios/App/App/AppDelegate.swift` + `Info.plist`

iOS cannot enumerate apps from a page at all, so the same job is done through the
`WKScriptMessageHandler` named **`nativeProcess`**, which Cashfree's page expects:

- `AppDelegate` now conforms to `WKScriptMessageHandler` and idempotently registers itself as
  `nativeProcess` on the Capacitor `WKWebView` (`attachCashfreeBridge()`), retried 1s later and on
  `applicationDidBecomeActive` — the WebView is not always ready during `didFinishLaunching`.
- `"getAppList"` → probes `candidateUpiApps` (PhonePe, Google Pay, Paytm, BHIM, CRED, Amazon Pay,
  Navi, MobiKwik, Airtel Thanks, WhatsApp Pay) with `canOpenURL` and answers with
  `window.receiveAppList(json)`.
- Any other message containing `://` is treated as the chosen UPI deep link: `paytm:` is rewritten
  to `paytmmp:`, then `window.verifyPaymentForiOS()` is called and `UIApplication.shared.open` runs.
- `dismissLoader` / `dismissWeb` / `enableCancelButton` / `disableCancelButton` are acknowledged
  no-ops (there is no native loader chrome to update).
- `LSApplicationQueriesSchemes` in `Info.plist` was extended with `gpay`, `paytm`, `amazonpay`,
  `navipay`, `mobikwik`, `myairtel`, `whatsapp-consumer`, `tnupi`, `postpe` — without these,
  `canOpenURL()` silently returns false and the app never shows up.

---

## 2. The native SDK path — `85168dd` *"make the app launch real UPI apps, not Cashfree's web page"*

Three separate defects, each fatal on its own:

1. **The Cashfree native SDK was never initialised.** `CFPaymentGatewayService.getInstance()`
   throws until `initialize(context)` has run, and it never ran — so *every* native attempt died
   instantly. `onCreate` now bootstraps it and registers the checkout callback there, as Cashfree
   documents (this also handles activity restarts correctly):

   ```java
   CFPaymentGatewayService.initialize(getApplicationContext());
   CFPaymentGatewayService.getInstance().setCheckoutCallback(this);
   ```

2. **The customer's chosen app was never passed to the SDK.** Added a real UPI Intent launch using
   the documented Element flow — `CFUPI.Mode.INTENT` + `setUPIID(<package name>)` — which opens that
   exact app with the amount pre-filled:

   ```java
   CFUPI cfUpi = new CFUPI.CFUPIBuilder().setMode(CFUPI.Mode.INTENT).setUPIID(appPackage).build();
   CFPayment payment = new CFUPIPayment.CFUPIPaymentBuilder()
       .setSession(buildSession(paymentSessionId, orderId, envStr))
       .setCfUPI(cfUpi).build();
   CFPaymentGatewayService.getInstance().doPayment(getActivity(), payment);
   ```

   `isPackageInstalled()` checks the package (two strategies: `getApplicationInfo` on `enabled`,
   then `getLaunchIntentForPackage`) and, if it is missing, **falls back to Cashfree's own app list
   instead of failing the payment**, returning `fallback: true` + `missingPackage` so the UI can
   explain the substitution.

3. **The JS checkout ignored the native path entirely on mobile.**

**Result plumbing gotcha:** the Cashfree SDK calls back into the *Activity*, not into the Capacitor
plugin, so results are handed back through a static channel (`pendingUpiCall` + `pluginRef`).
`deliverResult()` posts to the main looper and then **both** resolves the pending JS promise **and**
emits a `cashfreeUpiResult` event — because Android may have restarted the WebView while the UPI app
was in the foreground, in which case the promise is gone but the page can still react to the event
and re-verify the order. A stale callback can never resolve a later payment (`clearPending()`).

---

## 3. WebView deep-link interception — `b2030e2`

The old interceptor only overrode `shouldOverrideUrlLoading(WebView, WebResourceRequest)`, so links
arriving through the legacy `(WebView, String)` path fell through. Both overloads now share one
`handlePaymentScheme()` helper, the scheme list was centralised in a single `isUpiScheme()`, and on
failure the code follows `browser_fallback_url` from an `intent://` link rather than dead-ending.
The scheme list was then completed to every scheme Cashfree documents (`paytm`, `popclubapp`,
`super`, `kiwi`, `simplypayupi`, `whatsapp-consumer`, `tnupi`, `postpe`, `imobile`, `payzapp`,
`fpupi`, `snapmint`, `whatsapp`).

---

## 4. The JS layer

### `lib/upi.ts`

- `UPI_APP_PACKAGES` maps our app ids to real package names —
  `gpay → com.google.android.apps.nbu.paisa.user`, `phonepe → com.phonepe.app`,
  `paytm → net.one97.paytm`, `bhim → in.org.npci.upiapp`, `cred → com.dreamplug.androidapp` —
  plus `getUpiAppPackage(appId)`.
- `launchNativeCashfreeUpiIntent()` returns `SUCCESS | FAILED | UNAVAILABLE`.
  **`UNAVAILABLE`** is the important one: it means the installed APK predates this plugin method, so
  the caller falls back to the hosted page. That keeps the live site's JS working against an older
  installed APK instead of dead-ending checkout.
- `launchCashfreeUpiIntent?` is declared **optional** on `NativeUpiPlugin` for the same reason.

### `lib/cashfree.ts`

- `verifyCashfreePaymentOnServer(orderId, attempts = 3, delayMs = 1500)` — the UPI app / SDK
  callback only reports that the customer *finished the flow*; it is never proof of payment. Every
  success path funnels through this, with retries to cover the lag between the UPI app confirming
  and Cashfree reflecting the payment on the order.

### `components/cart/PaymentSelectionModal.tsx`

- `onSelectPayment` now carries which Cashfree experience the customer picked:
  `flow: "UPI_INTENT" | "UPI_CHOOSER" | "CARDS"`.
  PhonePe / GPay / Paytm → `UPI_INTENT`; "any other UPI app" → `UPI_CHOOSER`; cards → `CARDS`.
- Also removed the last stale "10-15 Min" delivery claim.

### `components/cart/CartDrawer.tsx` (`executePlaceOrder`)

The native path is taken only when all of these hold: `Capacitor.isNativePlatform()`,
`flow === "UPI_INTENT"`, a concrete package resolves, **and** native UPI is not already latched as
blocked. Only a *specific* app goes native — "any UPI app" and cards go straight to the hosted page,
because Cashfree's own app-picker sheet can come up empty on a sideloaded build with no way forward.

Two situations must never fail the order; both fall through to the hosted Cashfree page with the
same order:

- `status === "UNAVAILABLE"` — the installed APK predates the native method.
- a **Cashfree policy block** — **Cashfree refuses its own native SDK when the APK was not installed
  from a regulated store** (i.e. sideloaded, which is how customers install SabQuick). That is a
  Cashfree policy block, not a customer mistake.

In the second case a `sessionStorage` latch (`sq_native_upi_blocked = "1"`) stops the app paying that
round trip on every subsequent attempt. (Wrapped in try/catch: private mode / storage disabled is
harmless, it just retries once more.)

**This detection must never be a single literal string.** Cashfree reports the same refusal under
more than one code across SDK versions:

| Where it came from | Code |
|---|---|
| Integrity install-source check | `installer_package_not_approved` |
| CFUPI Intent flow (observed on-device, Galaxy S24 / Android 17, 2026-10-15) | `android_package_not_approved` |

The app shipped checking only `installer_package_not_approved` / `feature_not_enabled`, so
`android_package_not_approved` slipped through: the miss set no latch, took the *"payment failed"*
branch, **cancelled the customer's order and dropped them back on the payment-method step** — and
because the latch was never set, every retry repeated the identical doomed attempt. `lib/upi.ts` now
exposes `isCashfreeSdkPolicyBlock()`, which matches the shape of the code
(`package_not_approved` / `app_not_approved` / `not_enabled` / `not_whitelisted`) and, if Cashfree
renames it again, Cashfree's wording for this refusal (`"… is not enabled or approved"`). Match the
family, not one spelling.

On the native success path the client **never trusts the callback**: it calls
`verifyCashfreePaymentOnServer(orderId, nativeResult.status === "SUCCESS" ? 4 : 2, 1500)` and only
then clears the cart and shows the celebration; otherwise it calls `cancelUnconfirmedOrder(...)` and
shows a "Payment Unsuccessful • Order Not Placed" banner with the items left in the cart.

---

## 5. Server-side verification — `app/api/payments/cashfree/verify/route.ts`

`POST { orderId }` is the single source of truth for whether money moved:

- loads the order by `id` **or** `orderNumber`;
- checks ownership (customer, or OWNER/MANAGER) — a customer cannot verify someone else's order;
- returns early with success if already `PAID`;
- queries Cashfree (`getCashfreeOrderPayments`), requires a payment with `payment_status ===
  "SUCCESS"`, and **rejects a success whose `payment_amount` is less than the order total**;
- only then marks the order `PAID` + `CONFIRMED`, stores `cf_payment_id`, broadcasts via
  `updateOrderStatus` (Redis pub/sub for packers/rider dispatch) and fires the staff push alert.
- If nothing succeeded it returns HTTP 400 with Cashfree's own `payment_message`, which is what the
  client surfaces to the customer.

---

## 6. Commit chain

| Commit | What it did |
|---|---|
| `03cebaa` | First pass: UPI intent mobile failure, native scheme interception, `/pay/verify` page, stopped premature order alerts |
| `cf1e78a` | Vendored/integrated the official Cashfree Android Native SDK |
| `f94d248` | Blinkit/Zepto-parity payment selection UI |
| `b2030e2` | Intercept native UPI intents in the Android WebView (both `shouldOverrideUrlLoading` overloads) |
| `85168dd` | SDK init, real `CFUPI.Mode.INTENT` launch with package, JS uses the native path + server verification + hosted fallback |
| **`e99c3e6`** | **`window.Android` / `nativeProcess` bridge so Cashfree's checkout renders the installed UPI apps — this is the one that fixed the customer-visible symptom** |

Each of `85168dd` and `e99c3e6` also rebuilt `public/downloads/sabquick.apk`, so the public download
carries the native fixes.

**As recorded in the `e99c3e6` commit message:** verified on a Galaxy S24 — `getAppList()` listed the
9 installed UPI apps, checkout rendered Google Pay / PhonePe / Paytm / Navi / BHIM, and tapping
PhonePe launched it and completed the verify handshake. Web / desktop checkout behaviour is
unchanged.

---

## 7. Gotchas worth remembering

1. **`queryIntentActivities(..., 0)` not `MATCH_DEFAULT_ONLY`** — otherwise apps that omit
   `CATEGORY_DEFAULT` silently vanish from the payment list.
2. **Every scheme must be in `<queries>` (Android) and `LSApplicationQueriesSchemes` (iOS)** — an
   undeclared scheme looks identical to "app not installed".
3. **`getAppList()` must return valid JSON of `{appName, appPackage}` and must never throw** — the
   checkout page treats `[]` as "fall back to my own list".
4. **`openApp()` must not use `FLAG_ACTIVITY_NEW_TASK`** — you lose the `onActivityResult` needed to
   call `showVerifyUI()`.
5. **Resolve the promise *and* emit an event** from the native callback: the WebView can be restarted
   while the UPI app is foregrounded.
6. **The native SDK callback is not proof of payment** — always confirm server-side against Cashfree,
   and check the amount, not just the status.
7. **Sideloaded APKs are blocked by Cashfree Integrity** — reported as
   `installer_package_not_approved` *or* `android_package_not_approved`. Treat that as "use the hosted
   page", not as a failed payment, and **never match the code with a literal `===`** — a miss cancels
   a real order instead of falling through.
