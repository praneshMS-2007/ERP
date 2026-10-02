-- CreateEnum
CREATE TYPE "LetterKind" AS ENUM ('OFFER_LETTER', 'COMPLETION_CERTIFICATE', 'PAYSLIP');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'IMPORTED', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "outgoing_letters" (
    "id" TEXT NOT NULL,
    "kind" "LetterKind" NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'DRAFT',
    "employee_id" TEXT,
    "payroll_id" TEXT,
    "document_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "attachment_name" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_by_name" TEXT,
    "sent_at" TIMESTAMP(3),
    "sent_by_name" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outgoing_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_submissions" (
    "id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "submitted_at" TIMESTAMP(3),
    "payload_enc" TEXT NOT NULL,
    "files" JSONB,
    "employee_id" TEXT,
    "imported_at" TIMESTAMP(3),
    "imported_by_name" TEXT,
    "dismissed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outgoing_letters_status_kind_idx" ON "outgoing_letters"("status", "kind");

-- CreateIndex
CREATE INDEX "outgoing_letters_employee_id_idx" ON "outgoing_letters"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_submissions_source_key_key" ON "onboarding_submissions"("source_key");

-- CreateIndex
CREATE INDEX "onboarding_submissions_status_idx" ON "onboarding_submissions"("status");

-- AddForeignKey
ALTER TABLE "outgoing_letters" ADD CONSTRAINT "outgoing_letters_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outgoing_letters" ADD CONSTRAINT "outgoing_letters_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

