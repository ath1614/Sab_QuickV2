import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const phone = body.phone?.trim();

    // Determine targeted user ID
    let targetUserId: string | null = null;

    if (session?.user?.id) {
      targetUserId = session.user.id;
    } else if (phone && /^[6-9]\d{9}$/.test(phone)) {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        return NextResponse.json({ error: "No account found matching this mobile number." }, { status: 404 });
      }
      targetUserId = user.id;
    } else {
      return NextResponse.json(
        { error: "Authentication required or valid 10-digit mobile number must be provided." },
        { status: 400 }
      );
    }

    // Safety: Prevent deleting Store Owner account
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (targetUser?.role === "OWNER" || targetUser?.phone === "9109066668") {
      return NextResponse.json(
        { error: "Store Owner account cannot be deleted via customer deletion request." },
        { status: 403 }
      );
    }

    // 1. Delete associated doorstep delivery addresses
    await prisma.address.deleteMany({
      where: { userId: targetUserId },
    });

    // 2. Anonymize user record: completely purge name, phone, email, and pin
    const anonymizedPhone = `deleted_${Date.now()}_${targetUserId.slice(0, 6)}`;
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: "Deleted Account",
        email: null,
        phone: anonymizedPhone,
        phoneVerified: false,
        pin: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer account and all associated personal data have been permanently purged.",
    });
  } catch (error: any) {
    console.error("[Account Deletion Error]:", error);
    return NextResponse.json(
      { error: "Failed to process account deletion request. Please contact support directly." },
      { status: 500 }
    );
  }
}
