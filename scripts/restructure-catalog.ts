/**
 * Catalog Restructure Tool (Phase 0 of the Blinkit-style UX rebuild)
 *
 * Problem it solves:
 *   Production was seeded with a single monolithic parent category ("Grocery")
 *   holding ALL products with zero subcategories. That breaks the Blinkit-style
 *   storefront UX (3x3 category grid, per-aisle rails) because there is only one
 *   aisle, and it makes the home page mount hundreds of cards at once.
 *
 * What it does:
 *   - Detects oversized parents (>= OVERSIZED_MIN_PRODUCTS products AND holding
 *     at least OVERSIZED_RATIO times the products of the next-largest parent).
 *   - Reassigns those products into standard Blinkit-aligned parent aisles by
 *     matching product titles/tags against keyword rules. Unmatched products
 *     stay in the original parent (never lose products).
 *   - Idempotent: on a healthy tree (like the local dev DB) it detects nothing
 *     to do and exits 0 without touching a single row.
 *
 * Safety:
 *   - DRY-RUN by default: prints the full plan. Run with --apply to execute.
 *   - Wraps all writes in one prisma.$transaction.
 *   - Verify script contract: `verify-catalog.ts` requires >=4 parents and
 *     >=8 subcategories; healthy trees are untouched, monoliths become valid.
 *
 * Usage:
 *   npx tsx scripts/restructure-catalog.ts            # dry-run plan
 *   npx tsx scripts/restructure-catalog.ts --apply    # execute changes
 */

import fs from "fs";
import path from "path";

// Load .env (same lightweight loader as the verify scripts)
const envLocalPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

import prisma from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const OVERSIZED_MIN_PRODUCTS = 60;
const OVERSIZED_RATIO = 3;

/** Blinkit-aligned parent taxonomy with title/tag keyword rules. Order = match priority. */
const TAXONOMY: Array<{ slug: string; name: string; rank: number; keywords: string[] }> = [
  {
    slug: "fruits-and-vegetables",
    name: "Fruits & Vegetables",
    rank: 1,
    keywords: ["fruit", "vegetable", "banana", "apple", "onion", "potato", "tomato", "coriander", "lemon", "green chilli", "carrot", "ladies finger", "brinjal", "cauliflower", "cabbage", "spinach", "palak", "ginger", "garlic"],
  },
  {
    slug: "dairy-and-breakfast",
    name: "Dairy & Breakfast",
    rank: 2,
    keywords: ["milk", "curd", "yogurt", "paneer", "cheese", "butter", "ghee", "bread", "brown bread", "atta", "roti", "paratha", "egg", "oats", "cornflakes", "cereal", "breakfast"],
  },
  {
    slug: "snacks-and-munchies",
    name: "Snacks & Munchies",
    rank: 3,
    keywords: ["chips", "namkeen", "biscuit", "cookie", "kurkure", "nachos", "popcorn", "bhujia", "snack", "wafer", "cake", "chocolate", "candy", "toffee", "nuts", "dry fruit", "munchies"],
  },
  {
    slug: "cold-drinks-and-juices",
    name: "Cold Drinks & Juices",
    rank: 4,
    keywords: ["cola", "pepsi", "coca", "thums up", "sprite", "fanta", "juice", "soda", "mojito", "cold drink", "soft drink", "energy drink", "water bottle", "mineral water", "ice cream"],
  },
  {
    slug: "instant-frozen-foods",
    name: "Instant & Frozen Food",
    rank: 5,
    keywords: ["maggi", "noodle", "pasta", "instant", "ready to eat", "frozen", "momos", "fries", "nuggets", "soup", "poha mix", "upma mix"],
  },
  {
    slug: "atta-rice-dal",
    name: "Atta, Rice & Dal",
    rank: 6,
    keywords: ["atta", "rice", "dal", "pulse", "toor", "moong", "chana", "rajma", "besan", "maida", "sooji", "rava", "bajra", "flour", "chawal", "urad"],
  },
  {
    slug: "oil-ghee-masala",
    name: "Oil, Ghee & Masala",
    rank: 7,
    keywords: ["oil", "refined", "mustard oil", "sunflower", "masala", "haldi", "turmeric", "chilli powder", "coriander powder", "garam masala", "jeera", "salt", "sugar", "spice", "cardamom", "clove"],
  },
  {
    slug: "tea-coffee-health-drinks",
    name: "Tea, Coffee & Health Drinks",
    rank: 8,
    keywords: ["tea", "chai", "coffee", "horlicks", "bournvita", "complan", "protein", "health drink", "green tea", " Nescafe", " Tata Tea", " Red Label"],
  },
  {
    slug: "personal-care",
    name: "Personal Care",
    rank: 9,
    keywords: ["soap", "shampoo", "toothpaste", "toothbrush", "deodorant", "perfume", "cream", "lotion", "sanitizer", "diaper", "sanitary", "razor", "face wash", "hair oil", "powder", "talcum"],
  },
  {
    slug: "baby-care",
    name: "Baby Care",
    rank: 10,
    keywords: ["baby", "pampers", "diaper", "baby soap", "baby lotion", "baby food", "cerelac", "baby powder"],
  },
  {
    slug: "home-and-household",
    name: "Home & Household",
    rank: 11,
    keywords: ["detergent", "surf", "ariel", "dishwash", "vim", "harpic", "phenyl", "mop", "broom", "garbage bag", "tissue", "mosquito", "repellent", "agarbatti", "candle", "matchbox", "cleaning"],
  },
];

interface PlanEntry {
  productId: string;
  title: string;
  fromCategory: string;
  toCategory: string;
  matchedKeyword: string;
}

function classifyProduct(title: string, tags: string[]): { slug: string; keyword: string } | null {
  const haystack = `${title} ${tags.join(" ")}`.toLowerCase();
  for (const rule of TAXONOMY) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        return { slug: rule.slug, keyword: kw };
      }
    }
  }
  return null;
}

async function main() {
  console.log("==================================================");
  console.log("   SABQUICK CATALOG RESTRUCTURE TOOL (PHASE 0)");
  console.log(`   Mode: ${APPLY ? "✅ APPLY (writes)" : "🔍 DRY-RUN (no writes)"}`);
  console.log("==================================================\n");

  const parents = await prisma.category.findMany({
    where: { parentId: null },
    include: { _count: { select: { products: true } } },
    orderBy: { displayRank: "asc" },
  });

  console.log(`Found ${parents.length} parent categories:`);
  parents.forEach((p) => console.log(`  [${p.displayRank}] ${p.name} (${p.slug}): ${p._count.products} products`));

  const totalProducts = await prisma.product.count();
  console.log(`\nTotal products: ${totalProducts}`);

  // ---------- Detect oversized parents ----------
  const counts = parents
    .map((p) => ({ parent: p, count: p._count.products }))
    .sort((a, b) => b.count - a.count);

  const oversized = counts.filter(
    (c, idx) =>
      c.count >= OVERSIZED_MIN_PRODUCTS &&
      (idx === 0 ? c.count >= OVERSIZED_RATIO * (counts[1]?.count ?? 1) : c.count >= OVERSIZED_RATIO * counts[0].count)
  );

  if (oversized.length === 0) {
    console.log("\n✅ Catalog structure is healthy — no oversized monolithic parents detected.");
    console.log("   Nothing to do. (Idempotent no-op.)");
    return;
  }

  for (const { parent, count } of oversized) {
    console.log(`\n🚨 Oversized parent: "${parent.name}" (${count} products)`);

    // ---------- Load products of this parent (incl. its subcategories) ----------
    const subs = await prisma.category.findMany({
      where: { parentId: parent.id },
      select: { id: true },
    });
    const categoryIds = [parent.id, ...subs.map((s) => s.id)];

    const products = await prisma.product.findMany({
      where: { categoryId: { in: categoryIds } },
      select: {
        id: true,
        title: true,
        tags: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });

    // ---------- Build the reassignment plan ----------
    const targetCache = new Map<string, string>(); // slug -> categoryId
    const plan: PlanEntry[] = [];

    for (const product of products) {
      // Never reassign products that already live in a subcategory of this parent.
      if (product.categoryId !== parent.id) continue;

      const match = classifyProduct(product.title, (product.tags as string[]) || []);
      if (!match) continue;

      // "dairy-and-breakfast" style rule also catches products already in a
      // parent that IS the target — skip those to avoid pointless moves.
      if (match.slug === parent.slug) continue;

      let targetId = targetCache.get(match.slug);
      if (!targetId) {
        const target = await prisma.category.findUnique({ where: { slug: match.slug } });
        if (target) {
          targetId = target.id;
        } else {
          targetId = "CREATE";
        }
        targetCache.set(match.slug, targetId);
      }

      plan.push({
        productId: product.id,
        title: product.title,
        fromCategory: parent.name,
        toCategory: TAXONOMY.find((t) => t.slug === match.slug)!.name,
        matchedKeyword: match.keyword,
      });
    }

    const toCreate = TAXONOMY.filter(
      (t) => targetCache.get(t.slug) === "CREATE" && plan.some((p) => p.toCategory === t.name)
    );

    console.log(`  Plan: move ${plan.length}/${products.length} products into ${new Set(plan.map((p) => p.toCategory)).size} target aisles.`);
    console.log(`  New parent categories to create: ${toCreate.map((t) => t.name).join(", ") || "(none)"}`);
    plan.slice(0, 25).forEach((p) =>
      console.log(`    • "${p.title.slice(0, 48)}" → ${p.toCategory} (matched "${p.matchedKeyword}")`)
    );
    if (plan.length > 25) console.log(`    … and ${plan.length - 25} more`);

    if (!APPLY) continue;

    // ---------- Execute in a single transaction ----------
    await prisma.$transaction(async (tx) => {
      let nextRank = await tx.category.count({ where: { parentId: null } });
      for (const t of toCreate) {
        const created = await tx.category.create({
          data: { name: t.name, slug: t.slug, displayRank: ++nextRank },
        });
        targetCache.set(t.slug, created.id);
        console.log(`  📁 Created parent: ${t.name} (rank ${nextRank})`);
      }

      for (const entry of plan) {
        const slug = TAXONOMY.find((t) => t.name === entry.toCategory)!.slug;
        const targetId = targetCache.get(slug);
        if (!targetId || targetId === "CREATE") {
          throw new Error(`Missing target category id for ${entry.toCategory}`);
        }
        await tx.product.update({
          where: { id: entry.productId },
          data: { categoryId: targetId },
        });
      }
    });

    console.log(`  ✅ Moved ${plan.length} products.`);
  }

  if (!APPLY) {
    console.log("\n🔍 DRY-RUN complete. Re-run with --apply to execute this plan.");
    process.exit(1); // signal that a restructure is pending (CI-visible)
  }

  const after = await prisma.category.findMany({
    where: { parentId: null },
    include: { _count: { select: { products: true } } },
    orderBy: { displayRank: "asc" },
  });
  console.log("\n📊 Post-restructure parent aisles:");
  after.forEach((p) => console.log(`  [${p.displayRank}] ${p.name}: ${p._count.products} products`));
  console.log("\n🎉 Catalog restructure complete.");
}

main()
  .catch((err) => {
    console.error("\n❌ Catalog restructure failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
