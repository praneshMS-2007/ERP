-- AlterEnum
ALTER TYPE "EmployeeEventType" ADD VALUE 'REHIRED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "rehired_at" TIMESTAMP(3);

