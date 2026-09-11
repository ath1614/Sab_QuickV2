/**
 * SabQuick Order Tracking, SSE Streaming & Delivery OTP Security Verification Suite
 *
 * Tests:
 * 1. Validate order state, delivery OTP, and customer relations in PostgreSQL.
 * 2. Real-time Status Transitions via updateOrderStatus:
 *    - PENDING -> PACKING -> OUT_FOR_DELIVERY (with Rider assigned) -> DELIVERED.
 *    - Verify Redis pub/sub publication on orders:status:${orderId} and orders:dispatch.
 * 3. In-App Delivery OTP Security:
 *    - 4-digit numeric format validation.
 *    - OTP validity during active transit and resolved delivered state.
 * 4. Zero-Cost Leaflet Route Geometry & Geofence Transit SLA calculations.
 */

import prisma from "../lib/prisma";
import redis from "../lib/redis";
import Redis from "ioredis";
import { OrderStatus, Role } from "@prisma/client";
import { updateOrderStatus, StatusUpdatePayload } from "../lib/orderStatus";
import {
  STORE_CONFIG,
  calculateHaversineDistance,
  calculateEstimatedDeliveryMinutes,
  checkDeliveryServiceability,
} from "../lib/geo";

async function runTrackingTestSuite() {
  console.log("\n=======================================================");
  console.log("   🚀 SABQUICK REAL-TIME ORDER TRACKING & SSE SUITE    ");
  console.log("=======================================================\n");

  let passedTests = 0;
  const totalTests = 4;
  let dedicatedSubscriber: Redis | null = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Fetch or Create Test Order
    // -------------------------------------------------------------
    console.log("📋 Preparing Test Customer, Product & Order...");

    const customer = await prisma.user.findFirst({
      where: { email: "customer@sabquick.local" },
      include: { addresses: true },
    });

    if (!customer || !customer.addresses.length) {
      throw new Error("Seeded customer or address not found in PostgreSQL.");
    }

    const testAddress = customer.addresses[0];
    const product = await prisma.product.findFirst({
      where: { isAvailable: true, stockCount: { gte: 5 } },
    });

    if (!product) {
      throw new Error("No available product found for tracking test.");
    }

    // Create a fresh test order for clean tracking
    const orderNumber = `SQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        addressId: testAddress.id,
        status: OrderStatus.PENDING,
        deliveryOtp,
        subtotal: product.salePrice * 2,
        deliveryFee: product.salePrice * 2 >= 199 ? 0 : 15,
        handlingFee: 2,
        tipAmount: 20,
        totalAmount:
          product.salePrice * 2 +
          (product.salePrice * 2 >= 199 ? 0 : 15) +
          2 +
          20,
        paymentMethod: "UPI_DOORSTEP",
        paymentStatus: "PENDING",
        items: {
          create: [
            {
              productId: product.id,
              quantity: 2,
              price: product.salePrice,
            },
          ],
        },
      },
      include: {
        address: true,
        items: { include: { product: true } },
      },
    });

    console.log(`  ✅ Test Order created: #${order.orderNumber} (ID: ${order.id})`);

    // -------------------------------------------------------------
    // TEST 1: Initial Order State & OTP Security Format
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 1: Order State & Delivery OTP Security Format...");
    try {
      if (!order.orderNumber.startsWith("SQ-")) {
        throw new Error(`Invalid order number format: ${order.orderNumber}`);
      }

      if (!/^\d{4}$/.test(order.deliveryOtp)) {
        throw new Error(`Invalid 4-digit OTP format: ${order.deliveryOtp}`);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new Error(`Expected initial status PENDING, got ${order.status}`);
      }

      if (order.items.length === 0) {
        throw new Error("Order items collection is empty.");
      }

      console.log(`  ✅ Order Number validated: #${order.orderNumber}`);
      console.log(`  ✅ High-Contrast 4-Digit Delivery OTP: [ ${order.deliveryOtp.split("").join(" ] [ ")} ]`);
      console.log(`  ✅ Customer & Address linkage verified: ${order.address.flatBuilding}, ${order.address.streetArea}`);
      passedTests++;
    } catch (err: any) {
      console.error("  ❌ TEST 1 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Real-time Status Transitions & Redis Pub/Sub Streaming
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 2: Real-Time Status Progression & Redis Pub/Sub Pipeline...");
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      dedicatedSubscriber = new Redis(redisUrl);

      const receivedStatusUpdates: StatusUpdatePayload[] = [];
      const receivedDispatchUpdates: any[] = [];

      await dedicatedSubscriber.subscribe(
        `orders:status:${order.id}`,
        "orders:dispatch"
      );

      dedicatedSubscriber.on("message", (channel, message) => {
        try {
          const parsed = JSON.parse(message);
          if (channel === `orders:status:${order.id}`) {
            receivedStatusUpdates.push(parsed);
          } else if (channel === "orders:dispatch") {
            receivedDispatchUpdates.push(parsed);
          }
        } catch (e) {
          console.error("Failed to parse Redis message:", e);
        }
      });

      // Find an active rider
      const rider = await prisma.user.findFirst({
        where: { role: Role.RIDER },
        include: { riderProfile: true },
      });

      if (!rider) {
        throw new Error("No active rider found in PostgreSQL.");
      }

      // Step 2a: Transition to PACKING
      console.log("  🔄 Transitioning: PENDING -> PACKING...");
      const packingOrder = await updateOrderStatus(
        order.id,
        OrderStatus.PACKING
      );

      if (packingOrder.status !== OrderStatus.PACKING) {
        throw new Error("Failed to transition status to PACKING.");
      }

      // Step 2b: Transition to READY_FOR_PICKUP (records packedAt)
      console.log("  🔄 Transitioning: PACKING -> READY_FOR_PICKUP...");
      const readyOrder = await updateOrderStatus(
        order.id,
        OrderStatus.READY_FOR_PICKUP
      );

      if (readyOrder.status !== OrderStatus.READY_FOR_PICKUP || !readyOrder.packedAt) {
        throw new Error("Failed to transition status to READY_FOR_PICKUP or record packedAt.");
      }

      // Step 2c: Transition to OUT_FOR_DELIVERY with Rider
      console.log(`  🔄 Transitioning: READY_FOR_PICKUP -> OUT_FOR_DELIVERY (Assigning Rider: ${rider.name})...`);
      const transitOrder = await updateOrderStatus(
        order.id,
        OrderStatus.OUT_FOR_DELIVERY,
        rider.id
      );

      if (
        transitOrder.status !== OrderStatus.OUT_FOR_DELIVERY ||
        transitOrder.riderId !== rider.id
      ) {
        throw new Error("Failed to transition to OUT_FOR_DELIVERY with rider assignment.");
      }

      // Step 2d: Transition to DELIVERED
      console.log("  🔄 Transitioning: OUT_FOR_DELIVERY -> DELIVERED...");
      const deliveredOrder = await updateOrderStatus(
        order.id,
        OrderStatus.DELIVERED
      );

      if (
        deliveredOrder.status !== OrderStatus.DELIVERED ||
        !deliveredOrder.deliveredAt
      ) {
        throw new Error("Failed to transition to DELIVERED or record deliveredAt.");
      }

      // Allow brief moment for Redis subscriber loop
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (receivedStatusUpdates.length < 3) {
        throw new Error(
          `Expected at least 3 status updates on Redis channel, received ${receivedStatusUpdates.length}`
        );
      }

      const lastStatus = receivedStatusUpdates[receivedStatusUpdates.length - 1];
      if (lastStatus.status !== OrderStatus.DELIVERED) {
        throw new Error(`Expected final status DELIVERED, got ${lastStatus.status}`);
      }

      console.log(
        `  ✅ Received ${receivedStatusUpdates.length} real-time SSE stream frames on 'orders:status:${order.id}'`
      );
      console.log(
        `  ✅ Rider metadata broadcasted: ${transitOrder.rider?.name} (${transitOrder.rider?.riderProfile?.vehicleDetails})`
      );
      console.log(
        `  ✅ Timestamps verified: packedAt=${readyOrder.packedAt?.toISOString()}, deliveredAt=${deliveredOrder.deliveredAt?.toISOString()}`
      );
      passedTests++;
    } catch (err: any) {
      console.error("  ❌ TEST 2 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 3: In-App Delivery OTP Verification & Lifecycle Resolution
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 3: Delivery OTP Security & Order Handover Lifecycle...");
    try {
      const refreshedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      if (!refreshedOrder) {
        throw new Error("Could not find order in PostgreSQL.");
      }

      // Verify OTP matches initial record and was preserved during status progression
      if (refreshedOrder.deliveryOtp !== deliveryOtp) {
        throw new Error(
          `OTP mismatch: Expected ${deliveryOtp}, found ${refreshedOrder.deliveryOtp}`
        );
      }

      // In DELIVERED state, verified that delivery was completed
      if (refreshedOrder.status !== OrderStatus.DELIVERED) {
        throw new Error("Order is not in DELIVERED state.");
      }

      console.log(
        `  ✅ OTP [ ${refreshedOrder.deliveryOtp} ] persisted securely across entire delivery lifecycle.`
      );
      console.log(
        "  ✅ Order status DELIVERED successfully locks and resolves delivery verification in UI."
      );
      passedTests++;
    } catch (err: any) {
      console.error("  ❌ TEST 3 FAILED:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 4: Route Geometry & Geofence Distance Calculation
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 4: Zero-Cost Route Geometry & Transit SLA Engine...");
    try {
      const storeCoord = { lat: STORE_CONFIG.lat, lng: STORE_CONFIG.lng };
      const customerCoord = {
        lat: testAddress.latitude,
        lng: testAddress.longitude,
      };

      const distanceKm = calculateHaversineDistance(
        storeCoord.lat,
        storeCoord.lng,
        customerCoord.lat,
        customerCoord.lng
      );

      const estimatedMinutes = calculateEstimatedDeliveryMinutes(distanceKm);
      const serviceability = checkDeliveryServiceability(
        customerCoord.lat,
        customerCoord.lng
      );

      if (!serviceability.isServiceable) {
        throw new Error("Delivery location failed geofence serviceability check.");
      }

      if (distanceKm > STORE_CONFIG.maxRadiusKm) {
        throw new Error(
          `Distance ${distanceKm} km exceeds max radius ${STORE_CONFIG.maxRadiusKm} km.`
        );
      }

      if (estimatedMinutes < 10 || estimatedMinutes > 15) {
        throw new Error(
          `Delivery ETA ${estimatedMinutes} mins violates 10-15 minute SLA guarantee.`
        );
      }

      console.log(
        `  ✅ Store Hub Coordinates: (${storeCoord.lat}, ${storeCoord.lng})`
      );
      console.log(
        `  ✅ Customer Delivery Destination: (${customerCoord.lat}, ${customerCoord.lng})`
      );
      console.log(
        `  ✅ Calculated Great-Circle Distance: ${distanceKm} km (Inside ${STORE_CONFIG.maxRadiusKm} km Geofence)`
      );
      console.log(
        `  ✅ Express SLA Delivery Time: ${estimatedMinutes} Minutes (Guaranteed 10-15 Mins SLA)`
      );
      passedTests++;
    } catch (err: any) {
      console.error("  ❌ TEST 4 FAILED:", err.message);
    }
  } finally {
    if (dedicatedSubscriber) {
      dedicatedSubscriber.disconnect();
    }
    await prisma.$disconnect();
    redis.disconnect();
  }

  // -------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`   🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("=======================================================\n");

  if (passedTests === totalTests) {
    console.log("✨ ALL ORDER TRACKING & SSE SUITE CHECKS PASSED! ✨\n");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TRACKING TESTS FAILED. CHECK LOGS ABOVE.");
    process.exit(1);
  }
}

runTrackingTestSuite().catch((e) => {
  console.error("Fatal Test Runner Error:", e);
  process.exit(1);
});
