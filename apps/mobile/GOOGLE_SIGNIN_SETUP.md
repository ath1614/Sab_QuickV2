# Google Sign-In — one-time Google Cloud Console setup

The app's "Continue with Google" is **native and in-app** (the
`google_sign_in` plugin): the Google consent sheet opens inside the app, and
the ID token it returns is verified server-side by `lib/auth.ts`
(`googleIdToken` credentials field) before a NextAuth session is issued.
There is no browser redirect and no deep link back through the website.

## How the pieces fit

| Piece | Where | Purpose |
|---|---|---|
| `serverClientId` | `apps/mobile/lib/config.dart` → `googleWebClientId` | The **Web** OAuth client ID. The native consent sheet mints the ID token with this audience; the backend refuses any other audience. |
| Android OAuth client | Google Cloud Console | Identifies the app by **package name `com.sabquick.sabquick_app` + SHA-1 of the signing key**. Without it the consent sheet fails on device. |
| iOS OAuth client | Google Cloud Console | Identifies the app by **bundle ID** when the iOS build ships. |
| `googleIdToken` field | `lib/auth.ts` credentials provider | Verifies signature, expiry, audience (`GOOGLE_CLIENT_ID`) and issuer, then resolves-or-creates the user by email. |

## Steps (≈10 minutes)

1. Open the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials)
   for the project that owns the existing `GOOGLE_CLIENT_ID`
   (`49479543811-b4cigo43ujtpekok0mpb9dfe8fa9tchm...` — the web client the
   website already uses). **Do not create a new project.**

2. Get the SHA-1 fingerprint of the key the APK is signed with. Release
   builds currently sign with the debug keystore, so:

   ```bash
   keytool -list -v -alias androiddebugkey \
     -keystore ~/.android/debug.keystore -storepass android -keypass android
   ```

   Copy the `SHA1:` line. When a dedicated release keystore is introduced
   later, add its SHA-1 the same way (a client can hold multiple
   fingerprints).

3. **Create credentials → OAuth client ID → Android**
   - Package name: `com.sabquick.sabquick_app`
   - SHA-1: the fingerprint from step 2.

4. **Create credentials → OAuth client ID → iOS** *(needed when the iOS
   build ships)*
   - Bundle ID: `com.sabquick.sabquick_app`

5. Done. No secret is involved: native client IDs are public identifiers,
   and only the existing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` pair
   on the server matters for verification.

## Why there are no config files in the repo

`google_sign_in` needs no `google-services.json` / `GoogleService-Info.plist`
because the app authenticates with a plain ID token (no Firebase, no
Play-services app identity) and the web client ID is passed at runtime as
`serverClientId`. This keeps the repo free of per-project binary blobs.

## Failure modes

| Symptom | Cause / fix |
|---|---|
| Consent sheet never opens; error mentions `ApiException: 10` or developer error | Android OAuth client missing, or SHA-1 doesn't match the signing key. Redo steps 2–3. |
| Works on Android, fails on iOS | iOS OAuth client not created yet (step 4). |
| Server answers "Invalid or expired Google token" | The ID token's audience didn't match `GOOGLE_CLIENT_ID` — check `googleWebClientId` in `config.dart`. |
| Server answers "Google sign-in is not configured on the server" | `GOOGLE_CLIENT_ID` env var missing on the server. |

## Legacy note

The old browser round-trip (`/auth/mobile-return` → `sabquick://auth-callback`
deep link → `mobileExchangeToken`) is **dormant**: the web page still exists,
the app no longer opens it, and the deep-link intent-filter and `app_links`
dependency were removed. No web behavior changed — the `mobileExchangeToken`
branch stays in `lib/auth.ts` harmlessly.
