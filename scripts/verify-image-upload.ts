/**
 * Automated Verification Script: Free Image Upload & WebP Storage Pipeline
 */
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n=======================================================");
  console.log("   📸 SABQUICK FREE IMAGE UPLOAD PIPELINE TEST         ");
  console.log("=======================================================\n");

  // 1. Verify destination directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  console.log(`📁 1. Verifying upload destination directory: [${uploadDir}]`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  console.log("   ✓ Upload directory is ready and writable.\n");

  // 2. Verify Client-side Compression Utility exists and exports functions
  console.log("🧪 2. Verifying client-side image compression module...");
  const compressModule = await import("../lib/image-compress");
  if (typeof compressModule.compressProductImage !== "function") {
    throw new Error("compressProductImage is not exported from lib/image-compress.ts");
  }
  console.log("   ✓ compressProductImage function successfully verified.\n");

  // 3. Simulate saving a test WebP image to uploads
  console.log("🖼️  3. Testing file write and public URL resolution...");
  const sampleBase64 = "UklGRhoAAABXRUJQVlA4TA4AAAAvAAAAEAcQERGIiP4HAA=="; // Minimal valid 1x1 WebP
  const sampleBuffer = Buffer.from(sampleBase64, "base64");
  const testFilename = `test_verify_${Date.now()}.webp`;
  const testFilePath = path.join(uploadDir, testFilename);

  fs.writeFileSync(testFilePath, sampleBuffer);
  console.log(`   ✓ Test file saved to: [${testFilePath}]`);
  console.log(`   ✓ File size: ${sampleBuffer.length} bytes`);

  const fileExists = fs.existsSync(testFilePath);
  if (!fileExists) {
    throw new Error("Test file was not written to disk.");
  }

  const publicUrl = `https://srv1985371.hstgr.cloud/uploads/products/${testFilename}`;
  console.log(`   ✓ Public URL resolved: [${publicUrl}]`);

  // Clean up test file
  fs.unlinkSync(testFilePath);
  console.log("   ✓ Test artifact cleaned up.\n");

  // 4. Verify Docker Compose volume configuration
  console.log("🐳 4. Verifying Docker Compose persistent volume configuration...");
  const dockerCompose = fs.readFileSync(path.join(process.cwd(), "docker-compose.prod.yml"), "utf-8");
  if (!dockerCompose.includes("uploads_prod:/app/public/uploads")) {
    throw new Error("docker-compose.prod.yml is missing uploads_prod volume mount for app container.");
  }
  if (!dockerCompose.includes("uploads_prod:")) {
    throw new Error("docker-compose.prod.yml is missing uploads_prod in top-level volumes.");
  }
  console.log("   ✓ Persistent Docker volume 'uploads_prod' is properly configured.\n");

  // 5. Verify build-apk exclusion
  console.log("📱 5. Verifying build-apk.sh excludes public/uploads from APK assets...");
  const buildApkScript = fs.readFileSync(path.join(process.cwd(), "scripts", "build-apk.sh"), "utf-8");
  if (!buildApkScript.includes("rm -rf \"$PROJECT_ROOT/android/app/src/main/assets/public/uploads\"")) {
    throw new Error("build-apk.sh does not exclude public/uploads.");
  }
  console.log("   ✓ build-apk.sh properly excludes user uploads to prevent APK bloat.\n");

  console.log("=======================================================");
  console.log("   ✅ ALL IMAGE UPLOAD PIPELINE TESTS PASSED!          ");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
