-- AlterTable User: add pin and multi-role support
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pin" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] DEFAULT '{}';
UPDATE "User" SET "roles" = ARRAY["role"]::"Role"[] WHERE "roles" = '{}' OR "roles" IS NULL;

-- AlterTable Order: add coupon and payment fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT;

-- Cascade foreign keys for OrderItem -> Product
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'OrderItem_productId_fkey'
  ) THEN
    ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
  END IF;
  ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Cascade foreign keys for Product -> Category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Product_categoryId_fkey'
  ) THEN
    ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
  END IF;
  ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN others THEN NULL;
END $$;
