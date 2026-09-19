import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/coupons
 * Returns all currently active promotional coupons eligible for customer checkout.
 */
export async function GET() {
  try {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validTill: { gte: now },
      },
      orderBy: [
        { discountValue: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscount: true,
        validTill: true,
        usageLimit: true,
        usedCount: true,
      },
    });

    // Filter out coupons that have exceeded their global usage limit
    const availableCoupons = coupons
      .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
      .map(({ usageLimit, usedCount, ...coupon }) => coupon);

    return NextResponse.json({ coupons: availableCoupons });
  } catch (error: any) {
    console.error("[GET /api/coupons error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch available coupons." },
      { status: 500 }
    );
  }
}
