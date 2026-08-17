-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "leave_id" TEXT;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leaves"("id") ON DELETE SET NULL ON UPDATE CASCADE;
