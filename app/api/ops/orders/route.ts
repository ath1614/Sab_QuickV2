import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    if (!["PACKER", "MANAGER", "OWNER"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Store operations authorization required." },
        { status: 403 }
      );
    }

    // 1. Query recent and active orders with full relation graph
    const rawOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            riderProfile: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              include: {
                category: {
                  include: {
                    parent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const now = Date.now();

    const formattedOrders = rawOrders.map((order) => {
      const createdMs = new Date(order.createdAt).getTime();
      const elapsedMinutes = Math.max(0, Math.floor((now - createdMs) / 60000));

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryOtp: order.deliveryOtp,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        handlingFee: order.handlingFee,
        tipAmount: order.tipAmount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),
        packedAt: order.packedAt ? order.packedAt.toISOString() : null,
        deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
        elapsedMinutes,
        customer: order.customer,
        rider: order.rider,
        address: order.address,
        items: order.items.map((item) => {
          // Resolve Aisle name (Parent Category or Category)
          const aisleName =
            item.product.category?.parent?.name ||
            item.product.category?.name ||
            "General Groceries";

          return {
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            aisle: aisleName,
            product: {
              id: item.product.id,
              title: item.product.title,
              name: item.product.title,
              unitQuantity: item.product.unitQuantity,
              packSize: item.product.unitQuantity,
              imageUrl: item.product.imageUrl,
              stockCount: item.product.stockCount,
              stockQuantity: item.product.stockCount,
              isAvailable: item.product.isAvailable,
              aisle: aisleName,
              categoryName: item.product.category?.name || "Grocery",
            },
          };
        }),
      };
    });

    // 2. Group orders by status
    const grouped = {
      PENDING: formattedOrders.filter((o) => o.status === OrderStatus.PENDING),
      PACKING: formattedOrders.filter((o) => o.status === OrderStatus.PACKING),
      READY_FOR_PICKUP: formattedOrders.filter(
        (o) => o.status === OrderStatus.READY_FOR_PICKUP
      ),
      OUT_FOR_DELIVERY: formattedOrders.filter(
        (o) => o.status === OrderStatus.OUT_FOR_DELIVERY
      ),
      DELIVERED: formattedOrders.filter(
        (o) => o.status === OrderStatus.DELIVERED
      ),
      CANCELLED: formattedOrders.filter(
        (o) => o.status === OrderStatus.CANCELLED
      ),
    };

    // 3. Query all riders with profiles for assignment dropdown
    const riders = await prisma.user.findMany({
      where: {
        OR: [
          { role: Role.RIDER },
          { roles: { has: Role.RIDER } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        riderProfile: {
          select: {
            isOnline: true,
            vehicleDetails: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      grouped,
      riders: riders.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        isOnline: Boolean(r.riderProfile?.isOnline),
        vehicleDetails: r.riderProfile?.vehicleDetails || "Courier",
      })),
    });
  } catch (error: any) {
    console.error("[GET /api/ops/orders error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch operations orders." },
      { status: 500 }
    );
  }
}
