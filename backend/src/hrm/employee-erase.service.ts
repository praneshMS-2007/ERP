import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from './hrm.service';

const PRIVATE_ROOT = path.join(process.cwd(), 'private-uploads');
const PUBLIC_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Permanently erases a former employee: their record, login, every history
 * table that belongs to them, and their files on disk.
 *
 * "Remove" (HrmService.removeEmployee) stays the everyday action — it keeps
 * everything. Erase is the deliberate second step, so it only works on someone
 * who is already a former employee, and the caller must type the employee
 * code back as confirmation.
 *
 * Things this person created that other people use (company announcements,
 * project posts and files, project holidays, reviews they wrote for others)
 * would otherwise keep showing their name, so they are erased too — the
 * preview lists them separately so HR sees that before confirming.
 *
 * The audit log and other people's history are kept so there is a record of
 * what happened, but this person's name and email in them are replaced with
 * "[erased SHR-xx]" — the events stay, the identity goes.
 */
@Injectable()
export class EmployeeEraseService {
  private readonly logger = new Logger(EmployeeEraseService.name);

  constructor(private prisma: PrismaService) {}

  private async load(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true, empCode: true, firstName: true, lastName: true, status: true, userId: true, avatarUrl: true,
        offerLetterDocumentId: true, internshipCertDocumentId: true, personalEmail: true,
        user: { select: { email: true, username: true } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  /** What HR must type to confirm: the employee code, or the full name for the rare record without one. */
  private confirmWord(emp: { empCode: string | null; firstName: string; lastName: string }) {
    return emp.empCode || `${emp.firstName} ${emp.lastName}`.trim();
  }

  /** Every Document row that belongs to this person. */
  private async documentIds(emp: { id: string; userId: string | null; offerLetterDocumentId: string | null; internshipCertDocumentId: string | null }) {
    const payslips = await this.prisma.payroll.findMany({ where: { employeeId: emp.id, payslipDocumentId: { not: null } }, select: { payslipDocumentId: true } });
    const docs = await this.prisma.document.findMany({
      where: {
        OR: [
          { employeeId: emp.id },
          ...(emp.userId ? [{ ownerUserId: emp.userId }] : []),
          { id: { in: [emp.offerLetterDocumentId, emp.internshipCertDocumentId, ...payslips.map((p) => p.payslipDocumentId)].filter((x): x is string => !!x) } },
        ],
      },
      select: { id: true, storagePath: true },
    });
    return docs;
  }

  /** What an erase would remove — shown to HR before they confirm. */
  async preview(id: string) {
    const emp = await this.load(id);
    const p = this.prisma;
    const uid = emp.userId;
    const [docs, attendance, leaves, payroll, timeLogs, assignments, reviewsAbout, salary, letters, events, onboarding, teamsIn,
      announcements, projectPosts, projectFiles, projectHolidays, reviewsWritten, managedProjects, assignedTasks, reports] = await Promise.all([
      this.documentIds(emp),
      p.attendance.count({ where: { employeeId: id } }),
      p.leave.count({ where: { employeeId: id } }),
      p.payroll.count({ where: { employeeId: id } }),
      p.timeLog.count({ where: { employeeId: id } }),
      p.assignment.count({ where: { employeeId: id } }),
      p.performanceReview.count({ where: { employeeId: id } }),
      p.salaryStructure.count({ where: { employeeId: id } }),
      p.outgoingLetter.count({ where: { employeeId: id } }),
      p.employeeEvent.count({ where: { employeeId: id } }),
      p.onboardingSubmission.count({ where: { employeeId: id } }),
      p.teamMember.count({ where: { employeeId: id } }),
      uid ? p.announcement.count({ where: { authorUserId: uid } }) : 0,
      p.projectAnnouncement.count({ where: { OR: [{ authorEmployeeId: id }, { audienceEmployeeId: id }] } }),
      p.projectDocument.count({ where: { uploaderEmployeeId: id } }),
      p.projectHoliday.count({ where: { createdByEmployeeId: id } }),
      p.performanceReview.count({ where: { reviewerId: id, employeeId: { not: id } } }),
      p.project.count({ where: { projectManagerId: id } }),
      p.task.count({ where: { assignedEmployeeId: id } }),
      p.employee.count({ where: { reportingManagerId: id } }),
    ]);

    const own = [
      { label: 'Attendance days', count: attendance },
      { label: 'Leave requests', count: leaves },
      { label: 'Payroll records and payslips', count: payroll },
      { label: 'Salary history entries', count: salary },
      { label: 'Timesheet entries', count: timeLogs },
      { label: 'Project task assignments', count: assignments },
      { label: 'Performance reviews about them', count: reviewsAbout },
      { label: 'Documents and generated PDFs', count: docs.length },
      { label: 'Letters in the Letter Outbox', count: letters },
      { label: 'Employee history entries', count: events },
      { label: 'Google Form submission', count: onboarding },
      { label: 'Team memberships', count: teamsIn },
    ].filter((x) => x.count > 0);

    const createdForOthers = [
      { label: 'Company announcements they posted', count: announcements },
      { label: 'Project posts by or addressed only to them', count: projectPosts },
      { label: 'Project files they uploaded', count: projectFiles },
      { label: 'Project holidays they added', count: projectHolidays },
      { label: 'Performance reviews they wrote for others', count: reviewsWritten },
    ].filter((x) => x.count > 0);

    const unlinked = [
      { label: 'Projects they managed (will show no manager)', count: managedProjects },
      { label: 'Tasks assigned to them (will become unassigned)', count: assignedTasks },
      { label: 'People who report to them (will show no manager)', count: reports },
    ].filter((x) => x.count > 0);

    return {
      id: emp.id,
      empCode: emp.empCode,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      confirmWord: this.confirmWord(emp),
      isFormer: emp.status === 'INACTIVE',
      hasLogin: !!uid,
      own,
      createdForOthers,
      unlinked,
    };
  }

  /**
   * The audit log, other employees' history and letters keep their events, but
   * this person's name and email in them become "[erased SHR-xx]". Name matches
   * are exact (whole column value, or a quoted value inside text), so another
   * person who shares a first name is never touched.
   */
  private async scrubIdentity(
    tx: any,
    emp: { empCode: string | null; firstName: string; lastName: string; userId: string | null; personalEmail: string | null; user: { email: string | null; username: string | null } | null },
    ids: string[],
  ) {
    const tag = `[erased ${emp.empCode || 'employee'}]`;
    const full = `${emp.firstName} ${emp.lastName}`.trim();
    const uid = emp.userId;
    const emails = [emp.personalEmail, emp.user?.email].filter((e): e is string => !!e && e.includes('@'));

    // Audit rows of their own actions: actor columns.
    if (uid) {
      await tx.$executeRaw`UPDATE audit_logs SET user_name = ${tag}, user_email = NULL,
        description = replace(coalesce(description, ''), ${full}, ${tag}) WHERE user_id = ${uid}`;
    }
    // Audit rows about them (or their documents): any mention of the name.
    await tx.$executeRaw`UPDATE audit_logs SET description = replace(description, ${full}, ${tag}),
      details = replace(details, ${full}, ${tag}) WHERE entity_id = ANY(${ids})`;
    // Anywhere else in the audit log: only quoted occurrences ('Name' or "Name").
    for (const q of [`'${full}'`, `"${full}"`]) {
      const t = q[0] + tag + q[0];
      await tx.$executeRaw`UPDATE audit_logs SET description = replace(description, ${q}, ${t}), details = replace(details, ${q}, ${t})
        WHERE description LIKE ${'%' + q + '%'} OR details LIKE ${'%' + q + '%'}`;
    }
    for (const e of emails) {
      await tx.$executeRaw`UPDATE audit_logs SET description = replace(description, ${e}, ${tag}), details = replace(details, ${e}, ${tag}),
        user_email = NULLIF(user_email, ${e}) WHERE description LIKE ${'%' + e + '%'} OR details LIKE ${'%' + e + '%'} OR user_email = ${e}`;
    }

    // Other employees' history, letters and imports that name them as the actor (e.g. if they worked in HR).
    if (uid) {
      await tx.employeeEvent.updateMany({ where: { actorUserId: uid }, data: { actorUserId: null, actorName: tag } });
      await tx.outgoingLetter.updateMany({ where: { createdById: uid }, data: { createdById: null } });
    }
    await tx.employeeEvent.updateMany({ where: { actorName: full }, data: { actorName: tag } });
    await tx.outgoingLetter.updateMany({ where: { createdByName: full }, data: { createdByName: tag } });
    await tx.outgoingLetter.updateMany({ where: { sentByName: full }, data: { sentByName: tag } });
    await tx.onboardingSubmission.updateMany({ where: { importedByName: full }, data: { importedByName: tag } });
    if (uid) await tx.teamRevenue.updateMany({ where: { enteredById: uid }, data: { enteredById: null, enteredByName: tag } });
    await tx.teamRevenue.updateMany({ where: { enteredByName: full }, data: { enteredByName: tag } });
    // e.g. "Reporting manager: Erase Tester -> -" in someone else's history.
    const quoted = JSON.stringify(full);
    await tx.$executeRaw`UPDATE employee_events SET changes = replace(changes::text, ${quoted}, ${JSON.stringify(tag)})::jsonb
      WHERE changes::text LIKE ${'%' + quoted + '%'}`;
  }

  async erase(id: string, confirmCode: string | undefined, actor?: RequestUser) {
    const emp = await this.load(id);
    if (emp.status !== 'INACTIVE') {
      throw new BadRequestException('Only former employees can be erased. Remove them from the directory first.');
    }
    const word = this.confirmWord(emp);
    if ((confirmCode ?? '').trim().replace(/\s+/g, ' ').toUpperCase() !== word.toUpperCase()) {
      throw new BadRequestException(`Type ${emp.empCode ? 'the employee code' : 'their full name'} "${word}" exactly to confirm.`);
    }
    if (actor?.id && emp.userId === actor.id) {
      throw new ForbiddenException('You cannot erase your own account.');
    }

    const docs = await this.documentIds(emp);
    const docIds = docs.map((d) => d.id);
    const uid = emp.userId;
    const projectFiles = await this.prisma.projectDocument.findMany({ where: { uploaderEmployeeId: id }, select: { fileUrl: true } });
    const onboardingIds = (await this.prisma.onboardingSubmission.findMany({ where: { employeeId: id }, select: { id: true } })).map((s) => s.id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Links from records that stay: they just lose the pointer.
      await tx.employee.updateMany({ where: { reportingManagerId: id }, data: { reportingManagerId: null } });
      await tx.project.updateMany({ where: { projectManagerId: id }, data: { projectManagerId: null } });
      await tx.task.updateMany({ where: { assignedEmployeeId: id }, data: { assignedEmployeeId: null } });
      await tx.holiday.updateMany({ where: { createdByEmployeeId: id }, data: { createdByEmployeeId: null } });
      if (uid) await tx.passwordResetRequest.updateMany({ where: { resolvedById: uid }, data: { resolvedById: null } });

      // 2. Their own history.
      await tx.attendance.deleteMany({ where: { employeeId: id } }); // before leaves (attendance can point at a leave)
      await tx.leave.deleteMany({ where: { employeeId: id } });
      await tx.timeLog.deleteMany({ where: { employeeId: id } });
      await tx.assignment.deleteMany({ where: { employeeId: id } });
      await tx.performanceReview.deleteMany({ where: { OR: [{ employeeId: id }, { reviewerId: id }] } });
      await tx.outgoingLetter.deleteMany({ where: { OR: [{ employeeId: id }, { documentId: { in: docIds } }] } });
      await tx.payroll.deleteMany({ where: { employeeId: id } }); // before documents (payroll points at its payslip)
      await tx.onboardingSubmission.deleteMany({ where: { employeeId: id } });

      // 3. Things they created that others could see.
      await tx.projectAnnouncement.deleteMany({ where: { OR: [{ authorEmployeeId: id }, { audienceEmployeeId: id }] } });
      await tx.projectDocument.deleteMany({ where: { uploaderEmployeeId: id } });
      await tx.projectHoliday.deleteMany({ where: { createdByEmployeeId: id } });

      // 4. Documents: unhook from the employee row and from each other, then delete.
      await tx.employee.update({ where: { id }, data: { offerLetterDocumentId: null, internshipCertDocumentId: null } });
      if (docIds.length) {
        await tx.document.updateMany({ where: { OR: [{ id: { in: docIds } }, { supersedesId: { in: docIds } }] }, data: { supersedesId: null } });
        await tx.document.deleteMany({ where: { id: { in: docIds } } });
      }

      // 5. The employee (salary structures, history events, IT access cascade).
      await tx.employee.delete({ where: { id } });

      // 6. Kept records written by or about them elsewhere: swap their name/email for a neutral tag.
      await this.scrubIdentity(tx, emp, [id, ...(uid ? [uid] : []), ...docIds]);

      // 7. The login account and everything tied to it. Audit rows are kept (userId -> null).
      if (uid) {
        await tx.authentication.deleteMany({ where: { userId: uid } });
        await tx.notification.deleteMany({ where: { userId: uid } });
        await tx.passwordResetRequest.deleteMany({ where: { userId: uid } });
        await tx.announcementRecipient.deleteMany({ where: { OR: [{ userId: uid }, { announcement: { authorUserId: uid } }] } });
        await tx.announcement.deleteMany({ where: { authorUserId: uid } });
        await tx.user.delete({ where: { id: uid } });
      }
    }, { timeout: 30000 });

    // Files go only after the database commit succeeded, so a failed erase never
    // leaves records pointing at missing files.
    let filesRemoved = 0;
    const remove = (full: string, root: string) => {
      const resolved = path.resolve(full);
      if (!resolved.startsWith(path.resolve(root) + path.sep)) return; // never outside the upload folders
      try {
        if (fs.existsSync(resolved)) {
          fs.rmSync(resolved, { recursive: true, force: true });
          filesRemoved++;
        }
      } catch (e: any) {
        this.logger.warn(`Could not delete ${resolved}: ${e.message}`);
      }
    };
    for (const d of docs) {
      // Generated PDFs store "offer-letters/x.pdf"; employee uploads store just the file name under employee-documents/.
      remove(path.join(PRIVATE_ROOT, d.storagePath), PRIVATE_ROOT);
      remove(path.join(PRIVATE_ROOT, 'employee-documents', d.storagePath), PRIVATE_ROOT);
    }
    if (emp.avatarUrl?.startsWith('/uploads/')) remove(path.join(PUBLIC_ROOT, emp.avatarUrl.slice('/uploads/'.length)), PUBLIC_ROOT);
    for (const f of projectFiles) {
      if (f.fileUrl?.startsWith('/uploads/')) remove(path.join(PUBLIC_ROOT, f.fileUrl.slice('/uploads/'.length)), PUBLIC_ROOT);
    }
    for (const sid of onboardingIds) remove(path.join(PRIVATE_ROOT, 'onboarding', sid), PRIVATE_ROOT);

    this.logger.log(`Permanently erased former employee ${emp.empCode ?? emp.id} (${filesRemoved} file(s) removed)`);
    return { message: `${word} has been permanently erased.`, empCode: emp.empCode, filesRemoved };
  }
}
