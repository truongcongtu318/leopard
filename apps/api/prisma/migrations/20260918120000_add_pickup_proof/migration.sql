-- AlterEnum: pickup evidence is its own media type so the pickup leg can be
-- confirmed independently of the delivery proof.
ALTER TYPE "MediaType" ADD VALUE 'PICKUP_PROOF';

-- AlterTable: store the pickup proof reference alongside the delivery proof.
ALTER TABLE "Order" ADD COLUMN "pickupProofMediaId" UUID;
