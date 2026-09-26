import redis from "@/lib/redis";

/**
 * Shared OTP attempt-limiting + master-OTP helpers.
 *
 * Used by both credential verification paths (NextAuth authorize in lib/auth.ts)
 * and the OTP delivery route (app/api/auth/otp/send).
 */

export const MASTER_OTP = "1234";
export const OTP_ATTEMPT_LIMIT = 5;

/** Redis key that counts failed verification attempts for a phone number. */
export function otpAttemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

/** Increment the failed-attempt counter and return how many attempts remain. */
export async function recordOtpFailure(phone: string): Promise<number> {
  const key = otpAttemptsKey(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    // TTL matches OTP validity window (5 minutes) plus a small buffer.
    await redis.expire(key, 360);
  }
  return OTP_ATTEMPT_LIMIT - count;
}

/** Reset the failed-attempt counter after a successful verification. */
export async function resetOtpAttempts(phone: string): Promise<void> {
  await redis.del(otpAttemptsKey(phone));
}

/**
 * Returns true when the phone number has exceeded the allowed number of
 * failed OTP attempts and must request a fresh OTP before retrying.
 */
export async function isOtpLocked(phone: string): Promise<boolean> {
  const raw = await redis.get(otpAttemptsKey(phone));
  const count = raw ? parseInt(raw, 10) : 0;
  return count >= OTP_ATTEMPT_LIMIT;
}

/**
 * Master OTP gate. The universal "1234" code is a development/CI convenience and
 * MUST be explicitly enabled with ALLOW_MASTER_OTP=true. Production never sets
 * that variable, so the bypass is dead code outside dev/CI.
 */
export function isMasterOtpEnabled(): boolean {
  return process.env.ALLOW_MASTER_OTP === "true";
}
