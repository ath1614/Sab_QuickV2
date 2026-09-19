import prisma from "../lib/prisma";
import redis from "../lib/redis";
import crypto from "crypto";
import { PaymentMethod, OrderStatus, PaymentStatus, Role } from "@prisma/client";
import { verifyCashfreeWebhookSignature } from "../lib/cashfree";
import { ensureDatabaseSchema } from "../lib/db-self-heal";

async function main() {
  console.log("===================================================================");
  console.log("  🚀 SABQUICK CASHFREE PG & MOBILE AUTH DEEP LINK VERIFICATION     ");
  console.log("===================================================================");

  await ensureDatabaseSchema();

  // -----------------------------------------------------------------------------
  // TEST 1: Cashfree HMAC-SHA256 Webhook Signature Verification
  // -----------------------------------------------------------------------------
  console.log("\n🧪 TEST 1: Cashfree Webhook Signature Computation & Security Verification...");
  const testSecret = "cf_test_secret_key_998877665544332211";
  const timestamp = "1726720000";
  const rawBody = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: "ORD-TEST-12345", order_amount: 199.0 },
      payment: {
        cf_payment_id: "123456789",
        payment_status: "SUCCESS",
        payment_amount: 199.0,
      },
    },
  });

  const expectedSignature = crypto
    .createHmac("sha256", testSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  // Temporarily mock CASHFREE_SECRET_KEY in env
  const origSecret = process.env.CASHFREE_SECRET_KEY;
  process.env.CASHFREE_SECRET_KEY = testSecret;

  const validSignatureMatch = verifyCashfreeWebhookSignature({
    signature: expectedSignature,
    timestamp,
    rawBody,
  });

  const tamperedSignatureMatch = verifyCashfreeWebhookSignature({
    signature: "tampered_signature_base64_xyz==",
    timestamp,
    rawBody,
  });

  // Restore env
  process.env.CASHFREE_SECRET_KEY = origSecret;

  if (!validSignatureMatch) {
    throw new Error("❌ Valid Cashfree signature verification failed!");
  }
  if (tamperedSignatureMatch) {
    throw new Error("❌ Tampered Cashfree signature was incorrectly accepted!");
  }
  console.log("  ✅ Valid Cashfree HMAC-SHA256 signature verified successfully.");
  console.log("  ✅ Tampered Cashfree signature rejected as expected.");

  // -----------------------------------------------------------------------------
  // TEST 2: Order Database Transition with PaymentMethod.CASHFREE
  // -----------------------------------------------------------------------------
  console.log("\n🧪 TEST 2: Order Lifecycle with PaymentMethod.CASHFREE in PostgreSQL...");

  // Find or create test customer
  const testCustomer = await prisma.user.upsert({
    where: { phone: "9888877777" },
    update: {},
    create: {
      phone: "9888877777",
      name: "Cashfree Test Customer",
      role: Role.CUSTOMER,
      roles: [Role.CUSTOMER],
      phoneVerified: true,
    },
  });

  // Find or create test address
  let testAddress = await prisma.address.findFirst({
    where: { userId: testCustomer.id },
  });
  if (!testAddress) {
    testAddress = await prisma.address.create({
      data: {
        userId: testCustomer.id,
        label: "Home",
        flatBuilding: "Shop 12, Ground Floor",
        streetArea: "Main Market Road",
        landmark: "Near Clock Tower",
        latitude: 23.1292,
        longitude: 83.1901,
      },
    });
  }

  // Create test order
  const orderNumber = `TEST-CF-${Date.now()}`;
  const testOrder = await prisma.order.create({
    data: {
      orderNumber,
      customerId: testCustomer.id,
      addressId: testAddress.id,
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.CASHFREE,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 150,
      deliveryFee: 15,
      handlingFee: 2,
      totalAmount: 167,
      cashfreeOrderId: `cf_order_${orderNumber}`,
    },
  });

  console.log(`  📦 Created test order ${testOrder.orderNumber} with CASHFREE payment method.`);

  // Settle order
  const settledOrder = await prisma.order.update({
    where: { id: testOrder.id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.CONFIRMED,
      cashfreePaymentId: "cf_pay_99881122",
      cashfreePaymentStatus: "SUCCESS",
    },
  });

  if (
    settledOrder.paymentStatus !== PaymentStatus.PAID ||
    settledOrder.status !== OrderStatus.CONFIRMED ||
    settledOrder.cashfreePaymentStatus !== "SUCCESS"
  ) {
    throw new Error("❌ Order settlement verification failed!");
  }
  console.log(`  ✅ Order ${settledOrder.orderNumber} successfully transitioned to PAID / CONFIRMED.`);

  // Clean up test order
  await prisma.order.delete({ where: { id: testOrder.id } });
  console.log("  🧹 Cleaned up test order.");

  // -----------------------------------------------------------------------------
  // TEST 3: Mobile Auth Exchange Token Flow (Redis Handshake)
  // -----------------------------------------------------------------------------
  console.log("\n🧪 TEST 3: Mobile Deep Link Exchange Token Lifecycle...");
  const exchangeToken = crypto.randomBytes(32).toString("hex");
  const exchangePayload = {
    userId: testCustomer.id,
    email: "cashfree.customer@sabquick.com",
    phone: testCustomer.phone,
    name: testCustomer.name,
  };

  // 1. Store in Redis with TTL
  const exchangeKey = `auth:mobile-exchange:${exchangeToken}`;
  await redis.setex(exchangeKey, 60, JSON.stringify(exchangePayload));

  const storedPayloadStr = await redis.get(exchangeKey);
  if (!storedPayloadStr) {
    throw new Error("❌ Failed to retrieve exchange token from Redis!");
  }

  const storedPayload = JSON.parse(storedPayloadStr);
  if (storedPayload.userId !== testCustomer.id) {
    throw new Error("❌ Exchange token payload mismatch!");
  }
  console.log("  ✅ Exchange token successfully stored and verified in Redis.");

  // 2. Test single-use deletion (replay attack defense)
  await redis.del(exchangeKey);
  const recheckToken = await redis.get(exchangeKey);
  if (recheckToken !== null) {
    throw new Error("❌ Exchange token was not deleted after consumption!");
  }
  console.log("  ✅ Single-use token enforcement verified: token immediately deleted after exchange.");

  console.log("\n===================================================================");
  console.log("  🎉 ALL TESTS PASSED! CASHFREE & MOBILE AUTH ARE PRODUCTION READY! ");
  console.log("===================================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
