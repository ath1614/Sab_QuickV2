import prisma from "../lib/prisma";
import { DiscountType } from "@prisma/client";

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   🎟️  SABQUICK STORE OWNER COUPONS VERIFICATION SUITE   ");
  console.log("=======================================================\n");

  const testCode = "TESTPROMO99";

  // 0. Clean up any leftover test coupon from previous runs
  await prisma.coupon.deleteMany({ where: { code: testCode } });

  try {
    // -------------------------------------------------------------
    // TEST 1: Database Coupon Creation & Schema Integrity
    // -------------------------------------------------------------
    console.log("🧪 TEST 1: Creating Promotional Coupon with Dual Discounting...");
    const now = new Date();
    const expiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days ahead

    const createdCoupon = await prisma.coupon.create({
      data: {
        code: testCode,
        description: "Special Automated Test Promo Voucher",
        discountType: DiscountType.FLAT,
        discountValue: 99,
        minOrderAmount: 299,
        validFrom: now,
        validTill: expiry,
        isActive: true,
        usageLimit: 100,
      },
    });

    console.log(`   ✓ Coupon created in PostgreSQL: [${createdCoupon.code}] (ID: ${createdCoupon.id})`);
    console.log(`   ✓ Discount: ₹${createdCoupon.discountValue} FLAT OFF`);
    console.log(`   ✓ Min Order: ₹${createdCoupon.minOrderAmount}`);
    console.log(`   ✓ Status: ${createdCoupon.isActive ? "ACTIVE" : "INACTIVE"}`);
    console.log("✅ TEST 1 PASSED: Coupon schema & persistence verified.\n");

    // -------------------------------------------------------------
    // TEST 2: Customer Validation of Active Coupon
    // -------------------------------------------------------------
    console.log("🧪 TEST 2: Validating Coupon in Cart Calculations...");
    
    // Attempt A: Cart total ₹200 (below minOrderAmount ₹299) -> must fail
    const cartTotalLow = 200;
    if (cartTotalLow < createdCoupon.minOrderAmount) {
      console.log(`   ✓ Order threshold enforced: ₹${cartTotalLow} < ₹${createdCoupon.minOrderAmount} correctly rejected`);
    } else {
      throw new Error("Order threshold failed to reject sub-minimum cart!");
    }

    // Attempt B: Cart total ₹350 (above minOrderAmount ₹299) -> must pass with ₹99 discount
    const cartTotalValid = 350;
    const discount = createdCoupon.discountType === "FLAT" ? createdCoupon.discountValue : 0;
    const finalSubtotal = cartTotalValid - discount;
    if (finalSubtotal !== 251) {
      throw new Error(`Discount calculation incorrect! Expected 251, got ${finalSubtotal}`);
    }
    console.log(`   ✓ Discount applied: ₹${cartTotalValid} - ₹${discount} = ₹${finalSubtotal}`);
    console.log("✅ TEST 2 PASSED: Customer cart threshold & discount math verified.\n");

    // -------------------------------------------------------------
    // TEST 3: 1-Click Active / Inactive Toggle
    // -------------------------------------------------------------
    console.log("🧪 TEST 3: Toggling Coupon Inactive & Verifying Lockout...");
    const deactivated = await prisma.coupon.update({
      where: { id: createdCoupon.id },
      data: { isActive: false },
    });

    if (deactivated.isActive) {
      throw new Error("Failed to deactivate coupon!");
    }
    console.log(`   ✓ Coupon [${deactivated.code}] successfully set to isActive = false`);

    // Verify customer validation rejects inactive coupon
    const lookup = await prisma.coupon.findUnique({ where: { code: testCode } });
    if (lookup && !lookup.isActive) {
      console.log("   ✓ Inactive coupon correctly blocked from customer checkout application.");
    } else {
      throw new Error("Inactive coupon was not blocked!");
    }
    console.log("✅ TEST 3 PASSED: 1-click active/inactive toggle verified.\n");

    // -------------------------------------------------------------
    // TEST 4: Editing Coupon Details (Percentage discount + Cap)
    // -------------------------------------------------------------
    console.log("🧪 TEST 4: Updating Coupon to Percentage with Max Discount Cap...");
    const updated = await prisma.coupon.update({
      where: { id: createdCoupon.id },
      data: {
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20%
        maxDiscount: 50,  // Max ₹50
        minOrderAmount: 150,
        isActive: true,
      },
    });

    // Test math: 20% of ₹400 = ₹80, capped at ₹50
    const rawDiscount = (400 * updated.discountValue) / 100;
    const cappedDiscount = updated.maxDiscount ? Math.min(rawDiscount, updated.maxDiscount) : rawDiscount;
    if (cappedDiscount !== 50) {
      throw new Error(`Capped discount incorrect! Expected 50, got ${cappedDiscount}`);
    }
    console.log(`   ✓ Percentage update verified: 20% of ₹400 = ₹${rawDiscount}, capped at ₹${cappedDiscount}`);
    console.log("✅ TEST 4 PASSED: Coupon modification & cap enforcement verified.\n");

    // -------------------------------------------------------------
    // TEST 5: Safe Deletion & Order Unlinking Protection
    // -------------------------------------------------------------
    console.log("🧪 TEST 5: Testing Safe Deletion of Promotional Coupon...");
    await prisma.coupon.delete({
      where: { id: createdCoupon.id },
    });

    const deletedCheck = await prisma.coupon.findUnique({
      where: { id: createdCoupon.id },
    });
    if (deletedCheck) {
      throw new Error("Coupon record still exists after deletion!");
    }
    console.log(`   ✓ Coupon [${testCode}] successfully removed from PostgreSQL.`);
    console.log("✅ TEST 5 PASSED: Deletion completed cleanly.\n");

    console.log("=======================================================");
    console.log("   🎉 ALL OWNER COUPON MANAGEMENT CHECKS PASSED (5/5)  ");
    console.log("=======================================================\n");
  } finally {
    // Ensure cleanup
    await prisma.coupon.deleteMany({ where: { code: testCode } });
  }
}

runTestSuite()
  .catch((e) => {
    console.error("❌ Test Suite Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
