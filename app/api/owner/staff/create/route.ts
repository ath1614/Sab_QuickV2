import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number starting with 6-9"),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  role: z.enum(["RIDER", "PACKER", "MANAGER", "OWNER"]),
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
    const body = await req.json();
    const parseResult = createStaffSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, phone, email, role, vehicleDetails } = parseResult.data;

    // 3. Check for existing user by phone
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    let staffUser;

    if (existingUser) {
      staffUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          role: role as Role,
          phoneVerified: true,
          ...(email ? { email } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          role: true,
        },
      });
    } else {
      staffUser = await prisma.user.create({
        data: {
          name,
          phone,
          role: role as Role,
          phoneVerified: true,
          ...(email ? { email } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          role: true,
        },
      });
    }

    // 4. If RIDER role, upsert RiderProfile
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
          currentLat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "28.6139"),
          currentLng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG || "77.2090"),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Staff account successfully provisioned for ${staffUser.name} as [${staffUser.role}].`,
      user: staffUser,
    });
  } catch (error: any) {
    console.error("[POST /api/owner/staff/create error]:", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error provisioning staff."
            : error.message || "Failed to create staff account.",
      },
      { status: 500 }
    );
  }
}
