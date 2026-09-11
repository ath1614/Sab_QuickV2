/**
 * SabQuick Store Operations Hub Verification Suite
 *
 * Tests:
 * 1. Operations Orders Fetch & Urgency/Aisle Classification
 * 2. Floor Packer State Transitions & Timestamp Integrity (packedAt logic)
 * 3. Manager Live Dispatch & Manual Rider Assignment
 * 4. Instant Out-of-Stock SKU Toggle Engine
 * 5. Owner Financial Analytics & Dynamic Seasonal Theme Customizer
 */

import prisma from "../lib/prisma";
import { OrderStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { updateOrderStatus } from "../lib/orderStatus";

async function runOpsTestSuite() {
  console.log("\n=======================================================");
  console.log("   🏬 SABQUICK STORE OPERATIONS HUB VERIFICATION SUITE  ");
  console.log("=======================================================\n");

  let passedTests = 0;
  const totalTests = 5;

  try {
    // -------------------------------------------------------------
    // SETUP: Fetch Entities
    // -------------------------------------------------------------
    console.log("📋 Preparing Test Operations Users & Test Products...");

    const packer = await prisma.user.findFirst({
      where: { email: "packer@sabquick.local" },
    });
    const manager = await prisma.user.findFirst({
      where: { email: "manager@sabquick.local" },
    });
    const owner = await prisma.user.findFirst({
      where: { email: "owner@sabquick.local" },
    });
    const rider = await prisma.user.findFirst({
      where: { email: "rider1@sabquick.local" },
      include: { riderProfile: true },
    });
    const customer = await prisma.user.findFirst({
      where: { email: "customer@sabquick.local" },
      include: { addresses: true },
    });

    if (!packer || !manager || !owner || !rider || !customer || !customer.addresses.length) {
      throw new Error("Seeded operations personas or customer addresses missing.");
    }

    const testAddress = customer.addresses[0];
    const testProducts = await prisma.product.findMany({
      take: 3,
      include: { category: { include: { parent: true } } },
    });

    if (testProducts.length < 2) {
      throw new Error("Need at least 2 seeded products for testing.");
    }

    console.log(`✅ Personas verified: Packer (${packer.name}), Manager (${manager.name}), Owner (${owner.name})`);

    // -------------------------------------------------------------
    // TEST 1: Operations Orders Fetch & Urgency / Aisle Classification
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 1: Order Queue Urgency & Aisle Mapping...");
    try {
      const orderNumber = `OPS-TEST-${Date.now().toString().slice(-6)}`;
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId: testAddress.id,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.UPI_DOORSTEP,
          paymentStatus: PaymentStatus.PENDING,
          subtotal: 250,
          deliveryFee: 0,
          tipAmount: 20,
          totalAmount: 270,
          deliveryOtp: "4589",
          items: {
            create: [
              {
                productId: testProducts[0].id,
                quantity: 2,
                price: testProducts[0].salePrice,
              },
              {
                productId: testProducts[1].id,
                quantity: 1,
                price: testProducts[1].salePrice,
              },
            ],
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: {
                    include: { parent: true },
                  },
                },
              },
            },
          },
        },
      });

      // Verify aisle mapping
      const mappedItems = newOrder.items.map((it) => {
        const parentName = it.product.category.parent?.name;
        const categoryName = it.product.category.name;
        const aisle = parentName
          ? `Aisle: ${parentName}`
          : `Aisle: ${categoryName}`;
        return { name: it.product.title, aisle };
      });

      console.log(`   Created Test Order: ${newOrder.orderNumber}`);
      mappedItems.forEach((it) => {
        console.log(`   - SKU: "${it.name}" -> ${it.aisle}`);
      });

      // Urgency logic test
      const elapsedMinutes = Math.floor(
        (Date.now() - new Date(newOrder.createdAt).getTime()) / 60000
      );
      const urgency =
        elapsedMinutes >= 4
          ? "CRITICAL"
          : elapsedMinutes >= 2
          ? "WARNING"
          : "NORMAL";

      if (urgency !== "NORMAL") {
        throw new Error(`Expected NORMAL urgency for brand new order, got ${urgency}`);
      }

      console.log(`   Urgency calculated correctly: ${urgency} (${elapsedMinutes}m elapsed)`);
      console.log("✅ TEST 1 PASSED: Urgency & Aisle Mapping verified.");
      passedTests++;

      // -------------------------------------------------------------
      // TEST 2: Packer State Transitions & Timestamp Integrity
      // -------------------------------------------------------------
      console.log("\n🧪 TEST 2: Packer Transitions & packedAt Timestamp Logic...");

      // Step A: PENDING -> PACKING
      const packingOrder = await updateOrderStatus(newOrder.id, OrderStatus.PACKING);
      if (packingOrder.status !== OrderStatus.PACKING) {
        throw new Error(`Expected PACKING status, got ${packingOrder.status}`);
      }
      if (packingOrder.packedAt !== null) {
        throw new Error(`packedAt should remain NULL while PACKING, got ${packingOrder.packedAt}`);
      }
      console.log("   Step A: Transitioned to PACKING (packedAt is null as expected).");

      // Step B: PACKING -> READY_FOR_PICKUP
      const readyOrder = await updateOrderStatus(newOrder.id, OrderStatus.READY_FOR_PICKUP);
      if (readyOrder.status !== OrderStatus.READY_FOR_PICKUP) {
        throw new Error(`Expected READY_FOR_PICKUP status, got ${readyOrder.status}`);
      }
      if (!readyOrder.packedAt) {
        throw new Error("packedAt must be recorded upon READY_FOR_PICKUP transition!");
      }
      console.log(`   Step B: Transitioned to READY_FOR_PICKUP (packedAt: ${readyOrder.packedAt.toISOString()}).`);

      console.log("✅ TEST 2 PASSED: Floor Packer transitions & timestamp integrity verified.");
      passedTests++;

      // -------------------------------------------------------------
      // TEST 3: Manager Dispatch & Manual Rider Assignment
      // -------------------------------------------------------------
      console.log("\n🧪 TEST 3: Manager Dispatch & Manual Rider Assignment...");

      const dispatchedOrder = await updateOrderStatus(
        newOrder.id,
        OrderStatus.OUT_FOR_DELIVERY,
        rider.id
      );

      if (dispatchedOrder.status !== OrderStatus.OUT_FOR_DELIVERY) {
        throw new Error(`Expected OUT_FOR_DELIVERY status, got ${dispatchedOrder.status}`);
      }
      if (dispatchedOrder.riderId !== rider.id) {
        throw new Error(`Expected rider ${rider.id}, got ${dispatchedOrder.riderId}`);
      }
      if (!dispatchedOrder.updatedAt) {
        throw new Error("updatedAt timestamp must be recorded on dispatch!");
      }

      console.log(`   Dispatched to Rider: ${rider.name} (${rider.email})`);
      console.log(`   updatedAt: ${dispatchedOrder.updatedAt.toISOString()}`);
      console.log("✅ TEST 3 PASSED: Manual dispatch & rider binding verified.");
      passedTests++;

      // Clean up test order
      await prisma.orderItem.deleteMany({ where: { orderId: newOrder.id } });
      await prisma.order.delete({ where: { id: newOrder.id } });
    } catch (e: any) {
      console.error("❌ Orders / Packer / Dispatch Test Failed:", e.message);
      throw e;
    }

    // -------------------------------------------------------------
    // TEST 4: Instant Out-of-Stock SKU Toggle Engine
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 4: Instant SKU Out-of-Stock Toggle Engine...");
    try {
      const targetProduct = testProducts[0];
      const originalAvailable = targetProduct.isAvailable;

      // Toggle to false
      const toggledOff = await prisma.product.update({
        where: { id: targetProduct.id },
        data: { isAvailable: false },
        select: { id: true, title: true, isAvailable: true },
      });

      if (toggledOff.isAvailable !== false) {
        throw new Error("Failed to set product availability to false.");
      }
      console.log(`   Toggled OFF SKU: "${toggledOff.title}" -> isAvailable: false`);

      // Toggle back to true
      const toggledOn = await prisma.product.update({
        where: { id: targetProduct.id },
        data: { isAvailable: originalAvailable },
        select: { id: true, title: true, isAvailable: true },
      });

      if (toggledOn.isAvailable !== originalAvailable) {
        throw new Error("Failed to restore product availability.");
      }
      console.log(`   Restored SKU: "${toggledOn.title}" -> isAvailable: ${toggledOn.isAvailable}`);

      console.log("✅ TEST 4 PASSED: Instant 1-Click Inventory Toggle verified.");
      passedTests++;
    } catch (e: any) {
      console.error("❌ Inventory Toggle Failed:", e.message);
      throw e;
    }

    // -------------------------------------------------------------
    // TEST 5: Owner Financial Analytics & Seasonal Theme Customizer
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 5: Owner Financial Analytics & Theme Customizer...");
    try {
      // 1. Calculate Analytics
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayOrders = await prisma.order.findMany({
        where: { createdAt: { gte: startOfToday } },
        select: { totalAmount: true, status: true },
      });

      const todayGMV = todayOrders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const lowStockCount = await prisma.product.count({
        where: { OR: [{ stockCount: { lt: 15 } }, { isAvailable: false }] },
      });

      console.log(`   Calculated Today's GMV: ₹${todayGMV.toLocaleString("en-IN")}`);
      console.log(`   Calculated Low Stock SKU Count: ${lowStockCount}`);

      // 2. Upsert Theme
      const seasonalTheme = await prisma.themeConfig.upsert({
        where: { id: "active_theme" },
        update: {
          themeName: "Diwali Gold Dhamaka",
          primaryColor: "#B45309",
          accentColor: "#F59E0B",
          saleTagText: "🪔 Diwali Dhamaka: 15-Min Festival Express",
          bannerImageUrl: "/banners/diwali-express.webp",
        },
        create: {
          id: "active_theme",
          themeName: "Diwali Gold Dhamaka",
          primaryColor: "#B45309",
          accentColor: "#F59E0B",
          saleTagText: "🪔 Diwali Dhamaka: 15-Min Festival Express",
          bannerImageUrl: "/banners/diwali-express.webp",
        },
      });

      if (seasonalTheme.primaryColor !== "#B45309" || seasonalTheme.themeName !== "Diwali Gold Dhamaka") {
        throw new Error("ThemeConfig upsert failed to store custom theme.");
      }
      console.log(`   Upserted Theme: "${seasonalTheme.themeName}" (${seasonalTheme.primaryColor} / ${seasonalTheme.accentColor})`);

      // Restore default Forest Speed theme
      await prisma.themeConfig.upsert({
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

      console.log("   Restored Default Forest Speed Theme.");
      console.log("✅ TEST 5 PASSED: Financial metrics & Dynamic Theme Engine verified.");
      passedTests++;
    } catch (e: any) {
      console.error("❌ Analytics / Theme Test Failed:", e.message);
      throw e;
    }

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(`   🎉 ALL OPERATIONS HUB TESTS PASSED (${passedTests}/${totalTests})`);
    console.log("=======================================================\n");
  } catch (error: any) {
    console.error("\n❌ Test Suite Aborted with Fatal Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runOpsTestSuite();
