-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'INCIDENT_CANCELLED';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNING';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- DropIndex
DROP INDEX "DriverProfile_lastKnownLocation_gist";

-- DropIndex
DROP INDEX "Order_status_createdAt_idx";

-- DropIndex
DROP INDEX "OrderStop_location_gist";

-- DropIndex
DROP INDEX "TrackingPoint_location_gist";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "autoOfflineOnComplete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Fleet" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FleetMember" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MediaObject" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cargoNote" TEXT,
ADD COLUMN     "cargoWeightKg" INTEGER,
ADD COLUMN     "incidentNote" TEXT,
ADD COLUMN     "incidentReason" TEXT,
ADD COLUMN     "incidentReportedAt" TIMESTAMPTZ(3),
ADD COLUMN     "proofMediaId" UUID,
ADD COLUMN     "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTORBIKE',
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderStop" ADD COLUMN     "contactName" VARCHAR(120),
ADD COLUMN     "contactPhone" VARCHAR(32),
ADD COLUMN     "note" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentIntent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RefreshSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrackingPoint" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" VARCHAR(120),
    "bankAccountNumber" VARCHAR(32),
    "bankAccountName" VARCHAR(120),
    "clientRequestId" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_driverId_createdAt_idx" ON "WithdrawalRequest"("driverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DriverProfile_availability_vehicleType_lastKnownAt_idx" ON "DriverProfile"("availability", "vehicleType", "lastKnownAt");

-- CreateIndex
CREATE INDEX "Order_status_vehicleType_createdAt_idx" ON "Order"("status", "vehicleType", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
