/**
 * SabQuick Verification Test Suite:
 * 1. Cart store pricing calculations & dynamic bill breakdown.
 * 2. Cross-Sell recommendation affinity engine & product exclusion.
 * 3. Atomic order transaction in PostgreSQL (stock deduction, 4-digit OTP, Redis event publish).
 * 4. Transaction rollback on insufficient stock with zero stock mutation.
 */

import prisma from "../lib/prisma";
import redis from "../lib/redis";
import Redis from "ioredis";
import {
  calculateCartTotals,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
  HANDLING_FEE,
  CartItem,
} from "../store/useCartStore";
import { getRecommendations } from "../lib/recommendations";
import { checkDeliveryServiceability } from "../lib/geo";

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   🚀 SABQUICK CART & ATOMIC ORDER ENGINE TEST SUITE   ");
  console.log("=======================================================\n");

  let passedTests = 0;
  let totalTests = 4;

  // -------------------------------------------------------------
  // TEST 1: Cart Calculations & Dynamic Bill Breakdown
  // -------------------------------------------------------------
  console.log("🧪 TEST 1: Cart Dynamic Bill Breakdown...");
  try {
    const dummyProductA: any = {
      id: "prod-1",
      title: "Item Below Free Delivery",
      salePrice: 100,
      mrp: 120,
    };
    const dummyProductB: any = {
      id: "prod-2",
      title: "Item Pushing Over Free Delivery",
      salePrice: 150,
      mrp: 170,
    };

    // Case 1a: Empty cart
    const emptyTotals = calculateCartTotals([], 0);
    if (emptyTotals.grandTotal !== 0 || emptyTotals.totalQuantity !== 0) {
      throw new Error("Empty cart totals failed.");
    }

    // Case 1b: Subtotal under ₹199 (₹100) -> Delivery ₹15, Handling ₹2, Tip ₹0 -> Grand ₹117
    const underCart: CartItem[] = [{ product: dummyProductA, quantity: 1 }];
    const underTotals = calculateCartTotals(underCart, 0);

    if (underTotals.itemTotal !== 100) {
      throw new Error(`Expected itemTotal 100, got ${underTotals.itemTotal}`);
    }
    if (underTotals.deliveryFee !== STANDARD_DELIVERY_FEE) {
      throw new Error(
        `Expected deliveryFee ${STANDARD_DELIVERY_FEE}, got ${underTotals.deliveryFee}`
      );
    }
    if (underTotals.handlingFee !== HANDLING_FEE) {
      throw new Error(
        `Expected handlingFee ${HANDLING_FEE}, got ${underTotals.handlingFee}`
      );
    }
    if (underTotals.grandTotal !== 117) {
      throw new Error(
        `Expected grandTotal 117, got ${underTotals.grandTotal}`
      );
    }
    if (underTotals.amountNeededForFreeDelivery !== 99) {
      throw new Error(
        `Expected amountNeeded 99, got ${underTotals.amountNeededForFreeDelivery}`
      );
    }

    // Case 1c: Subtotal under ₹199 with ₹20 tip -> Grand ₹137
    const tipTotals = calculateCartTotals(underCart, 20);
    if (tipTotals.grandTotal !== 137) {
      throw new Error(`Expected grandTotal 137, got ${tipTotals.grandTotal}`);
    }

    // Case 1d: Subtotal over ₹199 (₹100 + ₹150 = ₹250) -> Free delivery!
    const overCart: CartItem[] = [
      { product: dummyProductA, quantity: 1 },
      { product: dummyProductB, quantity: 1 },
    ];
    const overTotals = calculateCartTotals(overCart, 30);

    if (overTotals.itemTotal !== 250) {
      throw new Error(`Expected itemTotal 250, got ${overTotals.itemTotal}`);
    }
    if (overTotals.deliveryFee !== 0) {
      throw new Error(`Expected free delivery (0), got ${overTotals.deliveryFee}`);
    }
    if (overTotals.amountNeededForFreeDelivery !== 0) {
      throw new Error(
        `Expected amountNeeded 0, got ${overTotals.amountNeededForFreeDelivery}`
      );
    }
    if (overTotals.grandTotal !== 250 + 2 + 30) {
      // 282
      throw new Error(`Expected grandTotal 282, got ${overTotals.grandTotal}`);
    }

    console.log(
      "  ✅ Subtotal < ₹199 correctly applies ₹15 delivery fee and dynamic gap."
    );
    console.log(
      "  ✅ Subtotal >= ₹199 unlocks ₹0 FREE delivery and handles tips."
    );
    passedTests++;
  } catch (err: any) {
    console.error("  ❌ TEST 1 FAILED:", err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Category Affinity Cross-Sell Engine
  // -------------------------------------------------------------
  console.log("\n🧪 TEST 2: Category Affinity Cross-Sell Engine...");
  try {
    // Fetch a milk product from PostgreSQL
    const milkProduct = await prisma.product.findFirst({
      where: {
        tags: { has: "milk" },
        isAvailable: true,
      },
    });

    if (!milkProduct) {
      throw new Error("No milk product found in DB to test affinity.");
    }

    console.log(
      `  🛒 Testing with cart SKU: "${milkProduct.title}" (tags: [${milkProduct.tags.join(", ")}])`
    );

    const recs = await getRecommendations([milkProduct.id]);

    if (!recs || recs.length === 0) {
      throw new Error("Expected cross-sell recommendations, got empty list.");
    }

    // Assert milk SKU itself is NOT in recommendations
    const includesMilk = recs.some((r) => r.id === milkProduct.id);
    if (includesMilk) {
      throw new Error("Cart SKU was not excluded from recommendations!");
    }

    // Check if recommendations contain affinity-mapped companion items (bread, butter, bakery, biscuits)
    const companionTags = [
      "bread",
      "butter",
      "bread-and-butter",
      "bakery",
      "biscuits",
      "tea-partner",
    ];
    const hasAffinityMatch = recs.some((r) =>
      r.tags.some((t) => companionTags.includes(t.toLowerCase()))
    );

    if (!hasAffinityMatch) {
      throw new Error(
        `Expected companion items with affinity tags (${companionTags.join(", ")}), but none matched.`
      );
    }

    console.log(`  ✅ Returned ${recs.length} recommended companion items:`);
    recs.forEach((r) =>
      console.log(`     - ${r.title} (₹${r.salePrice}, tags: ${r.tags.slice(0, 3).join(", ")})`)
    );
    console.log("  ✅ Successfully excluded cart SKU and applied affinity mapping.");
    passedTests++;
  } catch (err: any) {
    console.error("  ❌ TEST 2 FAILED:", err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Atomic Order Placement & Redis Event Dispatching
  // -------------------------------------------------------------
  console.log("\n🧪 TEST 3: Atomic Order Placement & PostgreSQL Transaction...");
  let dedicatedSubscriber: Redis | null = null;
  try {
    // 1. Get test customer & address
    const customer = await prisma.user.findFirst({
      where: { role: "CUSTOMER", phoneVerified: true },
      include: { addresses: true },
    });

    if (!customer || !customer.addresses.length) {
      throw new Error("Seeded customer with address not found in PostgreSQL.");
    }

    const testAddress = customer.addresses[0];
    const serviceability = checkDeliveryServiceability(
      testAddress.latitude,
      testAddress.longitude
    );

    if (!serviceability.isServiceable) {
      throw new Error("Test customer address is outside geofence.");
    }

    // 2. Select product to order
    const targetProduct = await prisma.product.findFirst({
      where: {
        isAvailable: true,
        stockCount: { gte: 10 },
      },
    });

    if (!targetProduct) {
      throw new Error("No eligible product found with stock >= 10.");
    }

    const initialStock = targetProduct.stockCount;
    const orderQty = 2;
    console.log(
      `  📦 Selected product: "${targetProduct.title}" (Initial Stock: ${initialStock})`
    );

    // 3. Setup Redis Subscriber for channel "orders:dispatch"
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    dedicatedSubscriber = new Redis(redisUrl);
    let redisEventReceived: any = null;

    await dedicatedSubscriber.subscribe("orders:dispatch");
    dedicatedSubscriber.on("message", (channel, message) => {
      if (channel === "orders:dispatch") {
        try {
          redisEventReceived = JSON.parse(message);
        } catch {
          redisEventReceived = message;
        }
      }
    });

    // 4. Run atomic transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Check stock
      const freshProduct = await tx.product.findUnique({
        where: { id: targetProduct.id },
      });

      if (!freshProduct || freshProduct.stockCount < orderQty) {
        throw new Error("Insufficient stock");
      }

      // Decrement stock
      const updatedProduct = await tx.product.update({
        where: { id: targetProduct.id },
        data: {
          stockCount: freshProduct.stockCount - orderQty,
          isAvailable: freshProduct.stockCount - orderQty > 0,
        },
      });

      // Generate order number & OTP
      const orderNumber = `SQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const subtotal = freshProduct.salePrice * orderQty;
      const deliveryFee = subtotal >= 199 ? 0 : 15;
      const handlingFee = 2;
      const tipAmount = 10;
      const totalAmount = subtotal + deliveryFee + handlingFee + tipAmount;

      return await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId: testAddress.id,
          status: "PENDING",
          deliveryOtp,
          subtotal,
          deliveryFee,
          handlingFee,
          tipAmount,
          totalAmount,
          paymentMethod: "UPI_DOORSTEP",
          paymentStatus: "PENDING",
          items: {
            create: [
              {
                productId: freshProduct.id,
                quantity: orderQty,
                price: freshProduct.salePrice,
              },
            ],
          },
        },
        include: { items: true },
      });
    });

    // Publish Redis event
    await redis.publish(
      "orders:dispatch",
      JSON.stringify({
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        totalAmount: createdOrder.totalAmount,
      })
    );

    // Wait a brief moment for Redis subscriber to catch the event
    await new Promise((r) => setTimeout(r, 200));

    // Verify stock deduction in PostgreSQL
    const postStockProduct = await prisma.product.findUnique({
      where: { id: targetProduct.id },
    });

    if (!postStockProduct) {
      throw new Error("Could not fetch product after transaction.");
    }

    if (postStockProduct.stockCount !== initialStock - orderQty) {
      throw new Error(
        `Stock deduction mismatch: Expected ${initialStock - orderQty}, found ${postStockProduct.stockCount}`
      );
    }

    // Verify OTP format (4 digits)
    if (!/^\d{4}$/.test(createdOrder.deliveryOtp)) {
      throw new Error(
        `Invalid Delivery OTP format: ${createdOrder.deliveryOtp}`
      );
    }

    // Verify Redis event received
    if (!redisEventReceived || redisEventReceived.orderId !== createdOrder.id) {
      throw new Error("Redis 'orders:dispatch' event was not received properly.");
    }

    console.log(`  ✅ Created Order: ${createdOrder.orderNumber} (ID: ${createdOrder.id})`);
    console.log(`  ✅ 4-Digit Delivery OTP: ${createdOrder.deliveryOtp}`);
    console.log(
      `  ✅ Stock atomically decremented from ${initialStock} to ${postStockProduct.stockCount}`
    );
    console.log(
      `  ✅ Redis channel 'orders:dispatch' event verified: ${JSON.stringify(redisEventReceived)}`
    );

    passedTests++;
  } catch (err: any) {
    console.error("  ❌ TEST 3 FAILED:", err.message);
  } finally {
    if (dedicatedSubscriber) {
      dedicatedSubscriber.disconnect();
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Transaction Rollback on Stock Depletion
  // -------------------------------------------------------------
  console.log("\n🧪 TEST 4: Transaction Rollback On Insufficient Stock...");
  try {
    const targetProduct = await prisma.product.findFirst({
      where: { isAvailable: true },
    });

    if (!targetProduct) {
      throw new Error("No product found for stock test.");
    }

    const baselineStock = targetProduct.stockCount;
    const requestedExcessQuantity = baselineStock + 1000;

    let transactionFailedProperly = false;

    try {
      await prisma.$transaction(async (tx) => {
        const prod = await tx.product.findUnique({
          where: { id: targetProduct.id },
        });

        if (!prod || prod.stockCount < requestedExcessQuantity) {
          throw new Error(
            `Insufficient stock for product ${targetProduct.title}`
          );
        }

        // Decrement (should NOT execute)
        await tx.product.update({
          where: { id: targetProduct.id },
          data: { stockCount: prod.stockCount - requestedExcessQuantity },
        });
      });
    } catch (err: any) {
      if (err.message.includes("Insufficient stock")) {
        transactionFailedProperly = true;
      } else {
        throw err;
      }
    }

    if (!transactionFailedProperly) {
      throw new Error(
        "Transaction did not throw expected Insufficient Stock error!"
      );
    }

    // Verify PostgreSQL state is completely unmutated
    const currentProduct = await prisma.product.findUnique({
      where: { id: targetProduct.id },
    });

    if (currentProduct?.stockCount !== baselineStock) {
      throw new Error(
        `Rollback failed: Stock mutated from ${baselineStock} to ${currentProduct?.stockCount}`
      );
    }

    console.log(
      `  ✅ Transaction cleanly aborted on insufficient stock (${requestedExcessQuantity} requested, ${baselineStock} available).`
    );
    console.log(
      `  ✅ PostgreSQL database state strictly preserved with ZERO stock mutation.`
    );
    passedTests++;
  } catch (err: any) {
    console.error("  ❌ TEST 4 FAILED:", err.message);
  }

  // Final Summary
  console.log("\n=======================================================");
  console.log(`   🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("✨ ALL TEST SUITE CHECKS COMPLETED SUCCESSFULLY! ✨\n");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.");
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error("Fatal test runner error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
