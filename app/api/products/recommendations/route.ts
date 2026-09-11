import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cartProductIds: string[] = Array.isArray(body.cartProductIds)
      ? body.cartProductIds
      : [];

    const products = await getRecommendations(cartProductIds);

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    console.error("[Recommendations API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate product recommendations",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
