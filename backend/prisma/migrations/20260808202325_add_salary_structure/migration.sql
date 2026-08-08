-- CreateTable
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "basic" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_structures_employee_id_effective_from_idx" ON "salary_structures"("employee_id", "effective_from");

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
