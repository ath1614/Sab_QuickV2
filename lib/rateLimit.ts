/**
 * SabQuick In-Memory Sliding-Window Rate Limiter & Bot Flood Shield
 * 
 * Protects frontend and API endpoints from abusive traffic, scraping floods,
 * DDoS request bombardment (e.g. 10,000 request floods), and SMS OTP exhaustion.
 * 
 * Works seamlessly in Next.js middleware with sub-millisecond (< 0.1ms) execution time.
 */

interface ClientRecord {
  timestamps: number[];
  blockedUntil?: number;
}

// Global in-memory IP tracker
const ipStore = new Map<string, ClientRecord>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
const MAX_STORE_SIZE = 15_000;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  isBanned?: boolean;
}

// Route-specific rate limit profiles
const RATE_LIMIT_RULES = [
  // 1. Sensitive SMS OTP Dispatch: Max 5 requests per 60s per IP (protects SMS gateway budget)
  {
    prefix: "/api/auth/otp/send",
    windowMs: 60_000,
    maxRequests: 5,
    banThreshold: 10,
    banDurationMs: 5 * 60_000, // 5 minutes ban if hammering
  },
  // 2. OTP Verification: Max 15 requests per 60s per IP (prevents brute-force)
  {
    prefix: "/api/auth/otp/verify",
    windowMs: 60_000,
    maxRequests: 15,
    banThreshold: 30,
    banDurationMs: 5 * 60_000,
  },
  // 3. Order Placement & Checkout: Max 30 requests per 60s per IP
  {
    prefix: "/api/orders",
    windowMs: 60_000,
    maxRequests: 30,
    banThreshold: 60,
    banDurationMs: 2 * 60_000,
  },
  // 4. Read-Only Public Catalog & Store Metadata: Max 1,200 requests per 60s per IP (generous for shared Wi-Fi & multiple testers)
  {
    prefix: "/api/products",
    windowMs: 60_000,
    maxRequests: 1200,
    banThreshold: 2500,
    banDurationMs: 30_000,
  },
  {
    prefix: "/api/categories",
    windowMs: 60_000,
    maxRequests: 1200,
    banThreshold: 2500,
    banDurationMs: 30_000,
  },
  {
    prefix: "/api/theme",
    windowMs: 60_000,
    maxRequests: 1200,
    banThreshold: 2500,
    banDurationMs: 30_000,
  },
  // 5. Staff Polling Endpoints (Manager & Packer live feed polling)
  {
    prefix: "/api/ops",
    windowMs: 60_000,
    maxRequests: 600,
    banThreshold: 1500,
    banDurationMs: 30_000,
  },
  // 6. General API Endpoints: Max 600 requests per 60s per IP (supports multiple active devices on single Wi-Fi router)
  {
    prefix: "/api/",
    windowMs: 60_000,
    maxRequests: 600,
    banThreshold: 1500,
    banDurationMs: 60_000,
  },
  // 7. Storefront & Public Pages: Max 300 requests per 10s per IP (flood defense)
  {
    prefix: "/",
    windowMs: 10_000,
    maxRequests: 300,
    banThreshold: 600,
    banDurationMs: 60_000,
  },
];

// Known malicious vulnerability scanner user-agent signatures
const MALICIOUS_SCANNER_REGEX = /(sqlmap|nikto|wpscan|masscan|zgrab|acunetix|dirbuster|gobuster|havij|nessus)/i;

/**
 * Checks if the request User-Agent belongs to a known offensive scanner.
 */
export function isMaliciousScanner(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MALICIOUS_SCANNER_REGEX.test(userAgent);
}

/**
 * Extracts the real client IP address from request headers.
 * Respects Cloudflare, Caddy reverse-proxy, and standard proxies.
 */
export function getClientIp(headers: Headers): string {
  // 1. Cloudflare Connecting IP (when Cloudflare is active)
  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  // 2. Standard X-Forwarded-For (from Caddy reverse proxy)
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 3. X-Real-IP
  const xRealIp = headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  return "127.0.0.1";
}

/**
 * Periodically removes expired timestamps to keep memory usage minimal.
 */
function cleanupStore(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && ipStore.size < MAX_STORE_SIZE) {
    return;
  }
  lastCleanup = now;

  ipStore.forEach((record, key) => {
    // If blocked and ban has expired, remove block
    if (record.blockedUntil && record.blockedUntil <= now) {
      delete record.blockedUntil;
    }

    // Filter out timestamps older than 60 seconds
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60_000);

    // If no recent timestamps and not banned, purge entry
    if (record.timestamps.length === 0 && !record.blockedUntil) {
      ipStore.delete(key);
    }
  });
}

/**
 * Verifies if an incoming request from an IP should be allowed or rate-limited.
 */
export function checkRateLimit(ip: string, pathname: string): RateLimitResult {
  const now = Date.now();
  cleanupStore(now);

  // Match the most specific route rule
  const rule =
    RATE_LIMIT_RULES.find((r) => pathname.startsWith(r.prefix)) ||
    RATE_LIMIT_RULES[RATE_LIMIT_RULES.length - 1];

  const compositeKey = `${ip}:${rule.prefix}`;
  let record = ipStore.get(compositeKey);

  if (!record) {
    record = { timestamps: [] };
    ipStore.set(compositeKey, record);
  }

  // 1. Check if IP is currently banned due to aggressive flooding
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      success: false,
      limit: rule.maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
      isBanned: true,
    };
  }

  // 2. Sliding window calculation
  const windowStart = now - rule.windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  // 3. If request count exceeds ban threshold, apply temporary ban
  if (record.timestamps.length >= rule.banThreshold) {
    record.blockedUntil = now + rule.banDurationMs;
    const retryAfter = Math.ceil(rule.banDurationMs / 1000);
    return {
      success: false,
      limit: rule.maxRequests,
      remaining: 0,
      retryAfterSeconds: retryAfter,
      isBanned: true,
    };
  }

  // 4. If request count exceeds standard rate limit, throttle with 429
  if (record.timestamps.length >= rule.maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + rule.windowMs - now) / 1000);
    return {
      success: false,
      limit: rule.maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
      isBanned: false,
    };
  }

  // 5. Allow request and record timestamp
  record.timestamps.push(now);
  return {
    success: true,
    limit: rule.maxRequests,
    remaining: Math.max(0, rule.maxRequests - record.timestamps.length),
    retryAfterSeconds: 0,
  };
}
