/**
 * Next.js instrumentation hook.
 *
 * Runs once per server process before traffic is served. In production the
 * process exits if the environment is not safe to serve (missing or published
 * secrets, reviewer/demo flags, incomplete owner provisioning, etc.).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("./lib/env");
    validateProductionEnv();
  }
}
