-- CreateTable
CREATE TABLE "project_holidays" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "created_by_employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_holidays_project_id_date_key" ON "project_holidays"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "time_logs_employee_id_project_id_date_key" ON "time_logs"("employee_id", "project_id", "date");

-- AddForeignKey
ALTER TABLE "project_holidays" ADD CONSTRAINT "project_holidays_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_holidays" ADD CONSTRAINT "project_holidays_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
