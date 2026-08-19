-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "payslip_send_error" TEXT,
ADD COLUMN     "payslip_sent_at" TIMESTAMP(3);
