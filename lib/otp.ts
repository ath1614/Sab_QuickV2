import crypto from "crypto";
import redis from "@/lib/redis";

/**
 * Shared OTP generation, storage, and attempt-limiting helpers.
 *
 * OTPs are never stored in plaintext and never reset their failure counter when
 * a new code is issued. Only a successful verification clears the counter.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 300;
export const OTP_ATTEMPT_LIMIT = 5;
export const OTP_ATTEMPT_TTL_SECONDS = 900;

/** Development-only master OTP. Production refuses to boot with this enabled. */
export const MASTER_OTP = "1234";

function getOtpPepper(): string {
  const pepper = process.env.OTP_PEPPER?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_PEPPER or NEXTAUTH_SECRET is required to hash OTPs.");
    }
    return "local-development-otp-pepper";
  }
  return pepper;
}

/** Cryptographically random 6-digit OTP. */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function otpStorageKey(phone: string): string {
  return `otp:phone:${phone}`;
}

export function otpAttemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

export function otpCooldownKey(phone: string): string {
  return `otp:cooldown:${phone}`;
}

/** HMAC binds the code to the phone number so a leaked hash cannot be replayed. */
export function hashOtp(phone: string, otp: string): string {
  return crypto
    .createHmac("sha256", getOtpPepper())
    .update(`${phone}:${otp.trim()}`)
    .digest("hex");
}

export function verifyOtpHash(phone: string, otp: string, storedHash: string | null): boolean {
  if (!storedHash || !otp) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashOtp(phone, otp), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Increment the failed-attempt counter and return how many attempts remain. */
export async function recordOtpFailure(phone: string): Promise<number> {
  const key = otpAttemptsKey(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, OTP_ATTEMPT_TTL_SECONDS);
  }
  return OTP_ATTEMPT_LIMIT - count;
}

/** Reset the failed-attempt counter only after a successful verification. */
export async function resetOtpAttempts(phone: string): Promise<void> {
  await redis.del(otpAttemptsKey(phone));
}

/** True when the phone has exceeded the allowed number of failed attempts. */
export async function isOtpLocked(phone: string): Promise<boolean> {
  const raw = await redis.get(otpAttemptsKey(phone));
  const count = raw ? parseInt(raw, 10) : 0;
  return count >= OTP_ATTEMPT_LIMIT;
}

/**
 * Master OTP gate. The universal "1234" code is a development/CI convenience and
 * MUST be explicitly enabled with ALLOW_MASTER_OTP=true. Production startup
 * refuses to run when that variable is true.
 */
export function isMasterOtpEnabled(): boolean {
  return process.env.ALLOW_MASTER_OTP === "true";
}
