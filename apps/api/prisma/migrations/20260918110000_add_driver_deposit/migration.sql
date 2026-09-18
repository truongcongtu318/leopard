-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "DriverDeposit" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "payosOrderCode" BIGINT NOT NULL,
    "qrPayload" TEXT,
    "clientRequestId" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverDeposit_payosOrderCode_key" ON "DriverDeposit"("payosOrderCode");

-- CreateIndex
CREATE INDEX "DriverDeposit_driverId_createdAt_idx" ON "DriverDeposit"("driverId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DriverDeposit" ADD CONSTRAINT "DriverDeposit_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
