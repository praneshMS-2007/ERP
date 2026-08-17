-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "ip_address" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_module_timestamp_idx" ON "audit_logs"("module", "timestamp");

