const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://srv1985371.hstgr.cloud';
const BRAND_DIR = path.resolve(__dirname, '../public/brand');

const URLS = [
  { name: '1', url: `${BASE_URL}/`, desc: 'Storefront Home' },
  { name: '2', url: `${BASE_URL}/categories`, desc: 'Categories Directory' },
  { name: '3', url: `${BASE_URL}/?category=dairy-bakery-product`, desc: 'Dairy & Bakery Products' },
  { name: '4', url: `${BASE_URL}/?category=snacks-mixtures`, desc: 'Snacks & Munchies' },
];

async function generateAssets() {
  console.log('🚀 Launching Chrome to capture Tablet, Desktop, and Android XR assets...');

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  // 1. Generate 7-inch Tablet Assets (1200 x 1920, 9:16 / 16:9 ratio compatible)
  console.log('\n📱 Generating 7-Inch Tablet Assets (1200 x 1920)...');
  const context7 = await browser.newContext({
    viewport: { width: 1200, height: 1920 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page7 = await context7.newPage();

  for (const item of URLS) {
    const filename = `tablet-7inch-${item.name}.png`;
    const dest = path.join(BRAND_DIR, filename);
    await page7.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page7.waitForTimeout(2000);
    await page7.screenshot({ path: dest, fullPage: false });
    console.log(`   ✓ Saved: ${filename} (${item.desc})`);
  }
  await context7.close();

  // 2. Generate 10-inch Tablet Assets (1600 x 2560, between 1080px and 7680px)
  console.log('\n📱 Generating 10-Inch Tablet Assets (1600 x 2560)...');
  const context10 = await browser.newContext({
    viewport: { width: 1600, height: 2560 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page10 = await context10.newPage();

  for (const item of URLS) {
    const filename = `tablet-10inch-${item.name}.png`;
    const dest = path.join(BRAND_DIR, filename);
    await page10.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page10.waitForTimeout(2000);
    await page10.screenshot({ path: dest, fullPage: false });
    console.log(`   ✓ Saved: ${filename} (${item.desc})`);
  }
  await context10.close();

  // 3. Generate Desktop Assets (1920 x 1080, 16:9 landscape aspect ratio)
  console.log('\n💻 Generating Desktop Assets (1920 x 1080)...');
  const contextDesktop = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  const pageDesktop = await contextDesktop.newPage();

  for (const item of URLS) {
    const filename = `desktop-screenshot-${item.name}.png`;
    const dest = path.join(BRAND_DIR, filename);
    await pageDesktop.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
    await pageDesktop.waitForTimeout(2000);
    await pageDesktop.screenshot({ path: dest, fullPage: false });
    console.log(`   ✓ Saved: ${filename} (${item.desc})`);
  }
  await contextDesktop.close();

  // 4. Generate Android XR Assets (1920 x 1200, exact 8:5 aspect ratio, 24-bit RGB)
  console.log('\n🥽 Generating Android XR Assets (1920 x 1200, 8:5 ratio)...');
  const contextXR = await browser.newContext({
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: true,
  });
  const pageXR = await contextXR.newPage();

  for (const item of URLS) {
    const filename = `xr-screenshot-${item.name}.png`;
    const dest = path.join(BRAND_DIR, filename);
    await pageXR.goto(item.url, { waitUntil: 'networkidle', timeout: 30000 });
    await pageXR.waitForTimeout(2000);
    await pageXR.screenshot({ path: dest, fullPage: false });
    console.log(`   ✓ Saved: ${filename} (${item.desc})`);
  }
  await contextXR.close();

  await browser.close();
  console.log('\n🎉 ALL Tablet, Desktop, and Android XR assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('❌ Error generating assets:', err);
  process.exit(1);
});
