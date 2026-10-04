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

    // 2. Ensure User "roles" array column exists (for multi-role staff)
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] DEFAULT '{}';`);
    await prisma.$executeRawUnsafe(`UPDATE "User" SET "roles" = ARRAY["role"]::"Role"[] WHERE "roles" = '{}' OR "roles" IS NULL;`);

    // 3. Ensure Order columns exist for Coupons & Online Payments
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT;`);

    // 4. Ensure Cashfree 0% Fee Payment Gateway support
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASHFREE';
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreeOrderId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreePaymentId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreePaymentStatus" TEXT;`);

    // 4b. Rider doorstep collection bookkeeping (UPI / Cash on delivery)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectionMethod" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectedAt" TIMESTAMP(3);`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectedBy" TEXT;`);

    // 5. Ensure OrderItem.productId foreign key cascades on delete
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'OrderItem_productId_fkey'
        ) THEN
          ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
        END IF;
        ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);

    // 5. Ensure Product.categoryId foreign key cascades on delete
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'Product_categoryId_fkey'
        ) THEN
          ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
        END IF;
        ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" 
          FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);

    // 6. Ensure DeviceToken table exists for Push Notifications
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DeviceToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "platform" TEXT NOT NULL,
        "deviceModel" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId");
    `);

    // 7. Ensure ThemeConfig has isStoreLive and launchDate for Pre-Launch Coming Soon mode
    await prisma.$executeRawUnsafe(`ALTER TABLE "ThemeConfig" ADD COLUMN IF NOT EXISTS "isStoreLive" BOOLEAN DEFAULT true;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ThemeConfig" ADD COLUMN IF NOT EXISTS "launchDate" TIMESTAMP(3);`);

    // 8. Ensure LaunchSubscriber table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LaunchSubscriber" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "contact" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    isHealed = true;
  } catch (err) {
    console.error("[DB Self-Heal Warning]:", err);
  }
}
