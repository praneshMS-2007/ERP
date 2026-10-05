-- CreateEnum
CREATE TYPE "PayType" AS ENUM ('FIXED', 'REVENUE_SHARE', 'FIXED_AND_SHARE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('HEAD', 'MEMBER');

-- AlterEnum
ALTER TYPE "EmployeeEventType" ADD VALUE 'TEAM_CHANGED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "pay_type" "PayType" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN     "revenue_share" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenue_share_detail" JSONB;

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "revenue_share_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_revenues" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "entered_by_id" TEXT,
    "entered_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE INDEX "team_members_employee_id_idx" ON "team_members"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_employee_id_key" ON "team_members"("team_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_revenues_team_id_period_key" ON "team_revenues"("team_id", "period");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_revenues" ADD CONSTRAINT "team_revenues_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

