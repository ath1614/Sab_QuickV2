import prisma from "../lib/prisma";

async function verifyStorefrontAisles() {
  console.log("=================================================");
  console.log("🏪 TESTING STOREFRONT AISLE SUBCATEGORY BALANCING");
  console.log("=================================================\n");

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      include: {
        subCategories: {
          orderBy: { displayRank: "asc" },
        },
      },
      orderBy: { displayRank: "asc" },
    }),
    prisma.product.findMany({
      where: { isAvailable: true, stockCount: { gt: 0 } },
      include: { category: true },
      orderBy: [{ isAvailable: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const MAX_RAIL_PRODUCTS = 6;

  console.log(`Found ${categories.length} parent categories and ${products.length} in-stock products.\n`);

  categories.forEach((cat) => {
    const bucketMap = new Map<string, any[]>();
    (cat.subCategories || []).forEach((sub) => {
      bucketMap.set(sub.id, []);
    });

    const directProducts: any[] = [];

    products.forEach((prod) => {
      if (prod.categoryId === cat.id) {
        directProducts.push(prod);
      } else if (cat.subCategories.some((s) => s.id === prod.categoryId)) {
        if (!bucketMap.has(prod.categoryId)) bucketMap.set(prod.categoryId, []);
        bucketMap.get(prod.categoryId)!.push(prod);
      }
    });

    const activeBuckets: any[][] = [];
    bucketMap.forEach((bucket) => {
      if (bucket.length > 0) activeBuckets.push([...bucket]);
    });
    if (directProducts.length > 0) activeBuckets.push([...directProducts]);

    const balancedProducts: any[] = [];
    const seenIds = new Set<string>();

    let hasMore = true;
    while (hasMore && balancedProducts.length < MAX_RAIL_PRODUCTS) {
      hasMore = false;
      for (const bucket of activeBuckets) {
        if (bucket.length > 0 && balancedProducts.length < MAX_RAIL_PRODUCTS) {
          const nextProd = bucket.shift()!;
          if (!seenIds.has(nextProd.id)) {
            seenIds.add(nextProd.id);
            balancedProducts.push(nextProd);
          }
          if (bucket.length > 0) hasMore = true;
        }
      }
    }

    console.log(`📁 Aisle: [${cat.name}] (Total in-stock: ${products.filter((p) => p.categoryId === cat.id || cat.subCategories.some((s) => s.id === p.categoryId)).length})`);
    console.log(`   Rail items (${balancedProducts.length} shown on home):`);
    balancedProducts.forEach((p, idx) => {
      const subName = cat.subCategories.find((s) => s.id === p.categoryId)?.name || "Direct";
      console.log(`     ${idx + 1}. [${subName}] ${p.title} (₹${p.salePrice})`);
    });
    console.log("");
  });

  console.log("=================================================");
  console.log("🎉 BALANCED STOREFRONT VERIFICATION COMPLETE");
  console.log("=================================================");
}

verifyStorefrontAisles()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
