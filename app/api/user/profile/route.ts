import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const cleanName = (body.name || "").trim();

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid name (at least 2 characters)." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: cleanName },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile name updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[Profile Update Error]:", error);
    return NextResponse.json(
      { error: "Failed to update profile name. Please try again." },
      { status: 500 }
    );
  }
}
