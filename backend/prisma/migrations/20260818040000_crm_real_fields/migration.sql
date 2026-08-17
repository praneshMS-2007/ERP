-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'DEMO');

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_customer_id_fkey";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "type" "FollowUpType" NOT NULL DEFAULT 'CALL';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "support_tickets" ALTER COLUMN "customer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
