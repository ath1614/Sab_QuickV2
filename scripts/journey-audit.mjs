/**
 * Signed-in journey audit — walks the app the way a reviewer / real customer
 * and the owner do, and records what breaks.
 *
 * It signs in through the real login gate (phone + passcode), then:
 *   customer  home → search → product sheet → add to cart → cart drawer →
 *             delivery-address sheet → map/geofence sheet
 *   owner     /owner → /owner/catalog → /owner/riders → /manager → /packer →
 *             /rider → /rider/dashboard
 *   static    /orders /delete-account /privacy /terms /refund /rider/apply /offline
 *
 * For every step it stores a screenshot, horizontal overflow, the sheet/map
 * symmetry, broken images, console errors and failed API calls.
 *
 * Usage:
 *   node scripts/journey-audit.mjs --base https://srv1985371.hstgr.cloud
 *   node scripts/journey-audit.mjs --devices 390x844,820x1180 --only customer
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (arg("base", "https://srv1985371.hstgr.cloud")).replace(/\/$/, "");
const PHONE = arg("phone", process.env.AUDIT_PHONE || "");
const CODE = arg("code", process.env.AUDIT_CODE || "");
if (!PHONE || !CODE) {
  console.error("Set --phone/--code or AUDIT_PHONE/AUDIT_CODE; credentials are never stored in the repo.");
  process.exit(1);
}
const OUT = arg("out", path.join("journey_audit", new Date().toISOString().slice(0, 10)));
const ONLY = arg("only", "customer,owner,static").split(",");
const ROUTE_FILTER = arg("routes", "") ? arg("routes").split(",").filter(Boolean) : null;
const HEADFUL = args.includes("--headful");

const DEVICES = arg("devices", "390x844,820x1180,1180x820")
  .split(",")
  .filter(Boolean)
  .map((d) => {
    const [w, h] = d.split("x").map(Number);
    return { name: `${w}x${h}`, w, h };
  });

const STATIC_ROUTES = [
  "/orders",
  "/delete-account",
  "/privacy",
  "/terms",
  "/refund",
  "/rider/apply",
  "/offline",
];
const OWNER_ROUTES = [
  "/owner",
  "/owner?tab=orders",
  "/owner?tab=customers",
  "/owner?tab=staff",
  "/owner?tab=coupons",
  "/owner?tab=theme",
  "/owner/catalog",
  "/owner/riders",
  "/manager",
  "/packer",
  "/rider",
  "/rider/dashboard",
];

fs.mkdirSync(OUT, { recursive: true });

/** Page-side probe: layout, media and copy problems a screenshot would hide. */
function probe() {
  const vw = document.documentElement.clientWidth;
  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const offenders = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const style = getComputedStyle(el);
    if (style.position === "fixed" || style.visibility === "hidden") continue;
    let scroller = el.parentElement;
    let inScroller = false;
    while (scroller && scroller !== document.body) {
      const s = getComputedStyle(scroller);
      if (s.overflowX === "auto" || s.overflowX === "scroll") {
        inScroller = true;
        break;
      }
      scroller = scroller.parentElement;
    }
    if (inScroller) continue;
    const over = Math.round(r.right - vw);
    if (over > 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") || "").split(/\s+/).slice(0, 4).join("."),
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  }

  const brokenImages = [...document.images]
    .filter((i) => i.complete && i.naturalWidth === 0 && i.src)
    .map((i) => i.src.slice(0, 120))
    .slice(0, 8);

  const map = document.querySelector(".leaflet-container");
  // Pair the map with its OWN sheet — the cart drawer may still be mounted.
  const sheet = map?.closest('[role="dialog"]') || document.querySelector('[role="dialog"]');
  let sheetBox = null;
  if (sheet) {
    const sr = sheet.getBoundingClientRect();
    const mr = map?.getBoundingClientRect();
    const cta = [...sheet.querySelectorAll("button")].find((b) =>
      /save|deliver|pay|confirm/i.test(b.textContent || "")
    );
    const cr = cta?.getBoundingClientRect();
    sheetBox = {
      width: Math.round(sr.width),
      map: mr
        ? {
            left: Math.round(mr.left - sr.left),
            right: Math.round(sr.right - mr.right),
            w: Math.round(mr.width),
            h: Math.round(mr.height),
          }
        : null,
      ctaInside: cr ? cr.right <= sr.right + 1 && cr.left >= sr.left - 1 : null,
    };
  }

  const body = document.body.innerText || "";
  const errorCopy = [
    "Application error",
    "Something went wrong",
    "Internal Server Error",
    "This page could not be found",
    "Unhandled Runtime Error",
  ].filter((t) => body.includes(t));

  return {
    path: location.pathname + location.search,
    title: document.title,
    vw,
    docW,
    overflow: Math.max(0, docW - vw),
    offenders: offenders.slice(0, 8),
    brokenImages,
    sheetBox,
    errorCopy,
    textLength: body.length,
    headings: [...document.querySelectorAll("h1,h2")].slice(0, 6).map((h) => h.textContent.trim().slice(0, 48)),
  };
}

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  const phone = page.getByPlaceholder(/mobile number/i).first();
  if (!(await phone.count())) return "session already active";

  await phone.fill(PHONE);
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^Continue/i }).first().click();
  const otp = page.getByPlaceholder(/enter otp/i).first();
  await otp.waitFor({ timeout: 15000 });
  await otp.fill(CODE);
  await page.waitForTimeout(500);
  const verify = page.getByRole("button", { name: /verify code/i }).first();
  if (await verify.isVisible().catch(() => false)) await verify.click();
  await page.waitForTimeout(3000);
  const signedIn = !(await page.getByPlaceholder(/mobile number/i).count());
  return signedIn ? "signed in" : "sign-in unconfirmed";
}

const steps = [];
let context;
let page;
const consoleErrors = [];
const failedRequests = [];

async function snap(name) {
  const file = path.join(OUT, `${name}-${page.viewportSize()?.width ?? "x"}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  let data;
  try {
    data = await page.evaluate(probe);
  } catch (err) {
    data = {
      path: page.url(),
      title: "",
      vw: page.viewportSize()?.width ?? 0,
      docW: 0,
      overflow: 0,
      offenders: [],
      brokenImages: [],
      sheetBox: null,
      errorCopy: [`probe failed: ${String(err).slice(0, 80)}`],
      textLength: 0,
      headings: [],
    };
  }
  const entry = { step: name, ...data, screenshot: file };
  steps.push(entry);
  const flag = entry.overflow > 0 || entry.errorCopy.length || entry.brokenImages.length ? "✗" : "✓";
  console.log(
    `${flag} ${name.padEnd(34)} ${String(entry.vw).padStart(4)}px  overflow=${entry.overflow}` +
      (entry.sheetBox ? `  sheet=${JSON.stringify(entry.sheetBox)}` : "")
  );
  return entry;
}

async function visit(url, name) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return snap(name);
}

async function run(device) {
  context = await browser.newContext({
    viewport: { width: device.w, height: device.h },
    deviceScaleFactor: 1,
    isMobile: device.w <= 500,
    hasTouch: device.w <= 820,
    locale: "en-IN",
  });
  page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push({ device: device.name, step: page.url(), text: m.text().slice(0, 200) });
  });
  page.on("pageerror", (e) =>
    consoleErrors.push({ device: device.name, step: page.url(), text: `pageerror: ${String(e).slice(0, 200)}` })
  );
  page.on("requestfailed", (r) =>
    failedRequests.push({
      device: device.name,
      step: page.url(),
      url: r.url().slice(0, 140),
      reason: r.failure()?.errorText,
    })
  );

  console.log(`\n── ${device.name} ─────────────────────────────`);
  console.log(await login(page));

  if (ONLY.includes("customer")) {
    try {
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await snap("01-home-signed-in");

    const search = page.locator('input[placeholder*="Search"]:visible').first();
    if (await search.count()) {
      await search.fill("maggi");
      await page.waitForTimeout(1600);
      await page.keyboard.press("Escape").catch(() => {});
      await snap("02-search-maggi");
    }

    const card = page
      .locator('[aria-label^="View details"]:visible, button:has-text("View details"):visible')
      .first();
    if (await card.count()) {
      await card.click();
      await page.waitForTimeout(1400);
      await snap("03-product-sheet");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(800);
    }

    const add = page.getByRole("button", { name: /^\+ ?ADD$/i }).filter({ visible: true }).first();
    if (await add.count()) {
      await add.click();
      await page.waitForTimeout(900);
      await snap("04-added-to-cart");
    }

    const cartPill = page.getByRole("button", { name: /view cart/i }).filter({ visible: true }).first();
    if (await cartPill.count()) {
      await cartPill.click();
      await page.waitForTimeout(1400);
      await snap("05-cart-drawer");
    }

    const change = page.locator("text=Change").filter({ visible: true }).first();
    if (await change.count()) {
      await change.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1200);
      const addAddr = page.getByRole("button", { name: /add delivery address|add new/i }).filter({ visible: true }).first();
      if (await addAddr.count()) {
        await addAddr.click();
        await page.waitForTimeout(2500);
        await snap("06-location-sheet-map");

        // Save a doorstep inside the geofence, the way a real customer would.
        const flat = page.getByPlaceholder(/flat 402|house/i).first();
        if (await flat.count()) {
          await flat.fill("A-101, Review Residence");
          await page.waitForTimeout(300);
          const save = page.getByRole("button", { name: /save/i }).filter({ visible: true }).first();
          if (await save.count()) {
            await save.click().catch(() => {});
            await page.waitForTimeout(3000);
            await snap("07-address-saved");
          }
        }
      } else {
        await snap("06-address-sheet");
      }
    }

    // Reviewers must be able to reach the payment chooser without placing an
    // order — open it, record the visible methods, then close without paying.
    const payCta = page
      .getByRole("button", { name: /select payment method|proceed to pay|pay ₹/i })
      .filter({ visible: true })
      .last();
    if (await payCta.count()) {
      await payCta.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2200);
      await snap("08-payment-methods");
      const methods = await page
        .locator("body")
        .evaluate((b) =>
          Array.from(b.querySelectorAll("button, label, h3, h4, p"))
            .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
            .filter((t) => /cashfree|upi|doorstep|cash on delivery|cod/i.test(t) && t.length < 70)
            .slice(0, 12)
        );
      console.log("  payment options:", JSON.stringify([...new Set(methods)]));
    }
    } catch (err) {
      console.log(`✗ customer flow interrupted: ${String(err).slice(0, 140)}`);
    }
  }

  if (ONLY.includes("owner")) {
    for (const route of ROUTE_FILTER ?? OWNER_ROUTES) {
      try {
        await visit(route, `owner${route.replace(/\//g, "-")}`);
      } catch (err) {
        console.log(`✗ ${route} failed: ${String(err).slice(0, 100)}`);
      }
    }
  }

  if (ONLY.includes("static")) {
    for (const route of ROUTE_FILTER ?? STATIC_ROUTES) {
      try {
        await visit(route, `static${route.replace(/\//g, "-")}`);
      } catch (err) {
        console.log(`✗ ${route} failed: ${String(err).slice(0, 100)}`);
      }
    }
  }

  await context.close();
}

const browser = await chromium.launch({ headless: !HEADFUL });
try {
  for (const device of DEVICES) {
    try {
      await run(device);
    } catch (err) {
      console.log(`✗ ${device.name} aborted: ${String(err).slice(0, 160)}`);
      steps.push({ step: `${device.name}-aborted`, error: String(err).slice(0, 200), overflow: 0, errorCopy: [], brokenImages: [] });
    }
  }
} finally {
  await browser.close();
}

const summary = {
  base: BASE,
  ranAt: new Date().toISOString(),
  devices: DEVICES,
  steps,
  consoleErrors,
  failedRequests,
};
fs.writeFileSync(path.join(OUT, "journey.json"), JSON.stringify(summary, null, 2));

const bad = steps.filter((s) => s.overflow > 0 || s.errorCopy.length || s.brokenImages.length || s.textLength < 40);
const sheetSteps = steps.filter((s) => s.sheetBox);
const asymmetric = sheetSteps.filter((s) => s.sheetBox.map && s.sheetBox.map.left !== s.sheetBox.map.right);

console.log(`\n── summary ──`);
console.log(`steps: ${steps.length}   flagged: ${bad.length}   console errors: ${consoleErrors.length}   failed requests: ${failedRequests.length}`);
for (const s of bad) {
  console.log(
    `✗ ${s.step} @ ${s.vw}px overflow=${s.overflow} errors=${JSON.stringify(s.errorCopy)} broken=${s.brokenImages.length} text=${s.textLength}`
  );
  for (const o of s.offenders) console.log(`    ${o.tag}.${o.cls} ${o.left}..${o.right} « ${o.text} »`);
}
for (const s of asymmetric) console.log(`✗ asymmetric map in ${s.step} @ ${s.vw}px ${JSON.stringify(s.sheetBox.map)}`);
for (const s of sheetSteps) console.log(`  sheet ${s.step} @ ${s.vw}px ${JSON.stringify(s.sheetBox)}`);
console.log(`\nwrote ${OUT}`);

process.exitCode = bad.length || asymmetric.length ? 1 : 0;
