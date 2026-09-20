import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!["OWNER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Owner or Manager role required to upload product images." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // Validate MIME type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only image files (WebP, JPEG, PNG) are allowed." },
        { status: 400 }
      );
    }

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sizeKb = Math.round(buffer.length / 1024);

    // Option A: Optional Free Cloudinary Cloud CDN
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && uploadPreset) {
      try {
        const cloudForm = new FormData();
        cloudForm.append("file", new Blob([buffer], { type: file.type }));
        cloudForm.append("upload_preset", uploadPreset);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: cloudForm,
        });

        const cloudData = await cloudRes.json();
        if (cloudData.secure_url) {
          return NextResponse.json({
            success: true,
            provider: "cloudinary",
            url: cloudData.secure_url,
            sizeKb,
          });
        }
      } catch (cloudErr) {
        console.warn("[Upload Pipeline] Cloudinary upload failed, using local persistent storage:", cloudErr);
      }
    }

    // Option B: Optional Free ImgBB Cloud CDN
    const imgbbKey = process.env.IMGBB_API_KEY;
    if (imgbbKey) {
      try {
        const imgbbForm = new FormData();
        imgbbForm.append("image", buffer.toString("base64"));
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: imgbbForm,
        });
        const imgbbData = await imgbbRes.json();
        if (imgbbData.success && imgbbData.data?.url) {
          return NextResponse.json({
            success: true,
            provider: "imgbb",
            url: imgbbData.data.url,
            sizeKb,
          });
        }
      } catch (imgbbErr) {
        console.warn("[Upload Pipeline] ImgBB upload failed, using local persistent storage:", imgbbErr);
      }
    }

    // Option C: 100% Free Zero-Cost Persistent Storage (Zero API keys needed)
    let ext = "webp";
    if (file.type === "image/png") ext = "png";
    else if (file.type === "image/jpeg") ext = "jpg";
    else if (file.type === "image/webp") ext = "webp";

    const hash = crypto.randomBytes(4).toString("hex");
    const filename = `prod_${Date.now()}_${hash}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://srv1985371.hstgr.cloud";
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const publicUrl = `${cleanBaseUrl}/uploads/products/${filename}`;

    return NextResponse.json({
      success: true,
      provider: "local_persistent",
      url: publicUrl,
      relativePath: `/uploads/products/${filename}`,
      sizeKb,
    });
  } catch (error: any) {
    console.error("[Upload API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process and store image." },
      { status: 500 }
    );
  }
}
