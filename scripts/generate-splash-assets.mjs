import sharp from "sharp";

const PAPER = { r: 247, g: 246, b: 242, alpha: 1 };
const LOGO = "public/brand/splash-logo.png";

async function compose(out, width, height, logoWidth) {
  const logo = await sharp(LOGO)
    .resize({ width: logoWidth, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(logo).metadata();
  await sharp({ create: { width, height, channels: 3, background: PAPER } })
    .composite([
      {
        input: logo,
        left: Math.round((width - meta.width) / 2),
        top: Math.round((height - meta.height) / 2),
      },
    ])
    .png()
    .toFile(out);
  console.log(`${out} ${width}x${height} logo=${meta.width}`);
}

// iOS launch storyboard uses one square image per scale slot.
for (const file of [
  "splash-2732x2732-2.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732.png",
]) {
  await compose(
    `ios/App/App/Assets.xcassets/Splash.imageset/${file}`,
    2732,
    2732,
    900
  );
}

// Android legacy launch drawables (API < 31).
const android = [
  ["drawable/splash.png", 480, 320],
  ["drawable-port-mdpi/splash.png", 320, 480],
  ["drawable-port-hdpi/splash.png", 480, 800],
  ["drawable-port-xhdpi/splash.png", 720, 1280],
  ["drawable-port-xxhdpi/splash.png", 960, 1600],
  ["drawable-port-xxxhdpi/splash.png", 1280, 1920],
  ["drawable-land-mdpi/splash.png", 480, 320],
  ["drawable-land-hdpi/splash.png", 800, 480],
  ["drawable-land-xhdpi/splash.png", 1280, 720],
  ["drawable-land-xxhdpi/splash.png", 1600, 960],
  ["drawable-land-xxxhdpi/splash.png", 1920, 1280],
];

for (const [file, width, height] of android) {
  await compose(
    `android/app/src/main/res/${file}`,
    width,
    height,
    Math.round(Math.min(width, height) * 0.62)
  );
}
