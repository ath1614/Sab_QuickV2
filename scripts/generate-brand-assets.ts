import fs from "fs";
import path from "path";
import sharp from "sharp";

const PUBLIC_DIR = path.resolve(__dirname, "../public");

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 1. High Resolution Base Monogram SVG (1:1 aspect ratio)
const MONOGRAM_SVG = `
<svg width="512" height="512" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sq-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B6E4F"/>
      <stop offset="1" stop-color="#064E3B"/>
    </linearGradient>
    <linearGradient id="sq-acc" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00E676"/>
      <stop offset="1" stop-color="#00C853"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#sq-bg)"/>
  <rect x="1.5" y="1.5" width="97" height="97" rx="20.5" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
  <path d="M-5 25 L35 25 L25 35 L-5 35 Z" fill="rgba(255,255,255,0.12)"/>
  <path d="M-10 42 L48 42 L38 50 L-10 50 Z" fill="rgba(255,255,255,0.15)"/>
  <path d="M-5 58 L28 58 L20 64 L-5 64 Z" fill="rgba(255,255,255,0.08)"/>
  <path d="M68 12 L44 48 L62 48 L36 88 L78 40 L58 40 Z" fill="url(#sq-acc)" opacity="0.9"/>
  <path d="M24 38 C24 32 29 27 37 27 C45 27 50 32 50 38 L42 38 C42 35 39 33 37 33 C34 33 31 35 31 38 C31 41 33 43 38 44 C45 46 51 49 51 56 C51 63 45 68 37 68 C28 68 23 63 23 56 L31 56 C31 60 34 62 37 62 C41 62 43 60 43 56 C43 52 40 50 35 49 C28 47 24 44 24 38 Z" fill="#FFFFFF"/>
  <path d="M52 47 C52 35 60 27 72 27 C84 27 92 35 92 47 C92 59 84 68 72 68 C68 68 64 66 61 64 L57 73 L51 70 L55 61 C53 57 52 52 52 47 Z M72 33 C64 33 60 39 60 47 C60 55 64 61 72 61 C80 61 84 55 84 47 C84 39 80 33 72 33 Z" fill="#FFFFFF"/>
  <polygon points="73,59 87,75 79,77 69,65" fill="#00E676"/>
</svg>
`;

// 2. Maskable Monogram SVG with Safe Zone (15% padding for Android adaptive circular crop)
const MASKABLE_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mask-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B6E4F"/>
      <stop offset="1" stop-color="#043827"/>
    </linearGradient>
    <linearGradient id="mask-acc" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00E676"/>
      <stop offset="1" stop-color="#00C853"/>
    </linearGradient>
  </defs>
  {/* Full Bleed Background for Masking */}
  <rect width="512" height="512" fill="url(#mask-bg)"/>
  
  {/* Centered Safe Area Monogram (scaled to 70% width/height) */}
  <g transform="translate(80, 80) scale(3.52)">
    <rect width="100" height="100" rx="22" fill="#0B6E4F"/>
    <rect x="1.5" y="1.5" width="97" height="97" rx="20.5" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
    <path d="M-5 25 L35 25 L25 35 L-5 35 Z" fill="rgba(255,255,255,0.12)"/>
    <path d="M-10 42 L48 42 L38 50 L-10 50 Z" fill="rgba(255,255,255,0.15)"/>
    <path d="M-5 58 L28 58 L20 64 L-5 64 Z" fill="rgba(255,255,255,0.08)"/>
    <path d="M68 12 L44 48 L62 48 L36 88 L78 40 L58 40 Z" fill="url(#mask-acc)" opacity="0.9"/>
    <path d="M24 38 C24 32 29 27 37 27 C45 27 50 32 50 38 L42 38 C42 35 39 33 37 33 C34 33 31 35 31 38 C31 41 33 43 38 44 C45 46 51 49 51 56 C51 63 45 68 37 68 C28 68 23 63 23 56 L31 56 C31 60 34 62 37 62 C41 62 43 60 43 56 C43 52 40 50 35 49 C28 47 24 44 24 38 Z" fill="#FFFFFF"/>
    <path d="M52 47 C52 35 60 27 72 27 C84 27 92 35 92 47 C92 59 84 68 72 68 C68 68 64 66 61 64 L57 73 L51 70 L55 61 C53 57 52 52 52 47 Z M72 33 C64 33 60 39 60 47 C60 55 64 61 72 61 C80 61 84 55 84 47 C84 39 80 33 72 33 Z" fill="#FFFFFF"/>
    <polygon points="73,59 87,75 79,77 69,65" fill="#00E676"/>
  </g>
</svg>
`;

// 3. OpenGraph Banner SVG (1200x630, 1.91:1 aspect ratio)
const OG_IMAGE_SVG = `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B6E4F"/>
      <stop offset="0.5" stop-color="#074834"/>
      <stop offset="1" stop-color="#0B0F19"/>
    </linearGradient>
    <linearGradient id="og-acc" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00E676"/>
      <stop offset="1" stop-color="#00C853"/>
    </linearGradient>
  </defs>

  {/* Background */}
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  
  {/* Ambient speed glow circles */}
  <circle cx="1050" cy="120" r="280" fill="#00E676" opacity="0.12"/>
  <circle cx="150" cy="500" r="220" fill="#0B6E4F" opacity="0.35"/>

  {/* Speed streaks background */}
  <path d="M0 180 L350 180 L300 210 L0 210 Z" fill="rgba(255,255,255,0.06)"/>
  <path d="M0 240 L500 240 L450 270 L0 270 Z" fill="rgba(0,230,118,0.12)"/>
  <path d="M0 300 L380 300 L330 330 L0 330 Z" fill="rgba(255,255,255,0.05)"/>

  {/* Top Badge: 10-15 Min Guarantee */}
  <g transform="translate(100, 90)">
    <rect width="320" height="46" rx="23" fill="#00E676" fill-opacity="0.2" stroke="#00E676" stroke-width="2"/>
    <text x="160" y="29" fill="#00E676" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" letter-spacing="2" text-anchor="middle">
      ⚡ 10-15 MINUTE DELIVERY
    </text>
  </g>

  {/* Master Brand Header */}
  <g transform="translate(100, 260)">
    {/* Left Speed Wedge */}
    <rect x="-10" y="-80" width="130" height="130" rx="32" fill="#111827" stroke="#334155" stroke-width="4"/>
    <polygon points="10,-60 60,-60 50,-50 10,-50" fill="#00E676"/>
    <polygon points="10,-35 80,-35 70,-25 10,-25" fill="#FFFFFF"/>
    <polygon points="10,-10 50,-10 40,0 10,0" fill="#00E676"/>
    <text x="55" y="15" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="-1" text-anchor="middle">
      SQ
    </text>

    <text x="150" y="-10" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="82" letter-spacing="-1">
      Sab<tspan fill="#00E676">Quick</tspan>
    </text>

    <text x="155" y="45" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="26" letter-spacing="3">
      A COMPLETE PROVISION STORE • RIGHT TO YOUR DOOR
    </text>
  </g>

  {/* Subtitle Description */}
  <text x="100" y="420" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="24">
    Fresh dairy staples, farm produce, pantry essentials &amp; midnight munchies.
  </text>
  <text x="100" y="460" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="20">
    Dispatched instantly within a strict 2.5 km dark store geofence.
  </text>

  {/* Bottom Feature Bar */}
  <g transform="translate(100, 530)">
    <rect width="1000" height="54" rx="16" fill="rgba(17, 24, 39, 0.7)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <text x="40" y="34" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
      📍 Central Delhi Dark Store Hub #01
    </text>
    <text x="390" y="34" fill="#00E676" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
      ⚡ 15-Min Live Real-Time Tracking
    </text>
    <text x="740" y="34" fill="#69F0AE" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
      🔒 Secure 4-Digit Delivery OTP
    </text>
  </g>
</svg>
`;

async function generateBrandAssets() {
  console.log("🎨 Starting SabQuick Brand Asset Generation...");

  const baseSvgBuffer = Buffer.from(MONOGRAM_SVG);
  const maskableSvgBuffer = Buffer.from(MASKABLE_SVG);
  const ogSvgBuffer = Buffer.from(OG_IMAGE_SVG);

  // 1. Apple Touch Icon (180x180)
  await sharp(baseSvgBuffer)
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"));
  console.log("✅ Generated public/apple-touch-icon.png (180x180)");

  // 2. Standard PWA Icon (192x192)
  await sharp(baseSvgBuffer)
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC_DIR, "icon-192.png"));
  console.log("✅ Generated public/icon-192.png (192x192)");

  // 3. High-Res PWA Icon (512x512)
  await sharp(baseSvgBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC_DIR, "icon-512.png"));
  console.log("✅ Generated public/icon-512.png (512x512)");

  // 4. Maskable PWA Icon (192x192 with safe padding)
  await sharp(maskableSvgBuffer)
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC_DIR, "icon-maskable-192.png"));
  console.log("✅ Generated public/icon-maskable-192.png (192x192 maskable)");

  // 5. Maskable PWA Icon (512x512 with safe padding)
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC_DIR, "icon-maskable-512.png"));
  console.log("✅ Generated public/icon-maskable-512.png (512x512 maskable)");

  // 6. Favicon ICO (48x48 PNG encoded)
  await sharp(baseSvgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(PUBLIC_DIR, "favicon.ico"));
  console.log("✅ Generated public/favicon.ico (48x48)");

  // 7. OpenGraph Image (1200x630)
  await sharp(ogSvgBuffer)
    .resize(1200, 630)
    .png({ quality: 90 })
    .toFile(path.join(PUBLIC_DIR, "og-image.png"));
  console.log("✅ Generated public/og-image.png (1200x630)");

  console.log("🎉 All SabQuick brand assets generated successfully in public/!");
}

generateBrandAssets().catch((err) => {
  console.error("❌ Failed to generate brand assets:", err);
  process.exit(1);
});
