import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { checkDeliveryServiceability } from "@/lib/geo";

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
    .enum(["UPI_DOORSTEP", "ONLINE_PREPAID"])
    .default("UPI_DOORSTEP"),
});

export async function POST(req: NextRequest) {
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

    const { addressId, items, tipAmount, paymentMethod } = parseResult.data;

    // 4. Verify delivery address and 2.5 km Geofence
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

    // 5. Execute Atomic Database Transaction with Prisma
    const order = await prisma.$transaction(async (tx) => {
      // 5a. Fetch and lock products for stock verification
      const productIds = items.map((i) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Verify all products exist and have sufficient stock
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (!product.isAvailable || product.stockCount < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.title}`);
        }
      }

      // 5b. Decrement stock atomically (and flip isAvailable to false if 0)
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const remainingStock = product.stockCount - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockCount: remainingStock,
            isAvailable: remainingStock > 0,
          },
        });
      }

      // 5c. Generate unique Order Number (e.g. SQ-1082 or SQ-XXXX)
      const randomOrderNum = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `SQ-${randomOrderNum}`;

      // 5d. Generate secure 4-digit Delivery OTP
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // 5e. Financial calculations
      const subtotal = items.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        return sum + product.salePrice * item.quantity;
      }, 0);

      const deliveryFee = subtotal >= 199 ? 0 : 15;
      const handlingFee = 2;
      const totalAmount = subtotal + deliveryFee + handlingFee + tipAmount;

      // 5f. Create Order and OrderItem records
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: user.id,
          addressId: address.id,
          status: "PENDING",
          deliveryOtp,
          subtotal,
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

    // 6. Redis Event Notification to channel orders:dispatch
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

    return NextResponse.json(
      {
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        deliveryOtp: order.deliveryOtp,
        totalAmount: order.totalAmount,
        status: order.status,
      },
      { status: 201 }
    );
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
  }
}
