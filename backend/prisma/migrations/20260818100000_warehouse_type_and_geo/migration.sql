-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('REAL', 'VIRTUAL');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_digital" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "type" "WarehouseType" NOT NULL DEFAULT 'REAL';
