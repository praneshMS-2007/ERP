-- QA fix pass (2026-08-26): BUG-01 (duplicate attendance rows) + BUG-07
-- (project deletion 500s when related data exists).

-- BUG-01: one attendance row per employee per day, enforced at the DB
-- level — markAttendance now upserts on this instead of blindly creating.
-- CreateIndex
CREATE UNIQUE INDEX "attendances_employee_id_date_key" ON "attendances"("employee_id", "date");

-- BUG-07: deleting a project should clean up everything that only exists
-- because of it (tasks, milestones, staffing, timesheets, announcements,
-- documents, holidays), not fail with a raw FK violation the moment any of
-- them has a single row.
-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "milestones" DROP CONSTRAINT "milestones_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_announcements" DROP CONSTRAINT "project_announcements_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_documents" DROP CONSTRAINT "project_documents_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_holidays" DROP CONSTRAINT "project_holidays_project_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_fkey";

-- DropForeignKey
ALTER TABLE "time_logs" DROP CONSTRAINT "time_logs_project_id_fkey";

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_announcements" ADD CONSTRAINT "project_announcements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_holidays" ADD CONSTRAINT "project_holidays_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
