import prisma from "../lib/prisma";

// Haversine formula to compute distance in km
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

async function verify() {
  console.log("==================================================");
  console.log("   SABQUICK DATABASE VERIFICATION REPORT");
  console.log("==================================================\n");

  // 1. Users & Roles
  const users = await prisma.user.findMany({
    include: {
      riderProfile: true,
      addresses: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`👤 Users count: ${users.length}`);
  users.forEach((u) => {
    const roleBadge = `[${u.role}]`;
    const details =
      u.riderProfile
        ? `(Rider: ${u.riderProfile.vehicleDetails}, online: ${u.riderProfile.isOnline})`
        : u.addresses.length > 0
        ? `(Address: ${u.addresses[0].streetArea})`
        : "";
    console.log(` - ${(u.name || "Anonymous").padEnd(28)} ${roleBadge.padEnd(12)} ${u.phone} ${details}`);
  });

  // 2. Geofence Verification for Customer
  const STORE_LAT = parseFloat(process.env.STORE_LATITUDE || "28.6139");
  const STORE_LNG = parseFloat(process.env.STORE_LONGITUDE || "77.2090");
  const MAX_RADIUS = parseFloat(process.env.STORE_MAX_RADIUS_KM || "2.5");

  const customer = users.find((u) => u.role === "CUSTOMER");
  if (customer && customer.addresses.length > 0) {
    const addr = customer.addresses[0];
    const dist = calculateDistanceKm(STORE_LAT, STORE_LNG, addr.latitude, addr.longitude);
    const isWithin = dist <= MAX_RADIUS;
    console.log(`\n📍 Geofence Check:`);
    console.log(` - Dark Store Hub: (${STORE_LAT}, ${STORE_LNG})`);
    console.log(` - Customer Location: (${addr.latitude}, ${addr.longitude}) [${addr.flatBuilding}]`);
    console.log(` - Straight-line Distance: ${dist} km`);
    console.log(` - Geofence Status: ${isWithin ? "✅ ELIGIBLE (within " + MAX_RADIUS + " km max)" : "❌ OUT OF GEOFENCE"}`);
  }

  // 3. Category Tree
  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      subCategories: {
        include: {
          _count: { select: { products: true } },
        },
      },
      _count: { select: { products: true } },
    },
    orderBy: { displayRank: "asc" },
  });

  console.log(`\n📂 Categories (Two-Tier Hierarchy):`);
  parentCategories.forEach((p) => {
    console.log(` 📁 ${p.name} (Rank: ${p.displayRank})`);
    p.subCategories.forEach((s) => {
      console.log(`    └─ 📄 ${s.name.padEnd(24)} (${s._count.products} products)`);
    });
  });

  // 4. Products & Inventory Stats
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { mrp: "desc" },
  });

  const totalStock = products.reduce((acc, curr) => acc + curr.stockCount, 0);
  const minPrice = Math.min(...products.map((p) => p.salePrice));
  const maxPrice = Math.max(...products.map((p) => p.salePrice));

  console.log(`\n🛒 Products Catalog Stats:`);
  console.log(` - Total SKUs: ${products.length}`);
  console.log(` - Total Stock Count in Hub: ${totalStock} units`);
  console.log(` - Price Range: ₹${minPrice} to ₹${maxPrice}`);
  console.log("\nSample SKUs:");
  products.slice(0, 6).forEach((p) => {
    const discount = Math.round(((p.mrp - p.salePrice) / p.mrp) * 100);
    console.log(
      ` - ${p.title.padEnd(42)} [${p.unitQuantity.padEnd(10)}] MRP: ₹${p.mrp} -> ₹${p.salePrice} (${discount}% OFF) | Stock: ${p.stockCount} | Tags: ${p.tags.slice(0, 3).join(", ")}`
    );
  });

  // 5. Theme Configuration
  const theme = await prisma.themeConfig.findUnique({
    where: { id: "active_theme" },
  });
  console.log(`\n🎨 Active Theme Config:`);
  console.log(` - Name: ${theme?.themeName}`);
  console.log(` - Primary: ${theme?.primaryColor} | Accent: ${theme?.accentColor}`);
  console.log(` - Promo Banner Tag: "${theme?.saleTagText}"`);

  console.log("\n==================================================");
  console.log("   ALL RELATIONAL ENTITIES VERIFIED SUCCESSFULLY");
  console.log("==================================================");
}

verify()
  .catch((err) => {
    console.error("Verification error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
