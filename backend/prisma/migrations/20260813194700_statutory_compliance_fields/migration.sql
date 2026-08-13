-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "esic_number" TEXT,
ADD COLUMN     "nominee_dob" TIMESTAMP(3),
ADD COLUMN     "nominee_name" TEXT,
ADD COLUMN     "nominee_phone" TEXT,
ADD COLUMN     "nominee_relation" TEXT,
ADD COLUMN     "pf_number" TEXT,
ADD COLUMN     "tax_declaration_notes" TEXT,
ADD COLUMN     "tax_regime" TEXT,
ADD COLUMN     "uan_number" TEXT;

