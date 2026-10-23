/**
 * App Store screenshot generator.
 *
 * Produces the exact pixel sizes App Store Connect requires for a universal
 * (iPhone + iPad) app:
 *
 *   13-inch iPad   2048 x 2732   (1024 x 1366 CSS @2x)
 *   iPhone 6.7"    1290 x 2796   (430 x 932 CSS @3x)
 *   iPhone 6.5"    1242 x 2688   (414 x 896 CSS @3x)
 *
 * Run it against the deployed site so products/categories render with their
 * real images (the repo does not carry /public/products):
 *
 *   node scripts/appstore-screenshots.mjs --base https://srv1985371.hstgr.cloud
 *
 * Output: appstore_screenshots/<YYYY-MM>/<device>-<n>-<screen>.png
 * The app is browsed as a guest (Skip on the login gate) so no account name
 * or staff badge appears in the marketing shots.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (arg("base", "http://localhost:3100")).replace(/\/$/, "");
const STAMP = arg("out", new Date().toISOString().slice(0, 7));
const OUT = path.join("appstore_screenshots", STAMP);
const CATEGORY = arg("category", "Dairy & Bakery");

const DEVICES = [
  { key: "ipad-13", w: 1024, h: 1366, dpr: 2 },
  { key: "iphone-6.7", w: 430, h: 932, dpr: 3 },
  { key: "iphone-6.5", w: 414, h: 896, dpr: 3 },
];

const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });
const written = [];

for (const device of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: device.w, height: device.h },
    deviceScaleFactor: device.dpr,
    isMobile: device.w <= 500,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  async function shot(name) {
    const file = path.join(OUT, `${device.key}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    written.push(file);
    console.log(`✓ ${file}`);
  }

  // 1. Home
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  const skip = page.getByRole("button", { name: /^Skip$/ }).first();
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(1800);
  }
  await shot("01-home");

  // 2. Product detail sheet
  const detail = page.locator('[aria-label^="View details for"]').first();
  if (await detail.count()) {
    await detail.click().catch(() => {});
    await page.waitForTimeout(1600);
    await shot("02-product");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  // 3. Delivery map / geofence sheet
  const mapTrigger = page
    .locator(
      'button[title="Change delivery address & map pin"]:visible, button[title="Change delivery location"]:visible, button[title="Map & Geofence"]:visible'
    )
    .first();
  if (await mapTrigger.count()) {
    await mapTrigger.click().catch(() => {});
    await page.waitForSelector(".leaflet-container", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2400);
    await shot("03-location-map");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  // 4. All categories
  await page.goto(`${BASE}/categories`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2400);
  await shot("04-categories");

  // 5. Category listing with product cards
  await page.goto(`${BASE}/?category=${encodeURIComponent(CATEGORY)}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);
  await shot("05-category");

  await ctx.close();
}

await browser.close();
console.log(`\n${written.length} screenshots written to ${OUT}`);
