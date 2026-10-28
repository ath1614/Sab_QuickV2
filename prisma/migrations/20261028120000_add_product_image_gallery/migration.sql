-- Multi-image product galleries (Blinkit/Zepto-style swipeable images).
-- imageUrl stays the primary image for backwards compatibility.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing single-image products so the storefront shows them
-- immediately instead of waiting for the owner to re-save the product.
UPDATE "Product"
SET "imageUrls" = ARRAY["imageUrl"]
WHERE ("imageUrls" IS NULL OR "imageUrls" = ARRAY[]::TEXT[])
  AND "imageUrl" IS NOT NULL
  AND btrim("imageUrl") <> '';
