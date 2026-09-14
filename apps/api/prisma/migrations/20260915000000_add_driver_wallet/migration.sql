-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN "balanceVnd" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN "bankName" VARCHAR(100),
ADD COLUMN "bankAccountNumber" VARCHAR(50),
ADD COLUMN "bankAccountName" VARCHAR(120);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" UUID NOT NULL,
    "driverProfileId" UUID NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" VARCHAR(100) NOT NULL,
    "bankAccountNumber" VARCHAR(50) NOT NULL,
    "bankAccountName" VARCHAR(120) NOT NULL,
    "processedAt" TIMESTAMPTZ(3),
    "processedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutRequest_driverProfileId_status_idx" ON "PayoutRequest"("driverProfileId", "status");

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
