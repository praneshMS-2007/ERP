-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentKind" ADD VALUE 'AADHAAR_CARD';
ALTER TYPE "DocumentKind" ADD VALUE 'PAN_CARD';
ALTER TYPE "DocumentKind" ADD VALUE 'PASSPORT';
ALTER TYPE "DocumentKind" ADD VALUE 'DRIVING_LICENCE';
ALTER TYPE "DocumentKind" ADD VALUE 'ADDRESS_PROOF';
ALTER TYPE "DocumentKind" ADD VALUE 'PROFILE_PHOTO';
ALTER TYPE "DocumentKind" ADD VALUE 'CANCELLED_CHEQUE';
ALTER TYPE "DocumentKind" ADD VALUE 'EDUCATION_CERTIFICATE';
ALTER TYPE "DocumentKind" ADD VALUE 'EXPERIENCE_LETTER';
ALTER TYPE "DocumentKind" ADD VALUE 'RELIEVING_LETTER';
ALTER TYPE "DocumentKind" ADD VALUE 'PREVIOUS_PAYSLIP';
ALTER TYPE "DocumentKind" ADD VALUE 'NDA_SIGNED';
ALTER TYPE "DocumentKind" ADD VALUE 'POLICY_ACKNOWLEDGEMENT';
ALTER TYPE "DocumentKind" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "aadhaar_number" TEXT;

-- CreateTable
CREATE TABLE "it_access_profiles" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "github_username" TEXT,
    "slack_email" TEXT,
    "corporate_email" TEXT,
    "laptop_assigned" BOOLEAN NOT NULL DEFAULT false,
    "laptop_asset_tag" TEXT,
    "software_notes" TEXT,
    "slack_invited" BOOLEAN NOT NULL DEFAULT false,
    "github_access_granted" BOOLEAN NOT NULL DEFAULT false,
    "jira_access_granted" BOOLEAN NOT NULL DEFAULT false,
    "aws_access_granted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_access_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "it_access_profiles_employee_id_key" ON "it_access_profiles"("employee_id");

-- AddForeignKey
ALTER TABLE "it_access_profiles" ADD CONSTRAINT "it_access_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

