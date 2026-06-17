-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Order_checkoutGroupId_idx" ON "Order"("checkoutGroupId");
