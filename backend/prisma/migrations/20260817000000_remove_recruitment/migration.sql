-- DropForeignKey
ALTER TABLE "applicants" DROP CONSTRAINT "applicants_job_id_fkey";

-- DropForeignKey
ALTER TABLE "applicants" DROP CONSTRAINT "applicants_offer_document_id_fkey";

-- DropTable
DROP TABLE "applicants";

-- DropTable
DROP TABLE "job_postings";

-- DropEnum
DROP TYPE "ApplicantSource";

-- DropEnum
DROP TYPE "ApplicantStatus";

-- DropEnum
DROP TYPE "JobStatus";

