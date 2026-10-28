import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { checkDeliveryServiceability } from "@/lib/geo";
import { isOnlinePaymentsEnabled } from "@/lib/env";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

const createOrderSchema = z.object({
  addressId: z.string().min(1, "Delivery address is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required in cart"),
  tipAmount: z.number().min(0).default(0),
  paymentMethod: z
    .enum(["ONLINE_UPI", "ONLINE_PREPAID", "CASHFREE", "UPI_DOORSTEP", "RAZORPAY", "CASH_ON_DELIVERY"])
    .default("ONLINE_UPI")
    .transform((val) => {
      if (val === "ONLINE_UPI" || val === "CASHFREE" || (val as string) === "RAZORPAY") return "ONLINE_PREPAID";
      return val;
    }),
  couponCode: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let checkoutLockKey: string | null = null;
  try {
    // 1. Enforce active NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to place an order." },
        { status: 401 }
      );
    }

    // 2. Validate user and phone verification status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    if (!user.phoneVerified || !user.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone verification required. Please verify your mobile number before checkout.",
          code: "PHONE_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    // 3. Validate request body with Zod
    const body = await req.json().catch(() => null);
    const parseResult = createOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0].message,
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    // 4. Concurrency Mutex Lock & Idempotency Check
    const rawIdempotencyKey =
      req.headers.get("x-idempotency-key") ||
      (body && typeof body === "object" ? body.idempotencyKey : undefined);
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
        ? rawIdempotencyKey.trim()
        : null;

    checkoutLockKey = `checkout:lock:${user.id}`;
    const acquired = await redis.set(checkoutLockKey, "1", "EX", 8, "NX");
    if (!acquired) {
      return NextResponse.json(
        {
          success: false,
          error: "An order submission is already in progress. Please wait a moment.",
          code: "CONCURRENT_CHECKOUT",
        },
        { status: 429 }
      );
    }

    // Check if an order was already successfully created for this exact idempotency key
    if (idempotencyKey) {
      try {
        const cachedResponse = await redis.get(`idempotency:order:${user.id}:${idempotencyKey}`);
        if (cachedResponse) {
          if (checkoutLockKey) {
            await redis.del(checkoutLockKey).catch(() => {});
            checkoutLockKey = null;
          }
          return NextResponse.json(JSON.parse(cachedResponse), { status: 200 });
        }
      } catch (cacheErr) {
        console.warn("[Idempotency Read Warning]:", cacheErr);
      }
    }

    const { addressId, items, tipAmount, paymentMethod, couponCode } = parseResult.data;

    if (paymentMethod === PaymentMethod.ONLINE_PREPAID && !isOnlinePaymentsEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Online payments are temporarily unavailable. Please choose cash on delivery or UPI at delivery.",
          code: "ONLINE_PAYMENTS_DISABLED",
        },
        { status: 503 }
      );
    }

    // 5. Verify delivery address and 3.5 km Geofence
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Delivery address not found or not owned by user." },
        { status: 404 }
      );
    }

    const serviceability = checkDeliveryServiceability(
      address.latitude,
      address.longitude
    );

    if (!serviceability.isServiceable) {
      return NextResponse.json(
        {
          success: false,
          error: `Address is outside our ${serviceability.maxRadiusKm} km delivery zone (${serviceability.distanceKm} km away).`,
          distanceKm: serviceability.distanceKm,
        },
        { status: 422 }
      );
    }

    // 6. Execute Atomic Database Transaction with Prisma
    const order = await prisma.$transaction(async (tx) => {
      // 6a. Fetch and lock products for stock verification
      const productIds = items.map((i) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Verify all products exist and look serviceable
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (!product.isAvailable || product.stockCount < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.title}". Only ${product.stockCount} unit(s) available.`);
        }

        if (item.quantity > 6) {
          throw new Error(`Bulk orders are not allowed. Maximum 6 units allowed for "${product.title}".`);
        }
      }

      // 6b. Decrement stock ATOMICALLY: the conditional update re-checks the
      // stock level at write time, so two concurrent orders can never oversell
      // the same unit (fixes the check-then-decrement race).
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const claimed = await tx.product.updateMany({
          where: {
            id: item.productId,
            isAvailable: true,
            stockCount: { gte: item.quantity },
          },
          data: {
            stockCount: { decrement: item.quantity },
          },
        });

        if (claimed.count === 0) {
          throw new Error(`Insufficient stock for product ${product.title}`);
        }
      }

      // Flip availability off for any product that just hit zero stock.
      await tx.product.updateMany({
        where: {
          id: { in: productIds },
          stockCount: { lte: 0 },
        },
        data: { isAvailable: false },
      });

      // 6c. Generate a collision-checked unique Order Number (e.g. SQ-108233).
      let orderNumber = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = `SQ-${crypto.randomInt(100000, 1000000)}`;
        const exists = await tx.order.findUnique({
          where: { orderNumber: candidate },
          select: { id: true },
        });
        if (!exists) {
          orderNumber = candidate;
          break;
        }
      }
      if (!orderNumber) {
        throw new Error("Could not allocate a unique order number. Please retry.");
      }

      // 6d. Generate a cryptographically random 4-digit Delivery OTP
      const deliveryOtp = crypto.randomInt(1000, 10000).toString();

      // 6e. Financial calculations & Coupon validation
      const rawSubtotal = items.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        return sum + product.salePrice * item.quantity;
      }, 0);
      const subtotal = Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;

      let couponId: string | undefined = undefined;
      let discountAmount = 0;

      if (couponCode && couponCode.trim()) {
        const cleanCode = couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({
          where: { code: cleanCode },
        });

        if (!coupon || !coupon.isActive) {
          throw new Error("Invalid or inactive coupon code.");
        }

        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validTill) {
          throw new Error("Coupon is expired or not yet active.");
        }

        if (subtotal < coupon.minOrderAmount) {
          throw new Error(
            `Minimum order amount of ₹${coupon.minOrderAmount} required for coupon ${cleanCode}.`
          );
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new Error("Coupon usage limit has been reached.");
        }

        if (cleanCode === "WELCOMEFREE") {
          const userOrderCount = await tx.order.count({
            where: {
              customerId: user.id,
              status: { not: "CANCELLED" },
            },
          });
          if (userOrderCount >= 2) {
            throw new Error("WELCOMEFREE coupon is only valid on your first 2 orders.");
          }
        }

        if (coupon.discountType === "FLAT") {
          discountAmount = coupon.discountValue;
        } else if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscount);
          }
        }

        discountAmount = Math.min(discountAmount, subtotal);
        discountAmount = Math.round(discountAmount * 100) / 100;
        couponId = coupon.id;

        // Atomically increment Coupon.usedCount with a conditional claim
        const couponClaim = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            ...(coupon.usageLimit !== null
              ? { usedCount: { lt: coupon.usageLimit } }
              : {}),
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });

        if (couponClaim.count === 0) {
          throw new Error("Coupon usage limit has been reached.");
        }
      }

      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const deliveryFee = discountedSubtotal >= 199 ? 0 : 25;
      const handlingFee = 2;
      const totalAmount =
        Math.round((discountedSubtotal + deliveryFee + handlingFee + tipAmount) * 100) / 100;

      // 6f. Create Order and OrderItem records
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: user.id,
          addressId: address.id,
          status: "PENDING",
          deliveryOtp,
          subtotal,
          couponId,
          discountAmount,
          deliveryFee,
          handlingFee,
          tipAmount,
          totalAmount,
          paymentMethod,
          paymentStatus: "PENDING",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: productMap.get(item.productId)!.salePrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          address: true,
        },
      });

      return newOrder;
    });

    // 7. Redis Event Notification to channel orders:dispatch
    if (order.paymentMethod !== "CASHFREE" && (order.paymentMethod as string) !== "ONLINE_PREPAID") {
      try {
        await redis.publish(
          "orders:dispatch",
          JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerId: order.customerId,
            totalAmount: order.totalAmount,
            deliveryOtp: order.deliveryOtp,
            createdAt: order.createdAt,
          })
        );
      } catch (redisErr) {
        console.warn("[Redis publish error on orders:dispatch]:", redisErr);
      }
    }

    // 8. Dispatch Push Notification to Store Staff & Customer
    //
    // Prepaid orders are only created here, not paid: the customer may still
    // fail or abandon checkout. Alerting the store now would put a "new order"
    // in front of staff for an order that becomes Cancelled seconds later, so
    // the confirmation path (Cashfree verify / webhook) sends this alert once
    // the money is actually confirmed.
    const isPrepaidOnline =
      order.paymentMethod === "CASHFREE" ||
      order.paymentMethod === "ONLINE_PREPAID" ||
      order.paymentMethod === "RAZORPAY";

    if (!isPrepaidOnline) {
      try {
        const { sendNewOrderStaffAlert, sendOrderStatusPushNotification } = await import("@/lib/notifications");
        // Alert store staff (Owner, Manager, Packer) of incoming order
        sendNewOrderStaffAlert({
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
        }).catch((e) => console.warn("[FCM New Order Alert Warning]:", e));

        // Alert customer of order receipt
        sendOrderStatusPushNotification(order.id, order.status).catch((e) =>
          console.warn("[FCM Customer Order Push Warning]:", e)
        );
      } catch (pushErr) {
        console.warn("[Push Notification Import Warning]:", pushErr);
      }
    }

    const responsePayload = {
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      deliveryOtp: order.deliveryOtp,
      totalAmount: order.totalAmount,
      status: order.status,
    };

    // Cache idempotent response for 5 minutes
    if (idempotencyKey) {
      await redis.set(
        `idempotency:order:${user.id}:${idempotencyKey}`,
        JSON.stringify(responsePayload),
        "EX",
        300
      ).catch(() => {});
    }

    // Invalidate catalog storefront cache so real-time stock reflects
    await redis.del("cache:products:home:v1").catch(() => {});

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/orders error]:", error);

    // Handle expected stock / validation transaction errors
    if (error.message && error.message.startsWith("Insufficient stock")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process order",
      },
      { status: 500 }
    );
  } finally {
    if (checkoutLockKey) {
      await redis.del(checkoutLockKey).catch(() => {});
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: true, orders: [] }, { status: 200 });
    }

    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        customerId: session.user.id,
        // Exclude abandoned unpaid online orders older than 15 minutes
        NOT: {
          status: OrderStatus.PENDING,
          paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
          paymentMethod: {
            in: [
              PaymentMethod.ONLINE_PREPAID,
              PaymentMethod.CASHFREE,
              PaymentMethod.RAZORPAY,
            ],
          },
          createdAt: { lt: cutoffTime },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        rider: {
          include: {
            riderProfile: true,
          },
        },
        offlineCollector: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("[GET /api/orders error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
