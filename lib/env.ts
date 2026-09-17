// ==============================================================================
// SabQuick Production Environment Hardening & Validation
// Strictly asserts that mandatory security keys, database URIs, cache connections,
// and third-party gateways are present before serving live traffic.
// ==============================================================================

export const REQUIRED_PRODUCTION_ENVS = [
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "REDIS_URL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "SMS_GATEWAY_API_KEY",
] as const;

export function validateProductionEnv(): { valid: boolean; missing: string[] } {
  if (process.env.NODE_ENV === "production") {
    const missing = REQUIRED_PRODUCTION_ENVS.filter((key) => {
      const val = process.env[key];
      return !val || val.trim() === "";
    });

    if (missing.length > 0) {
      const errorMsg = `[CRITICAL SECURITY ALERT] Missing required production environment variables: ${missing.join(
        ", "
      )}. Refusing to start in unhardened state.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  return { valid: true, missing: [] };
}

// Automatically execute check on module evaluation in production
if (process.env.NODE_ENV === "production") {
  validateProductionEnv();
}
