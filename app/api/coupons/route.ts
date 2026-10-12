import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/coupons
 * Returns all currently active promotional coupons eligible for customer checkout.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const now = new Date();

    let userOrderCount = 0;
    if (session?.user?.id) {
      userOrderCount = await prisma.order.count({
        where: {
          customerId: session.user.id,
          status: { not: "CANCELLED" },
        },
      });
    }

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

    // Filter out coupons that have exceeded their global usage limit or welcome limit
    const availableCoupons = coupons
      .filter((c) => {
        if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return false;
        if (c.code === "WELCOMEFREE" && userOrderCount >= 2) return false;
        return true;
      })
      .map(({ usageLimit, usedCount, ...coupon }) => coupon);

    // Place WELCOMEFREE at the front if eligible
    availableCoupons.sort((a, b) => {
      if (a.code === "WELCOMEFREE") return -1;
      if (b.code === "WELCOMEFREE") return 1;
      return 0;
    });

    return NextResponse.json({ coupons: availableCoupons });
  } catch (error: any) {
    console.error("[GET /api/coupons error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch available coupons." },
      { status: 500 }
    );
  }
}
