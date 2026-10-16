import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Direct unverified phone saving is disabled for security. Mobile numbers must be verified through SMS verification code at /api/auth/otp/verify.",
    },
    { status: 403 }
  );
}

