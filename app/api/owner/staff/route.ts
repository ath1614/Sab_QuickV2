import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const staffPayloadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  role: z.enum(["MANAGER", "PACKER", "RIDER"]),
  pin: z.string().trim().regex(/^\d{4}$/, "Staff PIN must be exactly 4 digits"),
  vehicleDetails: z.string().trim().optional(),
});

// GET /api/owner/staff - Fetch all staff members
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can view staff members." },
        { status: 403 }
      );
    }

    const staffMembers = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.OWNER, Role.MANAGER, Role.PACKER, Role.RIDER],
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        pin: true,
        phoneVerified: true,
        createdAt: true,
        riderProfile: {
          select: {
            vehicleDetails: true,
            isOnline: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ staff: staffMembers });
  } catch (error: any) {
    console.error("[GET /api/owner/staff error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff directory." },
      { status: 500 }
    );
  }
}

// POST /api/owner/staff - Create or update a staff member
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can manage staff accounts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = staffPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, phone, email, role, pin, vehicleDetails } = parseResult.data;

    // Disallow overriding the main Owner account via this endpoint
    if (phone === "9109066668") {
      return NextResponse.json(
        { error: "Owner account cannot be modified via Staff management." },
        { status: 400 }
      );
    }

    // Upsert staff user record
    const staffUser = await prisma.user.upsert({
      where: { phone },
      update: {
        name,
        email: email || null,
        role: role as Role,
        pin,
        phoneVerified: true,
      },
      create: {
        phone,
        name,
        email: email || null,
        role: role as Role,
        pin,
        phoneVerified: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        pin: true,
      },
    });

    // If Rider, upsert RiderProfile
    if (role === "RIDER") {
      await prisma.riderProfile.upsert({
        where: { userId: staffUser.id },
        update: {
          vehicleDetails: vehicleDetails || "EV Delivery Scooter",
          isOnline: true,
        },
        create: {
          userId: staffUser.id,
          vehicleDetails: vehicleDetails || "EV Delivery Scooter",
          isOnline: true,
          currentLat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "23.129243"),
          currentLng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG || "83.190082"),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Staff member ${staffUser.name} [${staffUser.role}] saved successfully with PIN ${pin}.`,
      staff: staffUser,
    });
  } catch (error: any) {
    console.error("[POST /api/owner/staff error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save staff member." },
      { status: 500 }
    );
  }
}

// DELETE /api/owner/staff - Deactivate / demote a staff member
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can delete staff." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("id");

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required." }, { status: 400 });
    }

    // Protect Owner account
    const targetUser = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (targetUser.role === Role.OWNER || targetUser.phone === "9109066668") {
      return NextResponse.json({ error: "Cannot delete the Store Owner account." }, { status: 400 });
    }

    // Demote to CUSTOMER and clear PIN
    await prisma.user.update({
      where: { id: staffId },
      data: {
        role: Role.CUSTOMER,
        pin: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member ${targetUser.name} deactivated successfully.`,
    });
  } catch (error: any) {
    console.error("[DELETE /api/owner/staff error]:", error);
    return NextResponse.json(
      { error: "Failed to delete staff member." },
      { status: 500 }
    );
  }
}
