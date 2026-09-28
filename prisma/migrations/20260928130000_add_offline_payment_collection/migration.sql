-- Rider doorstep payment collection bookkeeping (UPI / Cash on delivery)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectionMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "offlineCollectedBy" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_offlineCollectedBy_fkey'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_offlineCollectedBy_fkey"
      FOREIGN KEY ("offlineCollectedBy") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;
