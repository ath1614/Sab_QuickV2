import { buildUpiUri, getIosUpiUri, POPULAR_UPI_APPS } from "../lib/upi";
import prisma from "../lib/prisma";
import { ensureDatabaseSchema } from "../lib/db-self-heal";
import { sendOrderStatusPushNotification, sendNewOrderStaffAlert } from "../lib/notifications";
import { OrderStatus, Role } from "@prisma/client";

async function runVerification() {
  console.log("=================================================");
  console.log("🧪 VERIFYING PUSH NOTIFICATIONS & NATIVE UPI FLOW");
  console.log("=================================================\n");

  // 1. Verify UPI URI generation for Android & iOS
  console.log("📱 [Test 1] Testing Native UPI URI & Scheme Generation...");
  const orderNumber = "SQ-TEST-8899";
  const amount = 249.5;
  const baseUpiUri = buildUpiUri({ orderNumber, amount });

  if (!baseUpiUri.startsWith("upi://pay?")) {
    throw new Error(`Invalid base UPI URI: ${baseUpiUri}`);
  }
  console.log("  ✓ Base UPI URI:", baseUpiUri);

  // Check Android packages
  const gpayApp = POPULAR_UPI_APPS.find((a) => a.id === "gpay");
  const phonepeApp = POPULAR_UPI_APPS.find((a) => a.id === "phonepe");
  const paytmApp = POPULAR_UPI_APPS.find((a) => a.id === "paytm");

  if (!gpayApp?.packageName || !phonepeApp?.packageName || !paytmApp?.packageName) {
    throw new Error("Missing Android package names for popular UPI apps");
  }
  console.log("  ✓ Android Intent Packages verified (GPay, PhonePe, Paytm)");

  // Check iOS scheme transformations
  const phonepeIosUri = getIosUpiUri(baseUpiUri, "phonepe");
  const gpayIosUri = getIosUpiUri(baseUpiUri, "gpay");
  const paytmIosUri = getIosUpiUri(baseUpiUri, "paytm");

  if (!phonepeIosUri.startsWith("phonepe://pay?")) {
    throw new Error(`Invalid PhonePe iOS URI: ${phonepeIosUri}`);
  }
  if (!gpayIosUri.startsWith("tez://upi/pay?")) {
    throw new Error(`Invalid GPay iOS URI: ${gpayIosUri}`);
  }
  if (!paytmIosUri.startsWith("paytmmp://pay?")) {
    throw new Error(`Invalid Paytm iOS URI: ${paytmIosUri}`);
  }
  console.log("  ✓ iOS Schemes verified: phonepe://, tez://, paytmmp://");

  // 2. Verify Database Self-Healing for DeviceToken
  console.log("\n🗄️  [Test 2] Testing PostgreSQL DeviceToken Schema Self-Healing...");
  await ensureDatabaseSchema();
  console.log("  ✓ Database schema self-heal executed successfully");

  // 3. Test Device Token Upsert and Queries
  console.log("\n📲 [Test 3] Testing DeviceToken Registration...");
  // Find or create test customer
  let testUser = await prisma.user.findFirst({
    where: { role: Role.CUSTOMER },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        name: "Test Push Customer",
        phone: "9109012345",
        phoneVerified: true,
        role: Role.CUSTOMER,
      },
    });
  }

  const dummyToken = `fcm_test_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Register dummy device token
  const deviceToken = await prisma.deviceToken.upsert({
    where: { token: dummyToken },
    update: {
      userId: testUser.id,
      platform: "ANDROID",
      deviceModel: "Pixel 8 Pro",
    },
    create: {
      userId: testUser.id,
      token: dummyToken,
      platform: "ANDROID",
      deviceModel: "Pixel 8 Pro",
    },
  });

  if (!deviceToken || deviceToken.token !== dummyToken) {
    throw new Error("DeviceToken upsert failed");
  }
  console.log("  ✓ DeviceToken registered in PostgreSQL with ID:", deviceToken.id);

  // 4. Test Notification Dispatch Handler logic
  console.log("\n🔔 [Test 4] Testing Notification Dispatch Engine...");
  
  // Create dummy order to test order notification logic
  const testOrder = await prisma.order.findFirst({
    where: { customerId: testUser.id },
  });

  if (testOrder) {
    console.log(`  ✓ Testing sendOrderStatusPushNotification for Order #${testOrder.orderNumber}...`);
    // Should run gracefully without throwing uncaught exceptions even in test environment
    await sendOrderStatusPushNotification(testOrder.id, OrderStatus.CONFIRMED);
    console.log("  ✓ sendOrderStatusPushNotification completed gracefully");
  }

  console.log("  ✓ Testing sendNewOrderStaffAlert for store operations...");
  await sendNewOrderStaffAlert({
    id: "test-order-id",
    orderNumber: "SQ-TEST-1234",
    totalAmount: 199,
    itemCount: 3,
  });
  console.log("  ✓ sendNewOrderStaffAlert completed gracefully");

  // Clean up dummy token
  await prisma.deviceToken.deleteMany({
    where: { token: dummyToken },
  });
  console.log("  ✓ Test cleanup completed");

  console.log("\n=================================================");
  console.log("🎉 ALL PUSH NOTIFICATION & UPI TESTS PASSED!");
  console.log("=================================================");
}

runVerification()
  .catch((err) => {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
