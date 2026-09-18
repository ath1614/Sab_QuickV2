import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role, DiscountType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Coupon code must be at least 2 characters")
    .max(20, "Coupon code cannot exceed 20 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric (e.g. WELCOME50, SAVE20)"),
  description: z.string().trim().max(150).optional().nullable(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive("Discount value must be greater than 0"),
  minOrderAmount: z.number().nonnegative("Minimum order amount cannot be negative").default(0),
  maxDiscount: z.number().positive("Max discount cap must be greater than 0").optional().nullable(),
  validFrom: z.string().datetime().optional(),
  validTill: z.string().datetime(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateCouponSchema = z.object({
  id: z.string().min(1, "Coupon ID is required"),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/)
    .optional(),
  description: z.string().trim().max(150).optional().nullable(),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscount: z.number().positive().optional().nullable(),
  validFrom: z.string().datetime().optional(),
  validTill: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/owner/coupons - Fetch all coupons for owner
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can view promotional coupons." },
        { status: 403 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return NextResponse.json({ coupons });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/owner/coupons error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch coupons." },
      { status: 500 }
    );
  }
}

// POST /api/owner/coupons - Create a new coupon
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can create coupons." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const cleanCode = body.code ? String(body.code).trim().toUpperCase() : "";
    const parseResult = createCouponSchema.safeParse({ ...body, code: cleanCode });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Additional percentage discount validation
    if (data.discountType === DiscountType.PERCENTAGE) {
      if (data.discountValue > 100) {
        return NextResponse.json(
          { error: "Percentage discount cannot exceed 100%." },
          { status: 400 }
        );
      }
    }

    const fromDate = data.validFrom ? new Date(data.validFrom) : new Date();
    const tillDate = new Date(data.validTill);
    if (tillDate <= fromDate) {
      return NextResponse.json(
        { error: "Expiry date must be in the future after valid from date." },
        { status: 400 }
      );
    }

    // Check code collision
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Coupon code '${data.code}' already exists.` },
        { status: 409 }
      );
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.discountType === DiscountType.PERCENTAGE ? data.maxDiscount || null : null,
        validFrom: fromDate,
        validTill: tillDate,
        usageLimit: data.usageLimit || null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${newCoupon.code} created successfully.`,
      coupon: newCoupon,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[POST /api/owner/coupons error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create coupon." },
      { status: 500 }
    );
  }
}

// PATCH /api/owner/coupons - Edit or toggle coupon status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can modify coupons." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (body.code) {
      body.code = String(body.code).trim().toUpperCase();
    }
    const parseResult = updateCouponSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, ...updates } = parseResult.data;

    const existing = await prisma.coupon.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Coupon not found." },
        { status: 404 }
      );
    }

    // Check code collision if code is updated
    if (updates.code && updates.code !== existing.code) {
      const codeCheck = await prisma.coupon.findUnique({
        where: { code: updates.code },
      });
      if (codeCheck) {
        return NextResponse.json(
          { error: `Coupon code '${updates.code}' is already in use.` },
          { status: 409 }
        );
      }
    }

    if (updates.discountType === DiscountType.PERCENTAGE && updates.discountValue && updates.discountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.discountType !== undefined) updateData.discountType = updates.discountType;
    if (updates.discountValue !== undefined) updateData.discountValue = updates.discountValue;
    if (updates.minOrderAmount !== undefined) updateData.minOrderAmount = updates.minOrderAmount;
    if (updates.maxDiscount !== undefined) updateData.maxDiscount = updates.maxDiscount;
    if (updates.validFrom !== undefined) updateData.validFrom = new Date(updates.validFrom);
    if (updates.validTill !== undefined) updateData.validTill = new Date(updates.validTill);
    if (updates.usageLimit !== undefined) updateData.usageLimit = updates.usageLimit;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const updated = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${updated.code} updated successfully.`,
      coupon: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[PATCH /api/owner/coupons error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update coupon." },
      { status: 500 }
    );
  }
}

// DELETE /api/owner/coupons - Delete a coupon
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can delete coupons." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const force = url.searchParams.get("force") === "true";

    if (!id) {
      return NextResponse.json(
        { error: "Coupon ID is required for deletion." },
        { status: 400 }
      );
    }

    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Coupon not found." },
        { status: 404 }
      );
    }

    // If existing orders reference this coupon
    if (existing._count.orders > 0 && !force) {
      return NextResponse.json(
        {
          error: `This coupon has been used in ${existing._count.orders} order(s). Deleting it will unlink past order records. Confirm to proceed or disable it instead.`,
          ordersCount: existing._count.orders,
          requiresForce: true,
        },
        { status: 400 }
      );
    }

    // Safely unlink orders if forced
    if (existing._count.orders > 0 && force) {
      await prisma.order.updateMany({
        where: { couponId: id },
        data: { couponId: null },
      });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${existing.code} deleted successfully.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[DELETE /api/owner/coupons error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete coupon." },
      { status: 500 }
    );
  }
}
