import prisma from "@/lib/prisma";

let isHealed = false;

/**
 * Ensures critical database columns and schema additions are present in PostgreSQL.
 * Safely runs idempotent 'IF NOT EXISTS' DDL statements at runtime so the application
 * is resilient against out-of-sync or pending migrations.
 */
export async function ensureDatabaseSchema() {
  if (isHealed) return;

  try {
    // 1. Ensure User "pin" column exists (for Store Owner passcode and Staff PINs)
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pin" TEXT;`);

    // 2. Ensure Order columns exist for Coupons & Online Payments
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT;`);

    isHealed = true;
  } catch (err) {
    console.error("[DB Self-Heal Warning]:", err);
  }
}
