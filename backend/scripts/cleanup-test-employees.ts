/**
 * One-off cleanup: removes the employees created during proof-of-work testing
 * (empCode SHR-26-*), and everything that references them, in FK-safe order.
 * The original seeded employees (empCode ERP-*) are untouched.
 *
 * Run with: npx ts-node scripts/cleanup-test-employees.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const testEmployees = await prisma.employee.findMany({
    where: { empCode: { startsWith: 'SHR-26-' } },
    include: { offerLetterDocument: true, user: true },
  });

  console.log(`Found ${testEmployees.length} test employee(s) to remove:`);
  for (const e of testEmployees) {
    console.log(`  ${e.empCode}  ${e.firstName} ${e.lastName}`);
  }

  for (const e of testEmployees) {
    // 1. Break the Employee -> Document FK before the Document can be deleted.
    if (e.offerLetterDocumentId) {
      await prisma.employee.update({ where: { id: e.id }, data: { offerLetterDocumentId: null } });
    }

    // 2. Delete the generated offer letter PDF from disk, then its row.
    if (e.offerLetterDocument) {
      const filePath = path.join(process.cwd(), e.offerLetterDocument.storagePath.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await prisma.document.delete({ where: { id: e.offerLetterDocument.id } });
    }

    // 3. Every other table with a foreign key to this employee.
    await prisma.salaryStructure.deleteMany({ where: { employeeId: e.id } });
    await prisma.attendance.deleteMany({ where: { employeeId: e.id } });
    await prisma.leave.deleteMany({ where: { employeeId: e.id } });
    await prisma.assignment.deleteMany({ where: { employeeId: e.id } });
    await prisma.task.updateMany({ where: { assignedEmployeeId: e.id }, data: { assignedEmployeeId: null } });
    await prisma.performanceReview.deleteMany({ where: { OR: [{ employeeId: e.id }, { reviewerId: e.id }] } });
    await prisma.payroll.deleteMany({ where: { employeeId: e.id } });
    await prisma.timeLog.deleteMany({ where: { employeeId: e.id } });
    // Anyone who reported to a test employee loses that reference, not their record.
    await prisma.employee.updateMany({ where: { reportingManagerId: e.id }, data: { reportingManagerId: null } });

    await prisma.employee.delete({ where: { id: e.id } });

    // 4. The linked ERP login account.
    if (e.userId) {
      await prisma.user.delete({ where: { id: e.userId } }).catch(() => {
        // Already gone or still referenced elsewhere — don't let cleanup crash.
      });
    }

    console.log(`  removed ${e.empCode}`);
  }

  const remaining = await prisma.employee.count();
  console.log(`\nDone. ${remaining} employee(s) remain.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
