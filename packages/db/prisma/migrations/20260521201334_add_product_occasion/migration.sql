-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "occasion" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;
