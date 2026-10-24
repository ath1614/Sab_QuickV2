import { getFirebaseAdminApp } from "@/lib/firebase-admin";

/**
 * Firebase project details for the iOS app.
 *
 * The Instance ID batch-import endpoint expects the iOS bundle id here (not the
 * Firebase App ID), plus an APNs auth key configured in the Firebase console.
 */
export const IOS_PUSH_BUNDLE_ID = "com.sabquick.app";

/** APNs device tokens are 64 hex characters. FCM registration tokens are not. */
export function isApnsDeviceToken(token: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(String(token || ""));
}

/** Never return a full push token to a client-facing diagnostics response. */
export function maskPushToken(token: string): string {
  const value = String(token || "");
  if (value.length <= 12) return "***";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Keep DB/log messages readable and bounded. */
export function trimPushError(message: unknown, max = 500): string {
  const text = typeof message === "string" ? message : String((message as any)?.message || message || "Unknown push error");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface ApnsImportResult {
  fcmToken: string | null;
  sandbox?: boolean;
  error?: string;
}

/**
 * Exchanges a raw APNs token for an FCM registration token.
 *
 * Returns the failure reason instead of throwing. Callers persist that reason on
 * the DeviceToken row, because a swallowed import error is exactly why an iOS
 * device can receive no notifications with nothing in the logs.
 */
export async function importApnsToken(apnsToken: string): Promise<ApnsImportResult> {
  try {
    const app = getFirebaseAdminApp();
    const credential = app.options.credential as any;
    const tokenObj = await credential?.getAccessToken?.();

    if (!tokenObj?.access_token) {
      return {
        fcmToken: null,
        error: "Firebase Admin credentials could not mint an OAuth access token.",
      };
    }

    const attempt = async (sandbox: boolean): Promise<ApnsImportResult> => {
      try {
        const res = await fetch("https://iid.googleapis.com/iid/v1:batchImport", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenObj.access_token}`,
            access_token_auth: "true",
          },
          body: JSON.stringify({
            application: IOS_PUSH_BUNDLE_ID,
            sandbox,
            apns_tokens: [apnsToken],
          }),
        });

        const data = await res.json().catch(() => null);
        const result = data?.results?.[0];

        if (res.ok && result?.registration_token) {
          return { fcmToken: result.registration_token, sandbox };
        }

        const reason =
          result?.error ||
          data?.error?.message ||
          (typeof data?.error === "string" ? data.error : null) ||
          `Firebase APNs import failed with HTTP ${res.status}.`;

        return { fcmToken: null, sandbox, error: trimPushError(reason) };
      } catch (err: any) {
        return {
          fcmToken: null,
          sandbox,
          error: trimPushError(err?.message || "Firebase APNs import request failed."),
        };
      }
    };

    // TestFlight / App Store builds use production APNs; Xcode debug builds use
    // sandbox. Try production first, then sandbox, and keep both reasons when
    // neither works so the stored error explains the actual failure.
    const production = await attempt(false);
    if (production.fcmToken) return production;

    const development = await attempt(true);
    if (development.fcmToken) return development;

    return {
      fcmToken: null,
      error: trimPushError(
        `production: ${production.error || "no token"} | sandbox: ${development.error || "no token"}`
      ),
    };
  } catch (err: any) {
    return {
      fcmToken: null,
      error: trimPushError(err?.message || "Firebase APNs import failed."),
    };
  }
}
