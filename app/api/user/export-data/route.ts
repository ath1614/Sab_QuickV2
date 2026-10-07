import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DPDP / GDPR Data Portability API:
 * Allows authenticated customers to download a complete export of their personal data,
 * saved addresses, and order history in JSON format.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to export account data." },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user profile, addresses, and full order history
    const [user, addresses, orders] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.address.findMany({
        where: { userId },
        select: {
          id: true,
          label: true,
          flatBuilding: true,
          streetArea: true,
          landmark: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { customerId: userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  title: true,
                  unitQuantity: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        service: "SabQuick Hyper-Local Provision Store",
        compliance: "Digital Personal Data Protection (DPDP) Act & GDPR Portability",
      },
      profile: user,
      savedAddresses: addresses,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        handlingFee: o.handlingFee,
        tipAmount: o.tipAmount,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        itemsCount: o.items.length,
        items: o.items.map((item) => ({
          title: item.product?.title || "Item",
          quantity: item.quantity,
          price: item.price,
          unitQuantity: item.product?.unitQuantity || "",
        })),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sabquick-data-export-${user.phone || "user"}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[User Data Export Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate data export." },
      { status: 500 }
    );
  }
}
