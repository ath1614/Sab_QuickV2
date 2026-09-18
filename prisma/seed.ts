import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SabQuick database seeding...");

  // 1. Clear existing records in foreign key dependency order
  console.log("🧹 Purging existing records...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.riderProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.themeConfig.deleteMany();

  // 2. Seed Theme Configuration
  console.log("🎨 Seeding ThemeConfig...");
  await prisma.themeConfig.create({
    data: {
      id: "active_theme",
      themeName: "Forest Speed (Standard)",
      primaryColor: "#0B6E4F",
      accentColor: "#00C853",
      saleTagText: "⚡ 10-15 Min Delivery Guarantee",
      bannerImageUrl: "/banners/forest-speed-hero.webp",
    },
  });

  // 3. Seed Users & Staff Roles
  console.log("👥 Seeding Staff & Customer Users...");

  // Owner (Executive Super-Admin)
  const owner = await prisma.user.create({
    data: {
      name: "Anurag Soni",
      email: "sabsupermart68@gmail.com",
      phone: "9109066668",
      phoneVerified: true,
      role: Role.OWNER,
    },
  });

  // Manager
  const manager = await prisma.user.create({
    data: {
      name: "Hub Operations Manager",
      email: "manager@sabquick.local",
      phone: "9876500002",
      phoneVerified: true,
      role: Role.MANAGER,
    },
  });

  // Packer
  const packer = await prisma.user.create({
    data: {
      name: "Express Dark Store Packer",
      email: "packer@sabquick.local",
      phone: "9876500003",
      phoneVerified: true,
      role: Role.PACKER,
    },
  });

  const storeLat = parseFloat(process.env.STORE_LATITUDE || process.env.NEXT_PUBLIC_STORE_LAT || "23.129243");
  const storeLng = parseFloat(process.env.STORE_LONGITUDE || process.env.NEXT_PUBLIC_STORE_LNG || "83.190082");

  // Rider 1
  const rider1 = await prisma.user.create({
    data: {
      name: "Vikram Rider 01",
      email: "rider1@sabquick.local",
      phone: "9876500004",
      phoneVerified: true,
      role: Role.RIDER,
      riderProfile: {
        create: {
          isOnline: true,
          currentLat: storeLat + 0.0003,
          currentLng: storeLng + 0.0005,
          vehicleDetails: "EV Scooter - DL-01-EQ-9871",
        },
      },
    },
  });

  // Rider 2
  const rider2 = await prisma.user.create({
    data: {
      name: "Rahul Rider 02",
      email: "rider2@sabquick.local",
      phone: "9876500005",
      phoneVerified: true,
      role: Role.RIDER,
      riderProfile: {
        create: {
          isOnline: true,
          currentLat: storeLat - 0.0004,
          currentLng: storeLng - 0.0008,
          vehicleDetails: "Ather 450X - DL-03-EB-4512",
        },
      },
    },
  });

  // Demo Customer with Address (within 0.75 km of store hub)
  const customer = await prisma.user.create({
    data: {
      name: "Aakash Verma",
      email: "customer@sabquick.local",
      phone: "9876543210",
      phoneVerified: true,
      role: Role.CUSTOMER,
      addresses: {
        create: {
          label: "Home",
          flatBuilding: "Flat 402, Royal Residency",
          streetArea: "Gandhi Chowk, Ambikapur, Chhattisgarh",
          landmark: "Near Ghadi Chowk",
          latitude: storeLat + 0.0051,
          longitude: storeLng + 0.0050,
        },
      },
    },
  });

  console.log(`✅ Seeded 6 users (1 Owner, 1 Manager, 1 Packer, 2 Riders, 1 Customer)`);

  // 4. Seed Two-Tier Category Structure
  console.log("📂 Seeding Two-Tier Categories...");

  // Category 1: Dairy & Breakfast
  const catDairy = await prisma.category.create({
    data: {
      name: "Dairy & Breakfast",
      slug: "dairy-and-breakfast",
      displayRank: 1,
      imageUrl: "/categories/dairy.png",
      subCategories: {
        create: [
          { name: "Milk", slug: "milk", displayRank: 1 },
          { name: "Bread & Butter", slug: "bread-and-butter", displayRank: 2 },
          { name: "Eggs & Curd", slug: "eggs-and-curd", displayRank: 3 },
        ],
      },
    },
    include: { subCategories: true },
  });

  // Category 2: Snacks & Munchies
  const catSnacks = await prisma.category.create({
    data: {
      name: "Snacks & Munchies",
      slug: "snacks-and-munchies",
      displayRank: 2,
      imageUrl: "/categories/snacks.png",
      subCategories: {
        create: [
          { name: "Chips & Crisps", slug: "chips-and-crisps", displayRank: 1 },
          { name: "Biscuits & Cookies", slug: "biscuits-and-cookies", displayRank: 2 },
        ],
      },
    },
    include: { subCategories: true },
  });

  // Category 3: Cold Drinks & Juices
  const catDrinks = await prisma.category.create({
    data: {
      name: "Cold Drinks & Juices",
      slug: "cold-drinks-and-juices",
      displayRank: 3,
      imageUrl: "/categories/drinks.png",
      subCategories: {
        create: [
          { name: "Soft Drinks", slug: "soft-drinks", displayRank: 1 },
          { name: "Fruit Juices", slug: "fruit-juices", displayRank: 2 },
        ],
      },
    },
    include: { subCategories: true },
  });

  // Category 4: Instant Foods
  const catInstant = await prisma.category.create({
    data: {
      name: "Instant Foods",
      slug: "instant-foods",
      displayRank: 4,
      imageUrl: "/categories/instant.png",
      subCategories: {
        create: [
          { name: "Noodles & Pasta", slug: "noodles-and-pasta", displayRank: 1 },
          { name: "Ready to Eat", slug: "ready-to-eat", displayRank: 2 },
        ],
      },
    },
    include: { subCategories: true },
  });

  // Helper mapping subcategory slug to ID
  const subCategoryMap = new Map<string, string>();
  [catDairy, catSnacks, catDrinks, catInstant].forEach((parent) => {
    parent.subCategories.forEach((sub) => {
      subCategoryMap.set(sub.slug, sub.id);
    });
  });

  console.log(`✅ Seeded 4 parent categories and ${subCategoryMap.size} subcategories`);

  // 5. Seed Realistic Grocery Inventory Products
  console.log("🛒 Seeding Products...");

  const productsData = [
    // Milk
    {
      title: "Amul Taaza Homogenised Toned Milk",
      slug: "amul-taaza-toned-milk-500ml",
      description: "Pouched fresh toned milk, pasteurised with 3.0% fat and 8.5% SNF.",
      categorySlug: "milk",
      mrp: 35,
      salePrice: 33,
      unitQuantity: "500 ml",
      stockCount: 85,
      imageUrl: "/products/amul-taaza.webp",
      tags: ["dairy", "milk", "tea-partner", "breakfast"],
    },
    {
      title: "Mother Dairy Full Cream Fresh Milk",
      slug: "mother-dairy-full-cream-milk-1l",
      description: "Rich and creamy full cream milk, ideal for tea, coffee, and traditional desserts.",
      categorySlug: "milk",
      mrp: 68,
      salePrice: 66,
      unitQuantity: "1 Litre",
      stockCount: 60,
      imageUrl: "/products/mother-dairy-fullcream.webp",
      tags: ["dairy", "milk", "rich", "cooking"],
    },

    // Bread & Butter
    {
      title: "Britannia 100% Whole Wheat Brown Bread",
      slug: "britannia-whole-wheat-brown-bread-400g",
      description: "Baked from whole wheat flour, rich in dietary fiber with zero trans-fats.",
      categorySlug: "bread-and-butter",
      mrp: 55,
      salePrice: 50,
      unitQuantity: "400 g",
      stockCount: 45,
      imageUrl: "/products/britannia-brown-bread.webp",
      tags: ["breakfast", "bread", "healthy", "high-fiber"],
    },
    {
      title: "Amul Pasteurised Salted Table Butter",
      slug: "amul-pasteurised-salted-butter-100g",
      description: "Classic salted table butter made from fresh dairy cream.",
      categorySlug: "bread-and-butter",
      mrp: 60,
      salePrice: 58,
      unitQuantity: "100 g",
      stockCount: 70,
      imageUrl: "/products/amul-butter.webp",
      tags: ["dairy", "butter", "breakfast", "spread"],
    },

    // Eggs & Curd
    {
      title: "Farm Fresh Protein White Eggs",
      slug: "farm-fresh-white-eggs-pack-of-6",
      description: "Clean, washed, high-protein white shell eggs sourced directly from farms.",
      categorySlug: "eggs-and-curd",
      mrp: 55,
      salePrice: 48,
      unitQuantity: "6 pcs",
      stockCount: 50,
      imageUrl: "/products/farm-eggs-6.webp",
      tags: ["eggs", "protein", "breakfast", "fitness"],
    },
    {
      title: "Epigamia Natural Greek Yogurt",
      slug: "epigamia-natural-greek-yogurt-100g",
      description: "Thick, strained Greek yogurt with 2x protein and low carbohydrate content.",
      categorySlug: "eggs-and-curd",
      mrp: 60,
      salePrice: 55,
      unitQuantity: "100 g",
      stockCount: 35,
      imageUrl: "/products/epigamia-yogurt.webp",
      tags: ["dairy", "curd", "healthy", "protein", "snack"],
    },

    // Chips & Crisps
    {
      title: "Lay's India's Magic Masala Potato Chips",
      slug: "lays-indias-magic-masala-chips-48g",
      description: "Crispy ridge-cut potato chips coated in aromatic Indian spices.",
      categorySlug: "chips-and-crisps",
      mrp: 20,
      salePrice: 20,
      unitQuantity: "48 g",
      stockCount: 95,
      imageUrl: "/products/lays-magic-masala.webp",
      tags: ["chips", "snack", "party", "munchies", "spicy"],
    },
    {
      title: "Bingo! Mad Angles Achaari Masti",
      slug: "bingo-mad-angles-achaari-masti-66g",
      description: "Triangle textured corn chips with a zesty and tangy pickle flavor.",
      categorySlug: "chips-and-crisps",
      mrp: 20,
      salePrice: 18,
      unitQuantity: "66 g",
      stockCount: 80,
      imageUrl: "/products/bingo-mad-angles.webp",
      tags: ["chips", "snack", "tangy", "munchies"],
    },

    // Biscuits & Cookies
    {
      title: "Parle-G Gold Glucose Biscuits",
      slug: "parle-g-gold-glucose-biscuits-1kg",
      description: "India's beloved gold glucose biscuit, fortified with wheat and milk essentials.",
      categorySlug: "biscuits-and-cookies",
      mrp: 140,
      salePrice: 125,
      unitQuantity: "1 kg",
      stockCount: 65,
      imageUrl: "/products/parle-g-gold.webp",
      tags: ["biscuits", "tea-partner", "snack", "family-pack"],
    },
    {
      title: "Oreo Original Vanilla Creme Cookies",
      slug: "oreo-original-vanilla-creme-cookies-120g",
      description: "Rich dark chocolate wafer sandwich cookies filled with smooth sweet vanilla cream.",
      categorySlug: "biscuits-and-cookies",
      mrp: 40,
      salePrice: 36,
      unitQuantity: "120 g",
      stockCount: 90,
      imageUrl: "/products/oreo-vanilla.webp",
      tags: ["cookies", "sweet", "kids", "dessert"],
    },

    // Soft Drinks
    {
      title: "Thums Up Charged Strong Cola",
      slug: "thums-up-charged-bottle-750ml",
      description: "Bold, fizzy, and spicy Indian cola drink served chilled.",
      categorySlug: "soft-drinks",
      mrp: 45,
      salePrice: 40,
      unitQuantity: "750 ml",
      stockCount: 75,
      imageUrl: "/products/thums-up-750ml.webp",
      tags: ["drinks", "cola", "cold-drink", "chilled", "party"],
    },
    {
      title: "Coca-Cola Zero Sugar Refreshing Can",
      slug: "coca-cola-zero-sugar-can-300ml",
      description: "Classic taste of Coca-Cola with zero calories and zero sugar.",
      categorySlug: "soft-drinks",
      mrp: 40,
      salePrice: 38,
      unitQuantity: "300 ml",
      stockCount: 60,
      imageUrl: "/products/coke-zero-can.webp",
      tags: ["drinks", "sugar-free", "cold-drink", "guilt-free"],
    },

    // Fruit Juices
    {
      title: "Real Fruit Power 100% Mixed Fruit Juice",
      slug: "real-fruit-power-mixed-fruit-1l",
      description: "Blend of 9 wholesome fruits packed with vitamin C and natural goodness.",
      categorySlug: "fruit-juices",
      mrp: 130,
      salePrice: 110,
      unitQuantity: "1 Litre",
      stockCount: 40,
      imageUrl: "/products/real-mixed-fruit.webp",
      tags: ["juice", "fruit", "healthy", "breakfast", "immunity"],
    },
    {
      title: "Raw Pressery Cold Pressed Valencia Orange Juice",
      slug: "raw-pressery-valencia-orange-250ml",
      description: "No added sugar, never concentrated, made from handpicked Valencia oranges.",
      categorySlug: "fruit-juices",
      mrp: 90,
      salePrice: 80,
      unitQuantity: "250 ml",
      stockCount: 30,
      imageUrl: "/products/raw-pressery-orange.webp",
      tags: ["juice", "cold-pressed", "premium", "healthy"],
    },

    // Noodles & Pasta
    {
      title: "Maggi 2-Minute Masala Instant Noodles",
      slug: "maggi-2-minute-masala-noodles-4-pack",
      description: "Instant noodles with the signature tastemaker containing 10 authentic spices.",
      categorySlug: "noodles-and-pasta",
      mrp: 60,
      salePrice: 56,
      unitQuantity: "4 Pack (280 g)",
      stockCount: 100,
      imageUrl: "/products/maggi-4pack.webp",
      tags: ["instant-snack", "noodles", "quick-meal", "all-time-favorite"],
    },
    {
      title: "Ching's Secret Schezwan Instant Noodles",
      slug: "chings-schezwan-instant-noodles-240g",
      description: "Fiery Desi Chinese noodles with schezwan pepper and garlic kick.",
      categorySlug: "noodles-and-pasta",
      mrp: 60,
      salePrice: 52,
      unitQuantity: "240 g",
      stockCount: 55,
      imageUrl: "/products/chings-schezwan.webp",
      tags: ["noodles", "spicy", "instant-snack", "desi-chinese"],
    },

    // Ready to Eat
    {
      title: "MTR Ready to Eat Paneer Butter Masala",
      slug: "mtr-paneer-butter-masala-300g",
      description: "Soft cottage cheese simmered in rich cashew, butter and tomato gravy. Just heat and serve.",
      categorySlug: "ready-to-eat",
      mrp: 140,
      salePrice: 125,
      unitQuantity: "300 g",
      stockCount: 35,
      imageUrl: "/products/mtr-paneer-butter-masala.webp",
      tags: ["ready-to-eat", "dinner", "instant-meal", "curry"],
    },
    {
      title: "Tata Sampann Instant Poha Mix",
      slug: "tata-sampann-instant-poha-180g",
      description: "Flattened rice breakfast mix with peanuts and curry leaves, ready in 3 minutes.",
      categorySlug: "ready-to-eat",
      mrp: 65,
      salePrice: 58,
      unitQuantity: "180 g",
      stockCount: 40,
      imageUrl: "/products/tata-sampann-poha.webp",
      tags: ["breakfast", "ready-to-eat", "healthy", "traditional"],
    },
  ];

  for (const item of productsData) {
    const categoryId = subCategoryMap.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Category slug ${item.categorySlug} not found!`);
    }

    await prisma.product.create({
      data: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        categoryId: categoryId,
        mrp: item.mrp,
        salePrice: item.salePrice,
        unitQuantity: item.unitQuantity,
        stockCount: item.stockCount,
        isAvailable: true,
        imageUrl: item.imageUrl,
        tags: item.tags,
      },
    });
  }

  console.log(`✅ Seeded ${productsData.length} dark-store inventory products`);
  console.log("🚀 SabQuick database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
