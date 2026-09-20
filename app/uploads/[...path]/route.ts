import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    if (pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Protect against directory traversal
    const safePath = pathSegments.join("/");
    const normalizedRelative = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, "");

    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    const targetFilePath = path.join(publicUploadsDir, normalizedRelative);

    // Verify resolved path stays inside public/uploads
    if (!targetFilePath.startsWith(publicUploadsDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(targetFilePath)) {
      return new NextResponse("Image Not Found", { status: 404 });
    }

    const stat = await fs.promises.stat(targetFilePath);
    if (!stat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(targetFilePath);
    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[Dynamic Upload Route Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
