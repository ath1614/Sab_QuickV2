import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role, OrderStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Owner role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("search")?.trim() || "";

    const whereClause: any = {
      role: Role.CUSTOMER,
    };

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    // 1. Query customers matching search filter
    const rawCustomers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        phoneVerified: true,
        createdAt: true,
        addresses: {
          select: {
            id: true,
            label: true,
            flatBuilding: true,
            streetArea: true,
            landmark: true,
          },
          take: 2,
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            paymentMethod: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 2. Format customer rows with calculated metrics
    const customers = rawCustomers.map((c) => {
      const deliveredOrders = c.orders.filter(
        (o) => o.status === OrderStatus.DELIVERED
      );
      const totalSpent = deliveredOrders.reduce(
        (acc, o) => acc + o.totalAmount,
        0
      );
      const lastOrder = c.orders[0] || null;

      return {
        id: c.id,
        name: c.name || "Customer",
        phone: c.phone,
        email: c.email,
        phoneVerified: c.phoneVerified,
        createdAt: c.createdAt.toISOString(),
        orderCount: c._count.orders,
        ordersCount: c._count.orders,
        addressCount: c._count.addresses,
        totalSpent: Math.round(totalSpent * 100) / 100,
        lifetimeSpend: Math.round(totalSpent * 100) / 100,
        lastOrder: lastOrder
          ? {
              orderNumber: lastOrder.orderNumber,
              status: lastOrder.status,
              totalAmount: lastOrder.totalAmount,
              date: lastOrder.createdAt.toISOString(),
            }
          : null,
        recentOrders: c.orders.slice(0, 5).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt.toISOString(),
          paymentMethod: o.paymentMethod,
        })),
        addresses: c.addresses,
      };
    });

    // 3. Compute High-Level CRM Metrics
    const totalCustomers = await prisma.user.count({
      where: { role: Role.CUSTOMER },
    });
    const verifiedCustomers = await prisma.user.count({
      where: { role: Role.CUSTOMER, phoneVerified: true },
    });
    const totalRevenueAgg = await prisma.order.aggregate({
      where: { status: OrderStatus.DELIVERED },
      _sum: { totalAmount: true },
    });

    const totalLifetimeRevenue = Math.round((totalRevenueAgg._sum.totalAmount || 0) * 100) / 100;
    const repeatBuyersCount = customers.filter((c) => c.ordersCount >= 2).length;

    const kpisData = {
      totalCustomers,
      verifiedCustomers,
      repeatCustomers: repeatBuyersCount,
      totalLifetimeRevenue,
    };

    return NextResponse.json({
      success: true,
      customers,
      stats: {
        ...kpisData,
        totalRevenue: totalLifetimeRevenue,
        averageOrderValue:
          customers.length > 0
            ? Math.round(
                totalLifetimeRevenue /
                  Math.max(1, customers.reduce((sum, c) => sum + c.orderCount, 0))
              )
            : 0,
      },
      kpis: kpisData,
    });
  } catch (error: any) {
    console.error("[GET /api/owner/customers error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load customer CRM data." },
      { status: 500 }
    );
  }
}

const updateCustomerSchema = z.object({
  id: z.string().min(1, "Customer ID is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number")
    .optional(),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  phoneVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Owner role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateCustomerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, name, phone, email, phoneVerified } = parseResult.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (phoneVerified !== undefined) updateData.phoneVerified = phoneVerified;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Customer ${updatedUser.name} updated successfully.`,
      customer: updatedUser,
    });
  } catch (error: any) {
    console.error("[PATCH /api/owner/customers error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update customer." },
      { status: 500 }
    );
  }
}
