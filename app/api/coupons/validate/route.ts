import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  cartTotal: z.number().min(0, "Cart total must be non-negative"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = validateCouponSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { valid: false, error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, cartTotal } = parseResult.data;
    const cleanCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "Invalid coupon code." },
        { status: 404 }
      );
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { valid: false, error: "This coupon is no longer active." },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now < coupon.validFrom) {
      return NextResponse.json(
        { valid: false, error: "This coupon is not yet active." },
        { status: 400 }
      );
    }

    if (now > coupon.validTill) {
      return NextResponse.json(
        { valid: false, error: "This coupon has expired." },
        { status: 400 }
      );
    }

    if (cartTotal < coupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`,
        },
        { status: 400 }
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { valid: false, error: "This coupon has reached its maximum usage limit." },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === "FLAT") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    }

    // Discount cannot exceed cart total
    discountAmount = Math.min(discountAmount, cartTotal);
    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalTotal = Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountAmount,
      finalTotal,
    });
  } catch (error: any) {
    console.error("[POST /api/coupons/validate error]:", error);
    return NextResponse.json(
      { valid: false, error: error.message || "Failed to validate coupon." },
      { status: 500 }
    );
  }
}
