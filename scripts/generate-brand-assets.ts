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
function buildOgImageSvg(logoB64: string): string {
  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B6E4F"/>
      <stop offset="55%" stop-color="#074834"/>
      <stop offset="100%" stop-color="#052E21"/>
    </linearGradient>
    <filter id="og-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#og-bg)"/>

  <!-- Ambient Light Orbs -->
  <circle cx="1060" cy="110" r="300" fill="#00E676" opacity="0.12"/>
  <circle cx="1120" cy="320" r="220" fill="#00C853" opacity="0.10"/>
  <circle cx="120" cy="540" r="240" fill="#0B6E4F" opacity="0.40"/>

  <!-- Speed Streaks -->
  <polygon points="0,165 420,165 370,195 0,195" fill="white" opacity="0.05"/>
  <polygon points="0,225 580,225 520,258 0,258" fill="#00E676" opacity="0.10"/>
  <polygon points="0,285 450,285 400,315 0,315" fill="white" opacity="0.04"/>

  <!-- Top Pill Badge: SUPERFAST DELIVERY -->
  <g transform="translate(90, 65)">
    <rect width="320" height="46" rx="23" fill="#00E676" fill-opacity="0.18" stroke="#00E676" stroke-width="2"/>
    <path d="M26 23 L20 23 L23 15 L17 24 L22 24 L19 31 Z" fill="#00E676" transform="translate(6, 0) scale(1.1)"/>
    <text x="175" y="29" fill="#00E676" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" letter-spacing="2" text-anchor="middle">
      SUPERFAST DELIVERY
    </text>
  </g>

  <!-- Master Brand Lockup -->
  <g transform="translate(90, 142)" filter="url(#og-shadow)">
    <rect width="138" height="138" rx="34" fill="#FFFFFF" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
    <!-- Centered official SAB QUICK logo -->
    <image href="data:image/png;base64,${logoB64}" x="12" y="32" width="114" height="74" preserveAspectRatio="xMidYMid meet"/>
  </g>

  <g transform="translate(256, 185)">
    <text x="0" y="32" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="82" letter-spacing="-1">
      Sab<tspan fill="#00E676">Quick</tspan>
    </text>
    <text x="4" y="82" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" letter-spacing="2.5">
      A COMPLETE PROVISION STORE • RIGHT TO YOUR DOOR
    </text>
  </g>

  <!-- Subtitle Value Proposition -->
  <g transform="translate(90, 365)">
    <text x="0" y="24" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="25">
      Fresh dairy staples, farm produce, pantry essentials &amp; midnight munchies.
    </text>
    <text x="0" y="66" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="21">
      Dispatched superfast within a strict 3.5 km dark store geofence.
    </text>
  </g>

  <!-- Bottom Feature Bar -->
  <g transform="translate(90, 495)">
    <rect width="1020" height="58" rx="18" fill="#0B141B" fill-opacity="0.85" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
    
    <!-- Pin Icon + Dark Store Hub -->
    <g transform="translate(35, 18)">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EF4444" transform="scale(0.9)"/>
      <text x="26" y="17" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
        SabQuick Dark Store Hub #01
      </text>
    </g>

    <!-- Lightning Icon + Real-Time Tracking -->
    <g transform="translate(425, 18)">
      <path d="M10 2L3 11h6l-1 7 8-9h-6l1-7z" fill="#00E676" transform="scale(0.95)"/>
      <text x="22" y="17" fill="#00E676" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
        Live Real-Time Order Tracking
      </text>
    </g>

    <!-- Lock Icon + 4-Digit OTP -->
    <g transform="translate(775, 18)">
      <path d="M17 9v-2c0-2.76-2.24-5-5-5S7 4.24 7 7v2H6c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2h-1zm-6-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2h-6V7zm7 13H6v-9h12v9zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" fill="#69F0AE" transform="scale(0.95)"/>
      <text x="26" y="17" fill="#69F0AE" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="17">
        Secure 4-Digit Delivery OTP
      </text>
    </g>
  </g>
</svg>
  `;
}

async function generateBrandAssets() {
  console.log("🎨 Starting SabQuick Brand Asset Generation...");

  const baseSvgBuffer = Buffer.from(MONOGRAM_SVG);
  const maskableSvgBuffer = Buffer.from(MASKABLE_SVG);
  const navbarLogoPath = path.join(PUBLIC_DIR, "brand/navbar-logo.png");
  const logoB64 = fs.existsSync(navbarLogoPath)
    ? fs.readFileSync(navbarLogoPath).toString("base64")
    : "";
  const ogSvgBuffer = Buffer.from(buildOgImageSvg(logoB64));

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
