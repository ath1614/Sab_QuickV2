/**
 * Responsive layout audit.
 *
 * Walks every route at phone / iPad / desktop widths and reports:
 *   - document-level horizontal overflow (the thing that produces a
 *     sideways-scrolling page on iPad, App Store guideline 4)
 *   - elements that stick out past the viewport and are NOT inside an
 *     intentional overflow-x scroller (those are the root causes)
 *   - interactive elements smaller than the 44x44 touch minimum
 *
 * Usage:
 *   node scripts/ui-audit.mjs --phone 9820088991 --code 742918
 *   node scripts/ui-audit.mjs --phone 9109066668 --code <otp> --routes /owner,/manager
 *   node scripts/ui-audit.mjs --base http://localhost:3100 --widths 390,820,1180
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
const WIDTHS = arg("widths", "390,820,1180,1440")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter(Boolean);
const PHONE = arg("phone", "9820088991");
const CODE = arg("code", "742918");
const ROLE = arg("role", "customer");
const SHOTS = args.includes("--shots");
const ONLY = arg("routes", "") ? arg("routes").split(",").filter(Boolean) : null;

/** Height mimics the device the width belongs to. */
const heightFor = (w) => (w <= 500 ? 844 : w <= 900 ? 1180 : 900);

const ROUTES = [
  "/",
  "/?category=all",
  "/categories",
  "/orders",
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
  "/orders/SQ-TEST-0001",
];

const routes = ONLY ?? ROUTES;

/** Injected into the page: describe the page and its overflow offenders. */
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

  // Keep only the outermost offender in each subtree: the parent is the cause.
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

  // Touch targets: interactive elements smaller than 44x44 CSS px.
  const smallTargets = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("button, a, input, select, [role=button]")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    if (r.height >= 44 && r.width >= 44) continue;
    // Only report the interactive leaf, not every wrapper link.
    const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const key = `${label}|${Math.round(r.width)}x${Math.round(r.height)}|${Math.round(r.top)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    smallTargets.push({ label: label || el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) });
  }

  return {
    url: location.pathname + location.search,
    title: document.title,
    viewport: vw,
    docWidth: docW,
    overflow: Math.max(0, docW - vw),
    offenders: kept.slice(0, 12),
    smallTargets: smallTargets.slice(0, 15),
    smallTargetCount: smallTargets.length,
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
      // The first click can land before hydration on a cold production load.
      await page.getByRole("button", { name: /^Continue/i }).first().click().catch(() => {});
      await otp.waitFor({ timeout: 20000 });
    }
    await otp.fill(CODE);
    await page.waitForTimeout(1200);
    // A full-length code auto-submits; only click when the form is still up.
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

const results = [];
let failures = 0;

for (const route of routes) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: heightFor(width) },
      storageState: storage,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    let data;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2200);
      // Dismiss the cold-start splash if it is on screen.
      await page.keyboard.press("Escape").catch(() => {});
      data = await page.evaluate(measure);
    } catch (e) {
      data = { url: route, viewport: width, error: String(e).slice(0, 200), overflow: 0, offenders: [], smallTargets: [] };
    }
    if (data.overflow > 0) failures++;
    results.push({ route, width, ...data });

    if (SHOTS) {
      fs.mkdirSync("/tmp/sq-shots", { recursive: true });
      await page
        .screenshot({ path: `/tmp/sq-shots/${route.replace(/[/?=&]/g, "_") || "root"}-${width}.png`, fullPage: false })
        .catch(() => {});
    }
    await ctx.close();
  }
}

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────
for (const route of routes) {
  const rows = results.filter((r) => r.route === route);
  const worst = Math.max(...rows.map((r) => r.overflow || 0));
  const badge = worst > 0 ? "✗ OVERFLOW" : "✓";
  console.log(`\n${badge}  ${route}  (max overflow ${worst}px)`);
  for (const r of rows) {
    if (r.error) {
      console.log(`   ${String(r.width).padStart(5)}px  ERROR ${r.error}`);
      continue;
    }
    if (r.overflow > 0) {
      console.log(`   ${String(r.width).padStart(5)}px  doc ${r.docWidth}px (viewport ${r.viewport}px) → +${r.overflow}px`);
      for (const o of r.offenders) {
        console.log(`            +${String(o.overflowPx).padStart(4)}px  ${o.selector}  ${o.text ? `« ${o.text} »` : ""}`);
      }
    } else {
      console.log(`   ${String(r.width).padStart(5)}px  ok${r.smallTargetCount ? `  (${r.smallTargetCount} targets <44px)` : ""}`);
    }
  }
}

fs.writeFileSync("/tmp/sq-audit.json", JSON.stringify(results, null, 2));
console.log(`\n${failures} width×route combinations overflow. Details: /tmp/sq-audit.json`);
process.exit(failures > 0 ? 1 : 0);
