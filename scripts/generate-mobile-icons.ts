/**
 * Generates every Android launcher icon density from the website's brand icon.
 * Run from the repo root:  npx tsx scripts/generate-mobile-icons.ts
 * (Uses the sharp dependency already present in the web project.)
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SOURCE = path.resolve("public/brand/app-icon.png");
const OUT_DIR = path.resolve("apps/mobile/android/app/src/main/res");

const DENSITIES: Array<[string, number]> = [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Brand icon not found: ${SOURCE}`);
  }

  for (const [density, size] of DENSITIES) {
    const square = path.join(OUT_DIR, `mipmap-${density}`, "ic_launcher.png");
    const round = path.join(OUT_DIR, `mipmap-${density}`, "ic_launcher_round.png");

    // Standard launcher icon with comfortable padding
    await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .extend({
        top: Math.round(size * 0.08),
        bottom: Math.round(size * 0.08),
        left: Math.round(size * 0.08),
        right: Math.round(size * 0.08),
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(square);

    // Circular mask for round-icon launchers
    const circle = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .composite([{ input: circle, blend: "dest-in" }])
      .png()
      .toFile(round);

    console.log(`✓ mipmap-${density}: ${size}px square + round`);
  }

  console.log("\n🎉 Launcher icons regenerated from public/brand/app-icon.png");
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
