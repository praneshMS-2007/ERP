-- CreateEnum
CREATE TYPE "EmployeeEventType" AS ENUM ('JOINED', 'OFFER_LETTER_ISSUED', 'ROLE_CONVERTED', 'EMPLOYMENT_TYPE_CHANGED', 'DESIGNATION_CHANGED', 'DEPARTMENT_CHANGED', 'COMPENSATION_CHANGED', 'STATUS_CHANGED', 'WORK_MODE_CHANGED', 'REPORTING_CHANGED', 'ENGAGEMENT_DATES_CHANGED', 'INTERNSHIP_CERTIFICATE_ISSUED', 'INTERNSHIP_CERTIFICATE_REJECTED', 'EXITED');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "converted_from_intern_at" TIMESTAMP(3),
ADD COLUMN     "internship_end_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "employee_events" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "EmployeeEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "changes" JSONB,
    "document_id" TEXT,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_events_employee_id_effective_date_idx" ON "employee_events"("employee_id", "effective_date");

-- AddForeignKey
ALTER TABLE "employee_events" ADD CONSTRAINT "employee_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_events" ADD CONSTRAINT "employee_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Back-fill: history begins with what each record already proves, so existing
-- employees don't start with an empty timeline. Nothing here is invented —
-- every row comes from a column that already holds the fact.

-- Joined (every employee has a join date)
INSERT INTO "employee_events" ("id", "employee_id", "type", "title", "effective_date", "changes", "note")
SELECT gen_random_uuid()::text, e.id, 'JOINED',
       'Joined as ' || COALESCE(ds.title, 'Employee') || ' (' || replace(initcap(lower(e.emp_type::text)), '_', ' ') || ')',
       e.join_date,
       jsonb_build_array(
         jsonb_build_object('field', 'empType', 'label', 'Employment type', 'from', NULL, 'to', replace(initcap(lower(e.emp_type::text)), '_', ' ')),
         jsonb_build_object('field', 'designation', 'label', 'Designation', 'from', NULL, 'to', ds.title),
         jsonb_build_object('field', 'department', 'label', 'Department', 'from', NULL, 'to', dp.name)
       ),
       'Back-filled from the employee record when history tracking was introduced.'
FROM "employees" e
LEFT JOIN "designations" ds ON ds.id = e.designation_id
LEFT JOIN "departments" dp ON dp.id = e.department_id;

-- Offer letter already generated
INSERT INTO "employee_events" ("id", "employee_id", "type", "title", "effective_date", "document_id", "note")
SELECT gen_random_uuid()::text, e.id, 'OFFER_LETTER_ISSUED',
       CASE WHEN e.offer_letter_sent_at IS NOT NULL THEN 'Offer letter issued and emailed' ELSE 'Offer letter generated' END,
       COALESCE(e.offer_letter_sent_at, d.issued_at),
       d.id,
       'Back-filled from the employee record when history tracking was introduced.'
FROM "employees" e
JOIN "documents" d ON d.id = e.offer_letter_document_id;

-- Internship completion certificate issued
INSERT INTO "employee_events" ("id", "employee_id", "type", "title", "effective_date", "document_id", "note")
SELECT gen_random_uuid()::text, e.id, 'INTERNSHIP_CERTIFICATE_ISSUED',
       'Internship completion certificate issued',
       COALESCE(e.internship_cert_sent_at, d.issued_at, e.updated_at),
       e.internship_cert_document_id,
       'Back-filled from the employee record when history tracking was introduced.'
FROM "employees" e
LEFT JOIN "documents" d ON d.id = e.internship_cert_document_id
WHERE e.internship_cert_status = 'APPROVED';

-- Internship completion certificate declined
INSERT INTO "employee_events" ("id", "employee_id", "type", "title", "effective_date", "note")
SELECT gen_random_uuid()::text, e.id, 'INTERNSHIP_CERTIFICATE_REJECTED',
       'Internship completion certificate declined',
       e.updated_at,
       'Back-filled from the employee record when history tracking was introduced.'
FROM "employees" e
WHERE e.internship_cert_status = 'REJECTED';

-- Left the company
INSERT INTO "employee_events" ("id", "employee_id", "type", "title", "effective_date", "note")
SELECT gen_random_uuid()::text, e.id, 'EXITED',
       'Left the company',
       COALESCE(e.last_working_day, e.updated_at),
       'Back-filled from the employee record when history tracking was introduced.'
FROM "employees" e
WHERE e.status = 'INACTIVE';
