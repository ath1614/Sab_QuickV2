import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const campaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Campaign name must be at least 2 characters"),
  primaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a hex color"),
  accentColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Accent color must be a hex color"),
  saleTagText: z.string().trim().max(120).optional().nullable(),
  bannerImageUrl: z.string().trim().max(500).optional().nullable(),
  validFrom: z.string().min(10, "Campaign start date is required"),
  validUntil: z.string().min(10, "Campaign end date is required"),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required." },
        { status: 403 }
      );
    }

    const campaigns = await prisma.themeCampaign.findMany({
      orderBy: [{ priority: "desc" }, { validFrom: "desc" }],
      take: 100,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[GET /api/ops/theme/campaigns error]:", error);
    return NextResponse.json({ error: "Failed to load theme campaigns." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = campaignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, name, primaryColor, accentColor, saleTagText, bannerImageUrl, validFrom, validUntil, priority, isActive } = parseResult.data;

    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);
    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: "Invalid campaign dates." }, { status: 400 });
    }
    if (untilDate <= fromDate) {
      return NextResponse.json(
        { error: "Campaign end must be after its start." },
        { status: 400 }
      );
    }

    const data = {
      name,
      primaryColor: primaryColor.toUpperCase(),
      accentColor: accentColor.toUpperCase(),
      saleTagText: saleTagText || null,
      bannerImageUrl: bannerImageUrl || null,
      validFrom: fromDate,
      validUntil: untilDate,
      priority: priority ?? 0,
      isActive: isActive ?? true,
    };

    if (id) {
      const existing = await prisma.themeCampaign.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }
      const updated = await prisma.themeCampaign.update({ where: { id }, data });
      return NextResponse.json({ success: true, campaign: updated });
    }

    const created = await prisma.themeCampaign.create({ data });
    return NextResponse.json({ success: true, campaign: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/ops/theme/campaigns error]:", error);
    return NextResponse.json({ error: "Failed to save theme campaign." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });
    }

    await prisma.themeCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/ops/theme/campaigns error]:", error);
    return NextResponse.json({ error: "Failed to delete theme campaign." }, { status: 500 });
  }
}
