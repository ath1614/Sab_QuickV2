import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  roles: z.array(z.enum(["RIDER", "PACKER", "MANAGER"])).min(1, "Select at least one role").optional(),
  role: z.enum(["RIDER", "PACKER", "MANAGER"]).optional(),
  pin: z.string().trim().regex(/^\d{4}$/, "Staff PIN must be 4 digits").optional(),
  vehicleDetails: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate session & enforce OWNER role
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }

    if (session.user.role !== Role.OWNER) {
      return NextResponse.json(
        { error: "Forbidden: Only the Store Owner can provision staff accounts." },
        { status: 403 }
      );
    }

    // 2. Validate input payload
    const body = await req.json().catch(() => ({}));
    const parseResult = createStaffSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, phone, email, roles, role, pin, vehicleDetails } = parseResult.data;

    // Disallow overriding the main Owner account
    if (phone === "9109066668") {
      return NextResponse.json(
        { error: "Owner account cannot be modified via Staff provisioning." },
        { status: 400 }
      );
    }

    const assignedRoles: Role[] = roles && roles.length > 0
      ? (roles as Role[])
      : [((role as Role) || Role.PACKER)];
    const primaryRole = assignedRoles[0];

    // 3. Upsert user record with safe nullable email and PIN
    const staffUser = await prisma.user.upsert({
      where: { phone },
      update: {
        name,
        email: email || null,
        role: primaryRole,
        roles: assignedRoles,
        phoneVerified: true,
        ...(pin ? { pin } : {}),
      },
      create: {
        phone,
        name,
        email: email || null,
        role: primaryRole,
        roles: assignedRoles,
        phoneVerified: true,
        pin: pin || "1234",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        phoneVerified: true,
        role: true,
        roles: true,
        pin: true,
      },
    });

    // 4. If RIDER in assigned roles, upsert RiderProfile
    if (assignedRoles.includes(Role.RIDER)) {
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
      message: `Staff account successfully provisioned for ${staffUser.name} as [${assignedRoles.join(", ")}].`,
      user: staffUser,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to create staff account.";
    console.error("[POST /api/owner/staff/create error]:", errorMsg);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error provisioning staff."
            : errorMsg,
      },
      { status: 500 }
    );
  }
}
