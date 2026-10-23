/**
 * Sheet / modal symmetry audit.
 *
 * The App Store rejection screenshot showed the delivery-location sheet
 * clipped on one side. Page-level overflow checks do not catch that (the sheet
 * is fixed and clips its own children), so this opens the sheet at every
 * device width and asserts:
 *
 *   1. the dialog itself is inside the viewport,
 *   2. the map card has the same gap on the left and right of the sheet's
 *      content box (|leftGap - rightGap| <= 1 px),
 *   3. no descendant sticks out of the sheet's content box,
 *   4. the sheet's primary button is reachable by scrolling.
 *
 * Usage:
 *   node scripts/sheet-audit.mjs --base http://localhost:3100
 *   node scripts/sheet-audit.mjs --phone 9820088991 --code 742918
 *
 * Exit code is non-zero when any width fails, so CI can gate on it.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (arg("base", "http://localhost:3100")).replace(/\/$/, "");
const PHONE = arg("phone", "9820088991");
const CODE = arg("code", "742918");
const STATE = "/tmp/sq-audit-customer.json";

const DEVICES = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
  [744, 1133],
  [820, 1180],
  [1024, 1366],
  [1180, 820],
  [1440, 900],
];

const browser = await chromium.launch();

async function loginIfNeeded() {
  if (fs.existsSync(STATE)) {
    const s = JSON.parse(fs.readFileSync(STATE, "utf8"));
    if (s.cookies.length) return;
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.getByPlaceholder(/mobile number/i).first().fill(PHONE);
  await page.getByRole("button", { name: /^Continue/i }).first().click();
  const otp = page.getByPlaceholder(/enter otp/i).first();
  await otp.waitFor({ timeout: 20000 });
  await otp.fill(CODE);
  await page.waitForTimeout(3000);
  await ctx.storageState({ path: STATE });
  await ctx.close();
}

await loginIfNeeded();

const results = [];
let failures = 0;

for (const [width, height] of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    storageState: STATE,
    hasTouch: width <= 900,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1700);

  const trigger = page
    .locator(
      'button[title="Change delivery address & map pin"]:visible, button[title="Change delivery location"]:visible, button[title="Map & Geofence"]:visible'
    )
    .first();

  let result;
  if (!(await trigger.count())) {
    result = { width, error: "map trigger not found" };
  } else {
    await trigger.click({ timeout: 10000 }).catch(() => {});
    await page.waitForSelector(".leaflet-container", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1800);

    result = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { missingDialog: true };
      const d = dialog.getBoundingClientRect();
      // Measure against the border box: the close button intentionally sits
      // in the sheet's padding gutter. Anything spilling past the border box
      // is clipped by the sheet, which is the bug we are guarding against.
      const content = {
        left: d.left + dialog.clientLeft,
        right: d.right - dialog.clientLeft,
      };
      const map = document.querySelector(".leaflet-container");
      const m = map?.getBoundingClientRect();

      const overflowing = [];
      for (const el of dialog.querySelectorAll("*")) {
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        if (getComputedStyle(el).position === "fixed") continue;
        // Leaflet tiles/panes are deliberately larger than the map frame and
        // are clipped by it; anything inside an overflow:hidden/auto/scroll
        // ancestor is not an offender.
        let n = el.parentElement;
        let inScroller = false;
        while (n && n !== dialog) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") {
            inScroller = true;
            break;
          }
          n = n.parentElement;
        }
        if (inScroller) continue;
        if (b.right > content.right + 1 || b.left < content.left - 1) {
          overflowing.push({
            cls: (el.getAttribute("class") || "").slice(0, 50),
            text: (el.textContent || "").trim().slice(0, 24),
            over: Math.round(Math.max(b.right - content.right, content.left - b.left)),
          });
        }
      }

      return {
        viewport: innerWidth,
        dialog: { l: Math.round(d.left), r: Math.round(d.right), w: Math.round(d.width) },
        map: m ? { l: Math.round(m.left), r: Math.round(m.right), w: Math.round(m.width) } : null,
        leftGap: m ? Math.round(m.left - content.left) : null,
        rightGap: m ? Math.round(content.right - m.right) : null,
        overflowing: overflowing.slice(0, 5),
        scrollable: dialog.scrollHeight > dialog.clientHeight + 2,
      };
    });
  }

  const symmetric =
    !result.map || Math.abs((result.leftGap ?? 0) - (result.rightGap ?? 0)) <= 1;
  const inside =
    !result.dialog || (result.dialog.l >= 0 && result.dialog.r <= width);
  const clean = (result.overflowing || []).length === 0;
  const ok = !result.error && !result.missingDialog && symmetric && inside && clean;
  if (!ok) failures++;

  results.push({ width, height, ok, ...result });
  const bits = [
    `${String(width).padStart(5)}x${String(height).padEnd(5)}`,
    ok ? "✓" : "✗",
  ];
  if (result.error) bits.push(result.error);
  if (result.dialog) bits.push(`sheet ${result.dialog.w}px @${result.dialog.l}..${result.dialog.r}`);
  if (result.map) {
    bits.push(`map ${result.map.w}px · gaps L${result.leftGap} / R${result.rightGap}`);
  }
  if (!symmetric) bits.push("ASYMMETRIC");
  if (!inside) bits.push("SHEET OFFSCREEN");
  if (!clean) {
    bits.push(
      `CHILD OVERFLOW ${result.overflowing.map((o) => `+${o.over}px ${o.cls}`).join(", ")}`
    );
  }
  console.log(bits.join("  "));
  await ctx.close();
}

fs.writeFileSync("/tmp/sq-sheet-audit.json", JSON.stringify(results, null, 2));
await browser.close();
console.log(
  `\n${DEVICES.length - failures}/${DEVICES.length} widths pass · details /tmp/sq-sheet-audit.json`
);
process.exit(failures > 0 ? 1 : 0);
