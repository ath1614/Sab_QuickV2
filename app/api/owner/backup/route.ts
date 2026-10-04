import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required to export database backup." },
        { status: 403 }
      );
    }

    await ensureDatabaseSchema();

    // Query all essential database tables
    const [
      users,
      categories,
      products,
      orders,
      addresses,
      coupons,
      themeConfig,
      themeCampaigns,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          role: true,
          roles: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { displayRank: "asc" },
      }),
      prisma.product.findMany({
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.order.findMany({
        include: {
          items: true,
          address: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.address.findMany(),
      prisma.coupon.findMany(),
      prisma.themeConfig.findMany(),
      prisma.themeCampaign.findMany(),
    ]);

    const backupData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        },
        version: "2.0",
        stats: {
          usersCount: users.length,
          categoriesCount: categories.length,
          productsCount: products.length,
          ordersCount: orders.length,
          addressesCount: addresses.length,
          couponsCount: coupons.length,
        },
      },
      data: {
        users,
        categories,
        products,
        orders,
        addresses,
        coupons,
        themeConfig,
        themeCampaigns,
      },
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `sabquick_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Database Backup Export Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate database backup." },
      { status: 500 }
    );
  }
}
