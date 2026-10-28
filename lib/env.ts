// ==============================================================================
// SabQuick production environment validation.
//
// This module is imported by instrumentation.ts, so a production process refuses
// to serve traffic when a required secret is missing, weak, or still set to a
// value that has been published in the repository.
// ==============================================================================

import { z } from "zod";

/** Keys that must be present before a production process may serve traffic. */
// OWNER_PHONE / OWNER_PASSCODE are provisioning inputs, not runtime
// requirements: an owner row that already has a hashed PIN keeps working
// through the staff branch after a deploy. Requiring them at boot would take a
// healthy store offline on the first deploy that adds the check.
export const REQUIRED_PRODUCTION_ENVS = [
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "NEXTAUTH_URL",
] as const;

/** Secrets that have appeared in this repository, examples, or CI. */
const KNOWN_DEV_SECRETS = new Set([
  "local_development_secret_32_chars_minimum",
  "replace_with_openssl_rand_base64_32",
  "ci_pipeline_secret_test_32_characters_minimum",
  "changeme",
  "secret",
]);

/** Passcodes that have appeared in the repository or its documentation. */
const KNOWN_OWNER_PASSCODES = new Set([
  "1234",
  "123456",
  "password",
  "admin",
  "owner",
]);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "must be a valid 10-digit Indian mobile number");

const productionEnvSchema = z
  .object({
    NEXTAUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    NEXTAUTH_URL: z
      .string()
      .url()
      .refine(
        (value) => value.startsWith("https://") || value.startsWith("http://localhost"),
        "must be an https:// URL in production"
      ),
    OWNER_PHONE: phoneSchema.optional(),
    OWNER_PASSCODE: z
      .string()
      .min(8, "must be at least 8 characters")
      .refine((value) => !KNOWN_OWNER_PASSCODES.has(value.toLowerCase()), {
        message: "must not be a password that has appeared in the repository",
      })
      .optional(),
    ONLINE_PAYMENTS_ENABLED: z.enum(["true", "false"]).optional(),
    CASHFREE_APP_ID: z.string().optional(),
    CASHFREE_SECRET_KEY: z.string().optional(),
    CASHFREE_API_VERSION: z.string().optional(),
    REVIEWER_PHONE: z.string().optional(),
    REVIEWER_PASSCODE: z.string().optional(),
    DEMO_REVIEW_PHONE: z.string().optional(),
    DEMO_REVIEW_OTP: z.string().optional(),
    ALLOW_MASTER_OTP: z.string().optional(),
    RENFLAIR_API_KEY: z.string().optional(),
    FAST2SMS_API_KEY: z.string().optional(),
    SMS_GATEWAY_API_KEY: z.string().optional(),
    TWOFACTOR_API_KEY: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (KNOWN_DEV_SECRETS.has(env.NEXTAUTH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXTAUTH_SECRET"],
        message: "is a known development value; generate a new secret with `openssl rand -base64 32`",
      });
    }

    if (env.ALLOW_MASTER_OTP === "true") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ALLOW_MASTER_OTP"],
        message: "must not be enabled in production",
      });
    }

    for (const key of [
      "REVIEWER_PHONE",
      "REVIEWER_PASSCODE",
      "DEMO_REVIEW_PHONE",
      "DEMO_REVIEW_OTP",
    ] as const) {
      if (env[key]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "must be removed in production; reviewer/demo logins are not allowed",
        });
      }
    }

    if (env.ONLINE_PAYMENTS_ENABLED === "true") {
      if (!env.CASHFREE_APP_ID?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CASHFREE_APP_ID"],
          message: "is required when ONLINE_PAYMENTS_ENABLED=true",
        });
      }
      if (!env.CASHFREE_SECRET_KEY?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CASHFREE_SECRET_KEY"],
          message: "is required when ONLINE_PAYMENTS_ENABLED=true",
        });
      }
    }

    const hasSmsProvider = Boolean(
      env.RENFLAIR_API_KEY?.trim() ||
        env.FAST2SMS_API_KEY?.trim() ||
        env.SMS_GATEWAY_API_KEY?.trim() ||
        env.TWOFACTOR_API_KEY?.trim()
    );
    const hasFirebaseAdmin = Boolean(
      env.FIREBASE_PROJECT_ID?.trim() &&
        env.FIREBASE_CLIENT_EMAIL?.trim() &&
        env.FIREBASE_PRIVATE_KEY?.trim()
    );

    if (!hasSmsProvider && !hasFirebaseAdmin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMS_GATEWAY_API_KEY"],
        message:
          "no SMS provider or Firebase Admin credentials configured; phone OTP login will fail",
      });
    }
  });

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Validates production configuration and throws on the first invalid run.
 *
 * Development and test environments are deliberately left permissive so that
 * `next dev`, unit tests, and CI do not need production secrets.
 */
export function validateProductionEnv(): EnvValidationResult {
  if (process.env.NODE_ENV !== "production") {
    return { valid: true, missing: [] };
  }

  const missing = REQUIRED_PRODUCTION_ENVS.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `[FATAL] Missing required production environment variables: ${missing.join(
        ", "
      )}. Refusing to start.`
    );
  }

  const parsed = productionEnvSchema.safeParse({
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    OWNER_PHONE: process.env.OWNER_PHONE,
    OWNER_PASSCODE: process.env.OWNER_PASSCODE,
    ONLINE_PAYMENTS_ENABLED: process.env.ONLINE_PAYMENTS_ENABLED,
    CASHFREE_APP_ID: process.env.CASHFREE_APP_ID,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY,
    CASHFREE_API_VERSION: process.env.CASHFREE_API_VERSION,
    REVIEWER_PHONE: process.env.REVIEWER_PHONE,
    REVIEWER_PASSCODE: process.env.REVIEWER_PASSCODE,
    DEMO_REVIEW_PHONE: process.env.DEMO_REVIEW_PHONE,
    DEMO_REVIEW_OTP: process.env.DEMO_REVIEW_OTP,
    ALLOW_MASTER_OTP: process.env.ALLOW_MASTER_OTP,
    RENFLAIR_API_KEY: process.env.RENFLAIR_API_KEY,
    FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY,
    SMS_GATEWAY_API_KEY: process.env.SMS_GATEWAY_API_KEY,
    TWOFACTOR_API_KEY: process.env.TWOFACTOR_API_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`[FATAL] Invalid production environment: ${details}`);
  }

  return { valid: true, missing: [] };
}

/**
 * Online payments are off unless the operator explicitly enables them. The
 * launch gate requires a sandbox end-to-end test before this is turned on.
 */
export function isOnlinePaymentsEnabled(): boolean {
  return process.env.ONLINE_PAYMENTS_ENABLED === "true";
}
