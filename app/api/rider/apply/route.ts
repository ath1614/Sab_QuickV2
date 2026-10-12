import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureDatabaseSchema } from "@/lib/db-self-heal";
import { z } from "zod";

export const dynamic = "force-dynamic";

const riderApplySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().regex(/^\d{10}$/, "Please enter a valid 10-digit mobile number"),
  city: z.string().trim().min(2, "City is required"),
  vehicleType: z.string().trim().min(2, "Vehicle type is required"),
  licenseNumber: z.string().trim().optional(),
  emergencyPhone: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const body = await req.json().catch(() => ({}));
    const parseResult = riderApplySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, phone, city, vehicleType, licenseNumber, emergencyPhone } = parseResult.data;

    // Check existing application
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "RiderApplication" WHERE "phone" = $1 LIMIT 1`,
      phone
    );

    if (existing && existing.length > 0) {
      const app = existing[0];
      if (app.status === "APPROVED") {
        return NextResponse.json({
          success: true,
          status: "APPROVED",
          message: "Your rider partner account is already approved! You can log in directly using your phone number.",
        });
      }
      return NextResponse.json({
        success: true,
        status: "PENDING",
        message: "Your application is already received and currently under review by our Fleet Dispatch team.",
      });
    }

    const id = `rider_app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RiderApplication" ("id", "name", "phone", "city", "vehicleType", "licenseNumber", "emergencyPhone", "status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
      id,
      name,
      phone,
      city,
      vehicleType,
      licenseNumber || null,
      emergencyPhone || null
    );

    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: "Application submitted successfully! Our Fleet Manager will review and contact you within 24 hours.",
    });
  } catch (error: any) {
    console.error("[POST /api/rider/apply error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit rider application." },
      { status: 500 }
    );
  }
}
