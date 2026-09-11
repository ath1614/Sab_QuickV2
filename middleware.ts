import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Role requirement definitions for internal dashboards
  const protectedRoutes = [
    { prefix: "/owner", allowedRoles: ["OWNER"] },
    { prefix: "/manager", allowedRoles: ["MANAGER", "OWNER"] },
    { prefix: "/packer", allowedRoles: ["PACKER", "MANAGER", "OWNER"] },
    { prefix: "/rider", allowedRoles: ["RIDER"] },
  ];

  const matchedRule = protectedRoutes.find((r) => pathname.startsWith(r.prefix));

  if (matchedRule) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "local_development_secret_32_chars_minimum",
    });

    if (!token) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth_error", "unauthenticated");
      redirectUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const userRole = (token.role as string) || "CUSTOMER";

    if (!matchedRule.allowedRoles.includes(userRole)) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth_error", "unauthorized_role");
      redirectUrl.searchParams.set("role", userRole);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/manager/:path*",
    "/packer/:path*",
    "/rider/:path*",
  ],
};
