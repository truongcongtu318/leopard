-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "payosOrderCode" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_payosOrderCode_key" ON "PaymentIntent"("payosOrderCode");
