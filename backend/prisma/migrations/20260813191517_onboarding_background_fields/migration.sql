-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "emergency_contact_relation" TEXT,
ADD COLUMN     "highest_qualification" TEXT,
ADD COLUMN     "institution_name" TEXT,
ADD COLUMN     "nda_signed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nda_signed_at" TIMESTAMP(3),
ADD COLUMN     "permanent_address" TEXT,
ADD COLUMN     "policy_acknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policy_acknowledged_at" TIMESTAMP(3),
ADD COLUMN     "previous_company" TEXT,
ADD COLUMN     "previous_designation" TEXT,
ADD COLUMN     "same_as_current_address" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "total_experience_years" DOUBLE PRECISION,
ADD COLUMN     "year_of_passing" INTEGER;

