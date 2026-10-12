import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { OrderStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["OWNER", "MANAGER"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Access denied. Owner or Manager role required." }, { status: 403 });
    }

    await ensureDatabaseSchema();

    // 1. Fetch pending & past applications
    const applications = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "RiderApplication" ORDER BY "createdAt" DESC LIMIT 50`
    );

    // 2. Fetch existing riders
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
        role: true,
        roles: true,
        createdAt: true,
        riderProfile: {
          select: {
            isOnline: true,
            vehicleDetails: true,
            updatedAt: true,
          },
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            tipAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeRiders = riders.map((r) => {
      const deliveredOrders = r.deliveries.filter((d) => d.status === OrderStatus.DELIVERED);
      const todayDelivered = deliveredOrders.filter((d) => new Date(d.createdAt) >= startOfToday);
      const totalTips = deliveredOrders.reduce((sum, d) => sum + (d.tipAmount || 0), 0);
      const totalEarnings = deliveredOrders.length * 30 + totalTips;
      const todayEarnings = todayDelivered.length * 30 + todayDelivered.reduce((sum, d) => sum + (d.tipAmount || 0), 0);

      return {
        id: r.id,
        name: r.name || "Delivery Partner",
        phone: r.phone,
        isOnline: r.riderProfile?.isOnline || false,
        vehicleDetails: r.riderProfile?.vehicleDetails || "Standard Two-Wheeler",
        lifetimeDeliveries: deliveredOrders.length,
        todayDeliveries: todayDelivered.length,
        todayEarnings,
        totalEarnings,
        joinedAt: r.createdAt,
      };
    });

    return NextResponse.json({
      applications: applications || [],
      activeRiders,
    });
  } catch (error: any) {
    console.error("[GET /api/ops/riders error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch rider operations data." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["OWNER", "MANAGER"].includes(session.user?.role)) {
      return NextResponse.json({ error: "Access denied. Owner or Manager role required." }, { status: 403 });
    }

    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const { applicationId, action } = body;

    if (!applicationId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Valid applicationId and action (APPROVE/REJECT) are required." }, { status: 400 });
    }

    const applications = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "RiderApplication" WHERE "id" = $1 LIMIT 1`,
      applicationId
    );

    if (!applications || applications.length === 0) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const app = applications[0];

    if (action === "REJECT") {
      await prisma.$executeRawUnsafe(
        `UPDATE "RiderApplication" SET "status" = 'REJECTED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
        applicationId
      );
      return NextResponse.json({ success: true, message: `Application for ${app.name} has been rejected.` });
    }

    // Action === "APPROVE"
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: app.phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: app.name,
          phone: app.phone,
          phoneVerified: true,
          role: Role.RIDER,
          roles: [Role.RIDER, Role.CUSTOMER],
        },
      });
    } else {
      // Add RIDER role to existing user
      const existingRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      const updatedRoles = Array.from(new Set([...existingRoles, Role.RIDER]));

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: Role.RIDER,
          roles: updatedRoles,
          phoneVerified: true,
        },
      });
    }

    // Create or update RiderProfile
    const profile = await prisma.riderProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      await prisma.riderProfile.create({
        data: {
          userId: user.id,
          vehicleDetails: app.vehicleType || "Electric Two-Wheeler",
          isOnline: false,
        },
      });
    } else {
      await prisma.riderProfile.update({
        where: { id: profile.id },
        data: {
          vehicleDetails: app.vehicleType || profile.vehicleDetails,
        },
      });
    }

    // Mark application approved
    await prisma.$executeRawUnsafe(
      `UPDATE "RiderApplication" SET "status" = 'APPROVED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      applicationId
    );

    return NextResponse.json({
      success: true,
      message: `Partner ${app.name} (${app.phone}) approved as active Rider! They can now log in to the Rider Console.`,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/ops/riders error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update rider status." }, { status: 500 });
  }
}
