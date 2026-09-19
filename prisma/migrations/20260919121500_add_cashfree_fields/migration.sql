-- AlterEnum: Add CASHFREE to PaymentMethod enum if not present
DO $$
BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CASHFREE';
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- AlterTable: Add Cashfree fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreeOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreePaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreePaymentStatus" TEXT;
