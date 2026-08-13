-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "offer_letter_document_id" TEXT,
ADD COLUMN     "offer_letter_send_error" TEXT,
ADD COLUMN     "offer_letter_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "employees_offer_letter_document_id_key" ON "employees"("offer_letter_document_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_offer_letter_document_id_fkey" FOREIGN KEY ("offer_letter_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

