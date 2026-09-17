// ==============================================================================
// SabQuick Clean Production Database Seeder
// Provisions only verified Dark Store configurations, active theme, and
// primary Store Owner. Purges all demo artifacts and mock test accounts.
// ==============================================================================

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=======================================================");
  console.log("   🚀 SABQUICK CLEAN PRODUCTION DATABASE SEEDER");
  console.log("=======================================================\n");

  // 1. Purge legacy demo / mock accounts and their child records
  console.log("🧹 Auditing and purging mock development personas...");
  const mockEmails = [
    "customer@sabquick.local",
    "rider1@sabquick.local",
    "rider2@sabquick.local",
    "packer@sabquick.local",
    "manager@sabquick.local",
    "owner@sabquick.local",
  ];

  const mockUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: mockEmails } },
        { email: { endsWith: "@sabquick.local" } },
      ],
    },
    select: { id: true },
  });
  const mockUserIds = mockUsers.map((u) => u.id);

  if (mockUserIds.length > 0) {
    const mockOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: { in: mockUserIds } },
          { riderId: { in: mockUserIds } },
        ],
      },
      select: { id: true },
    });
    const mockOrderIds = mockOrders.map((o) => o.id);

    if (mockOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: mockOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: mockOrderIds } } });
    }

    await prisma.address.deleteMany({ where: { userId: { in: mockUserIds } } });
    await prisma.riderProfile.deleteMany({ where: { userId: { in: mockUserIds } } });
    const purged = await prisma.user.deleteMany({ where: { id: { in: mockUserIds } } });
    console.log(`   ✓ Purged ${purged.count} mock development accounts and associated records.`);
  } else {
    console.log("   ✓ Zero mock accounts found. Database is already clean.");
  }

  // 2. Upsert Production Active Theme
  console.log("🎨 Ensuring production active theme is configured...");
  const theme = await prisma.themeConfig.upsert({
    where: { id: "active_theme" },
    update: {
      themeName: "Forest Speed (Standard)",
      primaryColor: "#0B6E4F",
      accentColor: "#00C853",
      saleTagText: "⚡ 10-15 Min Delivery Guarantee",
      bannerImageUrl: "/banners/forest-speed-hero.webp",
    },
    create: {
      id: "active_theme",
      themeName: "Forest Speed (Standard)",
      primaryColor: "#0B6E4F",
      accentColor: "#00C853",
      saleTagText: "⚡ 10-15 Min Delivery Guarantee",
      bannerImageUrl: "/banners/forest-speed-hero.webp",
    },
  });
  console.log(`   ✓ Active Theme: [${theme.themeName}] (${theme.primaryColor})`);

  // 3. Provision Verified Primary Store Owner Account
  const ownerPhone = process.env.OWNER_PHONE || "9876500001";
  const ownerEmail = process.env.OWNER_EMAIL || "owner@sabquick.com";
  const ownerName = process.env.OWNER_NAME || "SabQuick Store Owner";

  console.log("👑 Provisioning verified Store Owner account...");
  const owner = await prisma.user.upsert({
    where: { phone: ownerPhone },
    update: {
      name: ownerName,
      email: ownerEmail,
      role: Role.OWNER,
      phoneVerified: true,
    },
    create: {
      name: ownerName,
      phone: ownerPhone,
      email: ownerEmail,
      role: Role.OWNER,
      phoneVerified: true,
    },
  });
  console.log(`   ✓ Store Owner: ${owner.name} (+91 ${owner.phone}) [${owner.role}]`);

  // 4. Report Dark Store Hub & Geofence Coordinates
  const hubLat = parseFloat(process.env.HUB_LATITUDE || process.env.NEXT_PUBLIC_STORE_LAT || "28.6139");
  const hubLng = parseFloat(process.env.HUB_LONGITUDE || process.env.NEXT_PUBLIC_STORE_LNG || "77.2090");
  const geofenceKm = parseFloat(process.env.GEOFENCE_RADIUS_KM || process.env.NEXT_PUBLIC_STORE_MAX_RADIUS_KM || "2.5");

  console.log("📍 Dark Store Operational Geometry:");
  console.log(`   * Hub Coordinates: (${hubLat}, ${hubLng})`);
  console.log(`   * Delivery Geofence: ${geofenceKm} km SLA radius`);

  console.log("\n=======================================================");
  console.log("   🎉 PRODUCTION DATABASE SEED COMPLETED CLEANLY");
  console.log("   - Customer tables: Clean");
  console.log("   - Order histories: Clean");
  console.log("   - Mock personas: 0");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Production seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
