/**
 * Full-app layout audit (iPhone → iPad → desktop).
 *
 * For every route at every device size it measures:
 *   - document-level horizontal overflow (sideways-scrolling page)
 *   - the outermost elements that stick out of the viewport
 *   - interactive targets smaller than 44x44 CSS px
 *   - text inputs below 16 px on phones/tablets (iOS focus-zoom)
 *   - console errors / unhandled page errors
 *
 * Usage:
 *   node scripts/ui-audit.mjs                       # full device matrix
 *   node scripts/ui-audit.mjs --widths 390,820      # quick width sweep
 *   node scripts/ui-audit.mjs --devices 390x844,820x1180
 *   node scripts/ui-audit.mjs --routes /,/categories --shots
 *
 * Exit code is non-zero when any route overflows, so CI can gate on it.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (arg("base", process.env.AUDIT_BASE || "http://localhost:3100")).replace(/\/$/, "");
const PHONE = arg("phone", process.env.AUDIT_PHONE || "");
const CODE = arg("code", process.env.AUDIT_CODE || "");
if (!PHONE || !CODE) {
  console.error("Set --phone/--code or AUDIT_PHONE/AUDIT_CODE; credentials are never stored in the repo.");
  process.exit(1);
}
const ROLE = arg("role", "customer");
const SHOTS = args.includes("--shots");
const SHOT_DIR = arg("shots-dir", "/tmp/sq-shots");
const ONLY = arg("routes", "") ? arg("routes").split(",").filter(Boolean) : null;

/** Device sizes App Store review and real users hold. */
const DEVICES = [
  { name: "iPhone SE (1st)", w: 320, h: 568 },
  { name: "Android small", w: 360, h: 640 },
  { name: "iPhone SE (2/3)", w: 375, h: 667 },
  { name: "iPhone 13 mini", w: 375, h: 812 },
  { name: "iPhone 15", w: 390, h: 844 },
  { name: "Pixel 7", w: 412, h: 915 },
  { name: "iPhone 15 Pro Max", w: 430, h: 932 },
  { name: "iPad mini", w: 744, h: 1133 },
  { name: "iPad 9.7", w: 768, h: 1024 },
  { name: "iPad Air 11 M3", w: 820, h: 1180 },
  { name: "iPad Pro 11", w: 834, h: 1194 },
  { name: "iPad Pro 12.9", w: 1024, h: 1366 },
  { name: "iPad Pro 13 M4", w: 1032, h: 1376 },
  { name: "iPad Air 11 landscape", w: 1180, h: 820 },
  { name: "iPad Pro 11 landscape", w: 1194, h: 834 },
  { name: "iPad Pro 12.9 landscape", w: 1366, h: 1024 },
  { name: "Laptop", w: 1440, h: 900 },
  { name: "Desktop", w: 1920, h: 1080 },
];

let devices;
if (arg("devices", "")) {
  devices = arg("devices")
    .split(",")
    .filter(Boolean)
    .map((d) => {
      const [w, h] = d.split("x").map(Number);
      return { name: `${w}x${h}`, w, h: h || (w <= 500 ? 844 : w <= 900 ? 1180 : 900) };
    });
} else if (arg("widths", "")) {
  devices = arg("widths")
    .split(",")
    .map((w) => Number(w.trim()))
    .filter(Boolean)
    .map((w) => ({ name: `${w}px`, w, h: w <= 500 ? 844 : w <= 900 ? 1180 : 900 }));
} else {
  devices = DEVICES;
}

const ROUTES = [
  "/",
  "/?category=all",
  "/categories",
  "/categories?category=Dairy%20%26%20Bakery",
  "/orders",
  "/orders/SQ-9358",
  "/pay/checkout",
  "/rider/apply",
  "/offline",
  "/privacy",
  "/terms",
  "/refund",
  "/delete-account",
  "/brand",
  "/owner",
  "/owner/catalog",
  "/owner/riders",
  "/manager",
  "/packer",
  "/rider",
  "/rider/dashboard",
];

const routes = ONLY ?? ROUTES;

/** Injected into the page: describe the page and its layout defects. */
function measure() {
  const vw = document.documentElement.clientWidth;
  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

  const describe = (el) => {
    const bits = [el.tagName.toLowerCase()];
    const cls = (el.getAttribute("class") || "").trim().split(/\s+/).slice(0, 6).join(".");
    if (cls) bits.push(`.${cls}`);
    if (el.id) bits.push(`#${el.id}`);
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
    return { selector: bits.join("").slice(0, 120), text };
  };

  // An element inside an intentional horizontal scroller is allowed to be wide.
  const insideScroller = (el) => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
      n = n.parentElement;
    }
    return false;
  };

  const offenders = [];
  const tagged = new Map();
  for (const el of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const rightOver = r.right - vw;
    const leftOver = -r.left;
    if (rightOver > 1 || leftOver > 1) {
      if (insideScroller(el)) continue;
      const key = String(offenders.length);
      tagged.set(key, el);
      offenders.push({
        key,
        ...describe(el),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        overflowPx: Math.round(Math.max(rightOver, leftOver)),
      });
    }
  }

  const kept = [];
  for (const o of offenders) {
    const el = tagged.get(o.key);
    let isChildOfKept = false;
    for (const k of kept) {
      const kEl = tagged.get(k.key);
      if (kEl && kEl !== el && kEl.contains(el)) {
        isChildOfKept = true;
        break;
      }
    }
    if (!isChildOfKept) kept.push(o);
  }

  // Touch targets below the 44x44 HIG minimum.
  const smallTargets = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    if (r.height >= 44 && r.width >= 44) continue;
    const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 28);
    const key = `${label}|${Math.round(r.width)}x${Math.round(r.height)}|${Math.round(r.top)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    smallTargets.push({ label: label || el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
  }

  // Text fields below 16 px trigger iOS focus-zoom on touch devices.
  const smallInputs = [];
  for (const el of document.querySelectorAll("input, textarea, select")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const size = parseFloat(cs.fontSize);
    if (size >= 16) continue;
    smallInputs.push({
      placeholder: (el.getAttribute("placeholder") || el.getAttribute("name") || el.type || "").slice(0, 28),
      fontSize: size,
      w: Math.round(r.width),
    });
  }

  return {
    url: location.pathname + location.search,
    title: document.title,
    viewport: vw,
    docWidth: docW,
    overflow: Math.max(0, docW - vw),
    offenders: kept.slice(0, 12),
    smallTargets: smallTargets.slice(0, 8),
    smallTargetCount: smallTargets.length,
    smallInputs,
    smallInputCount: smallInputs.length,
  };
}

async function login(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const phone = page.getByPlaceholder(/mobile number/i).first();
  if (await phone.count()) {
    await phone.fill(PHONE);
    await page.waitForTimeout(400);
    const otp = page.getByPlaceholder(/enter otp/i).first();
    await page.getByRole("button", { name: /^Continue/i }).first().click();
    try {
      await otp.waitFor({ timeout: 10000 });
    } catch {
      await page.getByRole("button", { name: /^Continue/i }).first().click().catch(() => {});
      await otp.waitFor({ timeout: 20000 });
    }
    await otp.fill(CODE);
    await page.waitForTimeout(1200);
    const verify = page.getByRole("button", { name: /Verify Code/i }).first();
    if (await verify.isVisible().catch(() => false)) {
      await verify.click().catch(() => {});
    }
    await page.waitForTimeout(3000);
  }
  await ctx.storageState({ path: `/tmp/sq-audit-${ROLE}.json` });
  const state = JSON.parse(fs.readFileSync(`/tmp/sq-audit-${ROLE}.json`, "utf8"));
  console.log(`login(${ROLE}): ${state.cookies.length} cookies`);
  await ctx.close();
  return `/tmp/sq-audit-${ROLE}.json`;
}

const browser = await chromium.launch();
let storage = `/tmp/sq-audit-${ROLE}.json`;
if (!fs.existsSync(storage)) storage = await login(browser);

if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
let failures = 0;

async function auditOne(route, device) {
  const ctx = await browser.newContext({
    viewport: { width: device.w, height: device.h },
    storageState: storage,
    deviceScaleFactor: 1,
    isMobile: device.w <= 500,
    hasTouch: device.w <= 900,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`));

  let data;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1600);
    await page.keyboard.press("Escape").catch(() => {});
    data = await page.evaluate(measure);
    data.consoleErrors = [...new Set(consoleErrors)].slice(0, 5);
  } catch (e) {
    data = {
      url: route,
      viewport: device.w,
      error: String(e).slice(0, 200),
      overflow: 0,
      offenders: [],
      smallTargets: [],
      smallInputs: [],
      consoleErrors: [],
    };
  }

  if (data.overflow > 0) failures++;
  const skipShot = route.includes("/orders/SQ-") || route.includes("category=");
  if (SHOTS && !skipShot) {
    await page
      .screenshot({
        path: `${SHOT_DIR}/${route.replace(/[/?=&%.]/g, "_") || "root"}-${device.w}x${device.h}.png`,
        fullPage: false,
      })
      .catch(() => {});
  }
  await ctx.close();
  return { route, device: device.name, width: device.w, height: device.h, ...data };
}

// Four pages at a time keeps the sweep under a few minutes.
const jobs = [];
for (const route of routes) for (const device of devices) jobs.push([route, device]);

const CONCURRENCY = 4;
for (let i = 0; i < jobs.length; i += CONCURRENCY) {
  const batch = jobs.slice(i, i + CONCURRENCY);
  const done = await Promise.all(batch.map(([r, d]) => auditOne(r, d)));
  results.push(...done);
  process.stdout.write(`\r  audited ${Math.min(i + CONCURRENCY, jobs.length)}/${jobs.length}`);
}
process.stdout.write("\n");

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────
const lines = [];
for (const route of routes) {
  const rows = results.filter((r) => r.route === route);
  const worst = Math.max(...rows.map((r) => r.overflow || 0));
  const badge = worst > 0 ? "✗ OVERFLOW" : "✓";
  lines.push(`\n${badge}  ${route}  (max overflow ${worst}px)`);
  for (const r of rows) {
    if (r.error) {
      lines.push(`   ${r.device.padEnd(24)} ERROR ${r.error}`);
      continue;
    }
    if (r.overflow > 0) {
      lines.push(
        `   ${r.device.padEnd(24)} doc ${r.docWidth}px (viewport ${r.viewport}px) → +${r.overflow}px`
      );
      for (const o of r.offenders) {
        lines.push(`        +${String(o.overflowPx).padStart(4)}px  ${o.selector}  ${o.text ? `« ${o.text} »` : ""}`);
      }
    } else {
      lines.push(`   ${r.device.padEnd(24)} ok`);
    }
  }
}

const inputOffenders = results.filter((r) => r.smallInputCount > 0 && r.width < 900);
const consoleOffenders = results.filter((r) => (r.consoleErrors || []).length > 0);
const tapRows = results.filter((r) => r.smallTargetCount > 0);

lines.push(`\n── Touch inputs below 16px (iOS focus-zoom) ──`);
if (!inputOffenders.length) lines.push("none");
for (const r of inputOffenders.slice(0, 20)) {
  lines.push(
    `${r.route} @ ${r.device}: ${r.smallInputCount} → ${r.smallInputs
      .slice(0, 4)
      .map((i) => `${i.placeholder || "field"} ${i.fontSize}px`)
      .join(", ")}`
  );
}

lines.push(`\n── Console / page errors ──`);
if (!consoleOffenders.length) lines.push("none");
for (const r of consoleOffenders.slice(0, 20)) {
  lines.push(`${r.route} @ ${r.device}: ${r.consoleErrors.join(" | ")}`);
}

lines.push(`\n── Small tap targets (worst pages) ──`);
const tapSummary = new Map();
for (const r of tapRows) {
  const key = r.route;
  const cur = tapSummary.get(key) || { max: 0, sample: [] };
  if (r.smallTargetCount > cur.max) {
    cur.max = r.smallTargetCount;
    cur.sample = r.smallTargets;
  }
  tapSummary.set(key, cur);
}
for (const [route, v] of [...tapSummary.entries()].sort((a, b) => b[1].max - a[1].max).slice(0, 12)) {
  lines.push(
    `${route}: ${v.max} → ${v.sample
      .slice(0, 4)
      .map((t) => `${t.label} ${t.w}x${t.h}`)
      .join(", ")}`
  );
}

fs.writeFileSync("/tmp/sq-audit.json", JSON.stringify(results, null, 2));
console.log(lines.join("\n"));
console.log(
  `\n${failures} width×route combinations overflow · ${results.length} checks · details /tmp/sq-audit.json`
);
process.exit(failures > 0 ? 1 : 0);
