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

    // 4. Ensure OrderItem.productId foreign key cascades on delete
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

    isHealed = true;
  } catch (err) {
    console.error("[DB Self-Heal Warning]:", err);
  }
}
