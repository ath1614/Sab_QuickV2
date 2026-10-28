import crypto from "crypto";
import redis from "@/lib/redis";

const PIN_ATTEMPT_LIMIT = 5;
const PIN_LOCKOUT_TTL_SECONDS = 900; // 15 minutes lockout

/**
 * Hash a PIN or Passcode using Node.js native scrypt.
 * Output format: scrypt:<salt_hex>:<derived_key_hex>
 */
export function hashPasscode(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(pin, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a submitted PIN against stored hash or legacy plaintext.
 * Supports constant-time comparison and legacy plaintext migration.
 */
export function verifyPasscode(submittedPin: string, storedValue: string | null | undefined): boolean {
  if (!storedValue || !submittedPin) return false;

  const trimmedPin = submittedPin.trim();

  // 1. Scrypt hashed format
  if (storedValue.startsWith("scrypt:")) {
    const parts = storedValue.split(":");
    if (parts.length !== 3) return false;

    const [, salt, expectedHashHex] = parts;
    const computedKey = crypto.scryptSync(trimmedPin, salt, 64);
    const expectedBuffer = Buffer.from(expectedHashHex, "hex");

    if (computedKey.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedKey, expectedBuffer);
  }

  // Plaintext PINs are no longer accepted. Run `npm run db:migrate-pins`
  // before deploying this build so legacy rows are hashed exactly once.
  return false;
}

/**
 * Check if the stored value is already hashed with scrypt.
 */
export function isPasscodeHashed(storedValue: string | null | undefined): boolean {
  return typeof storedValue === "string" && storedValue.startsWith("scrypt:");
}

/** Redis key that counts failed PIN verification attempts for a phone number. */
export function pinAttemptsKey(phone: string): string {
  return `auth:pin-attempts:${phone}`;
}

/** Increment failed PIN attempt counter and set 15-minute TTL. */
export async function recordPinFailure(phone: string): Promise<number> {
  const key = pinAttemptsKey(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, PIN_LOCKOUT_TTL_SECONDS);
  }
  return PIN_ATTEMPT_LIMIT - count;
}

/** Reset the failed PIN counter after a successful authentication. */
export async function resetPinAttempts(phone: string): Promise<void> {
  await redis.del(pinAttemptsKey(phone));
}

/** Returns true if the account is temporarily locked out due to excessive failed PIN attempts. */
export async function isPinLocked(phone: string): Promise<boolean> {
  const raw = await redis.get(pinAttemptsKey(phone));
  const count = raw ? parseInt(raw, 10) : 0;
  return count >= PIN_ATTEMPT_LIMIT;
}
