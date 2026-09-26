-- Add scheduled seasonal theme campaigns (Phase 5 theme engine)
-- Idempotent: the VPS deploy loop replays every migration.sql via raw psql.
CREATE TABLE IF NOT EXISTS "ThemeCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "saleTagText" TEXT,
    "bannerImageUrl" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ThemeCampaign_isActive_validFrom_validUntil_idx" ON "ThemeCampaign"("isActive", "validFrom", "validUntil");
