-- Wave 3 contract data preflight: bring the Wave 2 schema to the Wave 3 contract.
-- Idempotent-safe: uses IF NOT EXISTS / IF EXISTS guards where PostgreSQL permits.

-- 1. TrackingPoint.accuracyM
ALTER TABLE "TrackingPoint" ADD COLUMN IF NOT EXISTS "accuracyM" double precision;

-- 2. MediaObject: checksum + clientRequestId + idempotency unique
ALTER TABLE "MediaObject" ADD COLUMN IF NOT EXISTS "checksumSha256" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MediaObject" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;
ALTER TABLE "MediaObject" ALTER COLUMN "checksumSha256" DROP DEFAULT;

-- 3. PaymentIntent: nullable provider + reference/confirmation fields
ALTER TABLE "PaymentIntent" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "providerReference" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmedById" UUID;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ(3);
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmationNote" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "confirmationRequestId" TEXT;

-- 4. AuditLog request IDs
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "idempotencyRequestId" TEXT;

-- 5. Normalize legacy UNPAID intents whose provider is a map source (VIETMAP/DEMO) -> NULL.
--    Fail fast if any non-UNPAID row carries a provider that is not a payment provider.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "PaymentIntent"
    WHERE "status" <> 'UNPAID' AND "provider" IN ('VIETMAP', 'LOCAL', 'S3')
  ) THEN
    RAISE EXCEPTION 'invalid provider on non-UNPAID PaymentIntent; manual review required';
  END IF;
END $$;

UPDATE "PaymentIntent"
  SET "provider" = NULL
  WHERE "status" = 'UNPAID' AND "provider" IN ('VIETMAP', 'DEMO');

-- 6. Foreign key for confirmedById (RESTRICT -> User)
ALTER TABLE "PaymentIntent"
  DROP CONSTRAINT IF EXISTS "PaymentIntent_confirmedById_fkey";
ALTER TABLE "PaymentIntent"
  ADD CONSTRAINT "PaymentIntent_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Idempotency unique constraints (nullable UNIQUE = multiple NULLs allowed by design)
CREATE UNIQUE INDEX IF NOT EXISTS "MediaObject_orderId_uploaderId_type_clientRequestId_key"
  ON "MediaObject"("orderId", "uploaderId", "type", "clientRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_orderId_clientRequestId_key"
  ON "PaymentIntent"("orderId", "clientRequestId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_provider_providerReference_key"
  ON "PaymentIntent"("provider", "providerReference");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_confirmationRequestId_key"
  ON "PaymentIntent"("confirmationRequestId");
