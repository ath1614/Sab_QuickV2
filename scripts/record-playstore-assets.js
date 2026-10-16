const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://srv1985371.hstgr.cloud';
const BRAND_DIR = path.resolve(__dirname, '../public/brand');
const VIDEO_DIR = path.join(BRAND_DIR, 'video_temp');

if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// Google Pixel 7 phone dimensions (1080 x 2400 @ 2.621359x density)
const VIEWPORT = { width: 412, height: 915 };
const SCALE_FACTOR = 2.621359;

async function run() {
  console.log('🚀 Starting Playwright mobile recording & screenshot session...');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1080, height: 2400 },
    },
  });

  const page = await context.newPage();

  // 1. Screenshot 1: Home Storefront
  console.log('📸 Capturing Screenshot 1: Storefront Home...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500); // Wait for splash animation & banner hydration

  await page.screenshot({
    path: path.join(BRAND_DIR, 'playstore-screenshot-1.png'),
    fullPage: false,
  });
  console.log('✅ Screenshot 1 saved: playstore-screenshot-1.png');

  // Video interaction: smooth scroll on Home
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1200);

  // 2. Screenshot 2: Categories Directory
  console.log('📸 Capturing Screenshot 2: Categories Directory...');
  await page.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(BRAND_DIR, 'playstore-screenshot-2.png'),
    fullPage: false,
  });
  console.log('✅ Screenshot 2 saved: playstore-screenshot-2.png');

  // Video interaction: smooth scroll in Categories
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1000);

  // 3. Screenshot 3: Dairy & Bakery Products
  console.log('📸 Capturing Screenshot 3: Dairy & Bakery Products...');
  await page.goto(`${BASE_URL}/?category=dairy-bakery-product`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(BRAND_DIR, 'playstore-screenshot-3.png'),
    fullPage: false,
  });
  console.log('✅ Screenshot 3 saved: playstore-screenshot-3.png');

  // Video interaction: scroll products and tap add to cart
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(800);

  // Try clicking an "ADD" button if available to demonstrate cart interaction
  try {
    const addBtn = await page.$('button:has-text("ADD"), button:has-text("Add")');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    // optional interaction
  }

  // 4. Screenshot 4: Snacks & Mixtures
  console.log('📸 Capturing Screenshot 4: Snacks & Mixtures...');
  await page.goto(`${BASE_URL}/?category=snacks-mixtures`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(BRAND_DIR, 'playstore-screenshot-4.png'),
    fullPage: false,
  });
  console.log('✅ Screenshot 4 saved: playstore-screenshot-4.png');

  // Final smooth scroll for promo video
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1500);

  // Close page and context to finalize video recording
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded video in VIDEO_DIR and rename to final destination
  const files = fs.readdirSync(VIDEO_DIR);
  const videoFile = files.find((f) => f.endsWith('.webm'));
  const finalVideoPath = path.join(BRAND_DIR, 'sabquick_store_demo.webm');

  if (videoFile) {
    const srcPath = path.join(VIDEO_DIR, videoFile);
    fs.copyFileSync(srcPath, finalVideoPath);
    console.log(`🎬 Promo video saved successfully: ${finalVideoPath}`);
    // Clean temp
    fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  } else {
    console.warn('⚠️ No video file found in temp dir.');
  }

  console.log('🎉 All screenshots and promo video generated successfully!');
}

run().catch((err) => {
  console.error('❌ Error recording Play Store assets:', err);
  process.exit(1);
});
