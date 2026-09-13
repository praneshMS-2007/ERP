-- AlterTable
ALTER TABLE "employees" ADD COLUMN "has_stipend" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "employees" ADD COLUMN "stipend_amount" DOUBLE PRECISION;
