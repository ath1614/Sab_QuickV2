import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getClientIp, checkRateLimit, isMaliciousScanner } from "@/lib/rateLimit";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Block known offensive vulnerability scanners and exploit bots
  const userAgent = req.headers.get("user-agent");
  if (isMaliciousScanner(userAgent)) {
    return new NextResponse("Access Denied", { status: 403 });
  }

  // 2. Sliding-Window IP Rate Limiter & Flood Shield.
  // No header-based prefetch exemption: it was a documented bypass for every
  // API route. Next.js prefetches are normal GETs and fit the generous limits.
  const clientIp = getClientIp(req.headers);
  const rateLimit = checkRateLimit(clientIp, pathname);

  if (!rateLimit.success) {
    const isApi = pathname.startsWith("/api/");
    if (isApi) {
      return NextResponse.json(
        {
          error: rateLimit.isBanned
            ? "Your IP has been temporarily suspended due to excessive automated requests."
            : "Too many requests. Please slow down and try again.",
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return new NextResponse(
      "<!DOCTYPE html><html><body style='font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;background:#f8fafc;color:#0f172a;'><div style='max-width:480px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);'><h2 style='color:#ef4444;margin-top:0;'>Too Many Requests</h2><p style='color:#475569;line-height:1.6;'>Our automated shield detected unusual request volume from your network. Please wait a few moments before trying again.</p></div></body></html>",
      {
        status: 429,
        headers: {
          "Content-Type": "text/html",
          "Retry-After": rateLimit.retryAfterSeconds.toString(),
        },
      }
    );
  }

  // Public rider onboarding portal is open to anyone wishing to join the delivery fleet
  if (pathname === "/rider/apply") {
    return NextResponse.next();
  }

  // 3. Role requirement definitions for internal staff portals and administrative endpoints
  const protectedRoutes = [
    { prefix: "/owner/catalog", allowedRoles: ["OWNER", "MANAGER"] },
    { prefix: "/owner/riders", allowedRoles: ["OWNER", "MANAGER"] },
    { prefix: "/owner", allowedRoles: ["OWNER", "MANAGER"] },
    { prefix: "/manager", allowedRoles: ["MANAGER", "OWNER"] },
    { prefix: "/packer", allowedRoles: ["PACKER", "MANAGER", "OWNER"] },
    { prefix: "/rider", allowedRoles: ["RIDER", "OWNER", "MANAGER"] },
    { prefix: "/api/owner", allowedRoles: ["OWNER", "MANAGER"] },
    { prefix: "/api/ops", allowedRoles: ["PACKER", "MANAGER", "OWNER"] },
  ];

  const matchedRule = protectedRoutes.find((r) => pathname.startsWith(r.prefix));

  if (matchedRule) {
    const isApi = pathname.startsWith("/api/");
    const authSecret = process.env.NEXTAUTH_SECRET;

    if (!authSecret) {
      if (isApi) {
        return NextResponse.json(
          { error: "Server configuration error." },
          { status: 500 }
        );
      }
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const token = await getToken({ req, secret: authSecret });

    if (!token || !token.id || (token as any).invalid) {
      if (isApi) {
        return NextResponse.json(
          { error: "Unauthorized: Authentication required." },
          { status: 401 }
        );
      }
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth_error", "unauthenticated");
      redirectUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const userRole = (token.role as string) || "CUSTOMER";
    const userRoles: string[] = Array.isArray(token.roles) && token.roles.length > 0
      ? (token.roles as string[])
      : [userRole];

    const hasAllowedRole = userRoles.some((r) => matchedRule.allowedRoles.includes(r));

    if (!hasAllowedRole) {
      if (isApi) {
        return NextResponse.json(
          { error: "Forbidden: Unauthorized role." },
          { status: 403 }
        );
      }
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth_error", "unauthorized_role");
      redirectUrl.searchParams.set("role", userRole);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg, favicon.png
     * - static brand assets & media (*.png, *.jpg, *.jpeg, *.gif, *.webp, *.svg, *.ico, *.webm)
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|favicon.png|brand/|uploads/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|webm)$).*)",
  ],
};
