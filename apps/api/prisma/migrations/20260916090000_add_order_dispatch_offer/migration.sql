-- CreateEnum
CREATE TYPE "OrderDispatchOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "OrderDispatchOffer" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "status" "OrderDispatchOfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OrderDispatchOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDispatchOffer_orderId_driverId_key" ON "OrderDispatchOffer"("orderId", "driverId");

-- CreateIndex
CREATE INDEX "OrderDispatchOffer_orderId_status_idx" ON "OrderDispatchOffer"("orderId", "status");

-- AddForeignKey
ALTER TABLE "OrderDispatchOffer" ADD CONSTRAINT "OrderDispatchOffer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDispatchOffer" ADD CONSTRAINT "OrderDispatchOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
