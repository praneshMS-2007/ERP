-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "project_manager_id" TEXT;

-- CreateTable
CREATE TABLE "project_announcements" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "author_employee_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "file_url" TEXT,
    "file_name" TEXT,
    "audience_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignments_project_id_employee_id_key" ON "assignments"("project_id", "employee_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_announcements" ADD CONSTRAINT "project_announcements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_announcements" ADD CONSTRAINT "project_announcements_author_employee_id_fkey" FOREIGN KEY ("author_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_announcements" ADD CONSTRAINT "project_announcements_audience_employee_id_fkey" FOREIGN KEY ("audience_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
