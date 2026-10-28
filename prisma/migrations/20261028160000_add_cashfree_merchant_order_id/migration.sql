-- Store the merchant order id actually created at Cashfree. Recovery retries use
-- a suffixed id, and webhook/verify must look the payment up by that exact id.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashfreeMerchantOrderId" TEXT;
