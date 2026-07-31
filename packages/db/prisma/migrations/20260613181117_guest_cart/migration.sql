-- Make Cart.userId nullable (anonymous carts have no user) and add anonymousId.
ALTER TABLE "Cart" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Cart" ADD COLUMN "anonymousId" TEXT;
CREATE UNIQUE INDEX "Cart_anonymousId_key" ON "Cart"("anonymousId");
