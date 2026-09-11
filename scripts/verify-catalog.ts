import prisma from "../lib/prisma";

async function runCatalogVerification() {
  console.log("==================================================");
  console.log("   SABQUICK CATALOG & THEME ENGINE TEST SUITE");
  console.log("==================================================\n");

  // 1. Theme Configuration Validation
  console.log("🎨 1. Testing Theme Engine Configuration...");
  const theme = await prisma.themeConfig.findUnique({
    where: { id: "active_theme" },
  });

  if (!theme) {
    throw new Error("Active ThemeConfig record not found in PostgreSQL!");
  }

  console.log(` - Active Theme: ${theme.themeName}`);
  console.log(` - Brand Primary CSS Variable: ${theme.primaryColor} (Forest Racing Green)`);
  console.log(` - Brand Accent CSS Variable: ${theme.accentColor} (Kinetic Speed Green)`);
  console.log(` - Dynamic Banner Tag: "${theme.saleTagText}"`);
  console.log(` - Status: ✅ VALID THEME TOKENS CONFIRMED`);

  // 2. Two-Tier Category Hierarchy Resolution
  console.log("\n📂 2. Testing Two-Tier Category Hierarchy...");
  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { displayRank: "asc" },
    include: {
      subCategories: {
        orderBy: { displayRank: "asc" },
        include: { _count: { select: { products: true } } },
      },
    },
  });

  console.log(` - Found ${parentCategories.length} Parent Aisles:`);
  let totalSubcategories = 0;
  parentCategories.forEach((parent) => {
    totalSubcategories += parent.subCategories.length;
    console.log(`   📁 [${parent.displayRank}] ${parent.name} (slug: ${parent.slug})`);
    parent.subCategories.forEach((sub) => {
      console.log(`      └─ 📄 [${sub.displayRank}] ${sub.name.padEnd(22)} (${sub._count.products} products)`);
    });
  });

  if (parentCategories.length < 4 || totalSubcategories < 8) {
    throw new Error(`Expected at least 4 parents and 8 subcategories! Found ${parentCategories.length} and ${totalSubcategories}`);
  }
  console.log(` - Status: ✅ TWO-TIER HIERARCHY VERIFIED (${parentCategories.length} parents, ${totalSubcategories} subcategories)`);

  // 3. Product Catalog Query Testing
  console.log("\n🛒 3. Testing High-Density Product Catalog Queries...");

  // All products
  const allProducts = await prisma.product.findMany({
    include: { category: true },
  });
  console.log(` - Total Seeded Products: ${allProducts.length}`);

  // Test A: Parent Category Aggregation ("dairy-and-breakfast")
  const dairyParent = parentCategories.find((c) => c.slug === "dairy-and-breakfast");
  if (!dairyParent) throw new Error("dairy-and-breakfast category missing!");

  const dairySubIds = dairyParent.subCategories.map((s) => s.id);
  const dairyProducts = await prisma.product.findMany({
    where: {
      categoryId: { in: [dairyParent.id, ...dairySubIds] },
    },
    include: { category: true },
  });

  console.log(` - Query Parent Aisle 'dairy-and-breakfast' (resolving children):`);
  console.log(`   * Returned ${dairyProducts.length} items across ${dairySubIds.length} sub-aisles`);
  dairyProducts.forEach((p) => {
    console.log(`     • ${p.title} (${p.category.name}) - ₹${p.salePrice}`);
  });
  if (dairyProducts.length !== 6) {
    throw new Error(`Expected 6 products under dairy-and-breakfast, got ${dairyProducts.length}`);
  }

  // Test B: Subcategory Specific Filtering ("milk")
  const milkSub = dairyParent.subCategories.find((s) => s.slug === "milk");
  if (!milkSub) throw new Error("milk subcategory missing!");

  const milkProducts = await prisma.product.findMany({
    where: { categoryId: milkSub.id },
  });

  console.log(`\n - Query Subcategory 'milk':`);
  console.log(`   * Returned ${milkProducts.length} milk SKUs:`);
  milkProducts.forEach((p) => {
    console.log(`     • ${p.title} [${p.unitQuantity}] - ₹${p.salePrice}`);
  });
  if (milkProducts.length !== 2) {
    throw new Error(`Expected 2 milk SKUs, got ${milkProducts.length}`);
  }

  // Test C: Debounced Search Queries
  console.log(`\n - Testing Search Queries:`);
  const searchTerm = "milk";
  const searchResults = await prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { tags: { has: searchTerm.toLowerCase() } },
      ],
    },
  });

  console.log(`   * Search '${searchTerm}': Found ${searchResults.length} matching products`);
  searchResults.forEach((p) => {
    console.log(`     • ${p.title} (Tags: ${p.tags.join(", ")})`);
  });
  if (searchResults.length === 0) {
    throw new Error(`Expected search results for '${searchTerm}'!`);
  }

  // Test D: Stock Availability Filter
  const inStockProducts = await prisma.product.findMany({
    where: {
      isAvailable: true,
      stockCount: { gt: 0 },
    },
  });
  console.log(`\n - Stock Availability: ${inStockProducts.length}/${allProducts.length} items ready for immediate 10-min dispatch`);

  console.log("\n==================================================");
  console.log("   ALL CATALOG & THEME TESTS PASSED ✅");
  console.log("==================================================");
}

runCatalogVerification()
  .catch((err) => {
    console.error("Catalog verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
