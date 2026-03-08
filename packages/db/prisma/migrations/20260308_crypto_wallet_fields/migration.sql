-- Add crypto fields to accounts table
ALTER TABLE "accounts"
  ADD COLUMN IF NOT EXISTS "crypto_address" TEXT,
  ADD COLUMN IF NOT EXISTS "crypto_network" TEXT,
  ADD COLUMN IF NOT EXISTS "crypto_symbol" TEXT,
  ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMPTZ;
