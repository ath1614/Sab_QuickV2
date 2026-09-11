import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkDeliveryServiceability } from "@/lib/geo";

const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]).default("Home"),
  flatBuilding: z.string().trim().min(2, "Flat / Building number is required"),
  streetArea: z.string().trim().min(3, "Street / Area is required"),
  landmark: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view addresses." },
        { status: 401 }
      );
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("[GET /api/addresses error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to save an address." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = addressSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { label, flatBuilding, streetArea, landmark, latitude, longitude } =
      parseResult.data;

    // Check geofence serviceability
    const serviceability = checkDeliveryServiceability(latitude, longitude);

    if (!serviceability.isServiceable) {
      return NextResponse.json(
        {
          error: `Address is outside our ${serviceability.maxRadiusKm} km service zone (${serviceability.distanceKm} km from hub).`,
          distanceKm: serviceability.distanceKm,
          maxRadiusKm: serviceability.maxRadiusKm,
        },
        { status: 422 }
      );
    }

    // Insert new address record in PostgreSQL
    const newAddress = await prisma.address.create({
      data: {
        userId: session.user.id,
        label,
        flatBuilding,
        streetArea,
        landmark: landmark || null,
        latitude,
        longitude,
      },
    });

    return NextResponse.json({
      success: true,
      address: newAddress,
      serviceability,
    });
  } catch (error) {
    console.error("[POST /api/addresses error]:", error);
    return NextResponse.json(
      { error: "Failed to save address." },
      { status: 500 }
    );
  }
}
