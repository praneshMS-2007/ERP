-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "action_type" TEXT NOT NULL DEFAULT 'UPDATE',
ADD COLUMN     "department" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_email" TEXT,
ADD COLUMN     "user_name" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "internship_cert_document_id" TEXT,
ADD COLUMN     "internship_cert_sent_at" TIMESTAMP(3),
ADD COLUMN     "internship_cert_status" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_department_timestamp_idx" ON "audit_logs"("department", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_timestamp_idx" ON "audit_logs"("action_type", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "employees_internship_cert_document_id_key" ON "employees"("internship_cert_document_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_internship_cert_document_id_fkey" FOREIGN KEY ("internship_cert_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

