ALTER TABLE "Order"
  ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Order_customerId_clientRequestId_key"
  ON "Order"("customerId", "clientRequestId");

ALTER TABLE "OrderStatusHistory"
  ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "OrderStatusHistory_orderId_actorId_clientRequestId_key"
  ON "OrderStatusHistory"("orderId", "actorId", "clientRequestId");
