import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EmployeeEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from './hrm.service';

export interface HistoryChange {
  field: string;
  label: string;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
  /** Compensation values — blanked for viewers who may not see pay. */
  sensitive?: boolean;
}

export interface RecordEventInput {
  employeeId: string;
  type: EmployeeEventType;
  title: string;
  effectiveDate?: Date;
  changes?: HistoryChange[];
  documentId?: string | null;
  actor?: RequestUser | null;
  note?: string | null;
}

type Db = PrismaService | Prisma.TransactionClient;

const HISTORY_VIEW_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);
const COMPENSATION_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER']);

export const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};
export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  PROBATION: 'Probation',
  ON_LEAVE: 'On Leave',
  INACTIVE: 'Former employee',
};
export const WORK_MODE_LABEL: Record<string, string> = { ONSITE: 'Onsite', REMOTE: 'Remote', HYBRID: 'Hybrid' };

/** The career-relevant fields an edit is diffed on — personal details are left to the audit log. */
const TRACKED_SELECT = {
  empType: true,
  status: true,
  workMode: true,
  hasStipend: true,
  stipendAmount: true,
  joinDate: true,
  engagementEndDate: true,
  designation: { select: { title: true } },
  department: { select: { name: true } },
  reportingManager: { select: { firstName: true, lastName: true } },
} satisfies Prisma.EmployeeSelect;

export type TrackedSnapshot = Prisma.EmployeeGetPayload<{ select: typeof TRACKED_SELECT }>;

function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function personName(p?: { firstName: string; lastName: string } | null): string | null {
  return p ? `${p.firstName} ${p.lastName}`.trim() : null;
}

function payLabel(hasStipend: boolean, amount: number | null): string {
  return hasStipend && amount ? `₹${amount.toLocaleString('en-IN')}/month` : 'Unpaid';
}

/**
 * Order matters: when one save changes several things, the event is filed
 * under the most significant one (a type change outranks a phone-style tweak).
 */
const PRIORITY: { field: string; type: EmployeeEventType }[] = [
  { field: 'empType', type: 'EMPLOYMENT_TYPE_CHANGED' },
  { field: 'designation', type: 'DESIGNATION_CHANGED' },
  { field: 'department', type: 'DEPARTMENT_CHANGED' },
  { field: 'compensation', type: 'COMPENSATION_CHANGED' },
  { field: 'status', type: 'STATUS_CHANGED' },
  { field: 'workMode', type: 'WORK_MODE_CHANGED' },
  { field: 'reportingManager', type: 'REPORTING_CHANGED' },
  { field: 'joinDate', type: 'ENGAGEMENT_DATES_CHANGED' },
  { field: 'engagementEndDate', type: 'ENGAGEMENT_DATES_CHANGED' },
];

@Injectable()
export class EmployeeHistoryService {
  constructor(private prisma: PrismaService) {}

  /** Snapshot of the tracked fields, taken before and after an edit. */
  snapshot(employeeId: string, db: Db = this.prisma): Promise<TrackedSnapshot | null> {
    return db.employee.findUnique({ where: { id: employeeId }, select: TRACKED_SELECT });
  }

  /** Human-readable before/after rows for every tracked field that moved. */
  diff(before: TrackedSnapshot, after: TrackedSnapshot): HistoryChange[] {
    const changes: HistoryChange[] = [];
    const push = (field: string, label: string, from: any, to: any, sensitive = false) => {
      if ((from ?? null) !== (to ?? null)) changes.push({ field, label, from: from ?? null, to: to ?? null, ...(sensitive ? { sensitive } : {}) });
    };
    push('empType', 'Employment type', EMP_TYPE_LABEL[before.empType], EMP_TYPE_LABEL[after.empType]);
    push('designation', 'Designation', before.designation?.title, after.designation?.title);
    push('department', 'Department', before.department?.name, after.department?.name);
    push('compensation', 'Monthly pay', payLabel(before.hasStipend, before.stipendAmount), payLabel(after.hasStipend, after.stipendAmount), true);
    push('status', 'Status', STATUS_LABEL[before.status], STATUS_LABEL[after.status]);
    push('workMode', 'Work mode', WORK_MODE_LABEL[before.workMode], WORK_MODE_LABEL[after.workMode]);
    push('reportingManager', 'Reports to', personName(before.reportingManager), personName(after.reportingManager));
    push('joinDate', 'Date of joining', fmtDate(before.joinDate), fmtDate(after.joinDate));
    push('engagementEndDate', 'Engagement end date', fmtDate(before.engagementEndDate), fmtDate(after.engagementEndDate));
    return changes;
  }

  /** Records an edit as one event filed under its most significant change. No-op when nothing tracked moved. */
  async recordEdit(employeeId: string, changes: HistoryChange[], actor?: RequestUser | null, db: Db = this.prisma) {
    if (changes.length === 0) return null;
    const lead = PRIORITY.find((p) => changes.some((c) => c.field === p.field))!;
    const leadChange = changes.find((c) => c.field === lead.field)!;
    const title = leadChange.sensitive
      ? `${leadChange.label} updated`
      : `${leadChange.label}: ${leadChange.from ?? '—'} → ${leadChange.to ?? '—'}`;
    return this.record(
      { employeeId, type: lead.type, title: changes.length > 1 ? `${title} (+${changes.length - 1} more)` : title, changes, actor },
      db,
    );
  }

  async record(input: RecordEventInput, db: Db = this.prisma) {
    return db.employeeEvent.create({
      data: {
        employeeId: input.employeeId,
        type: input.type,
        title: input.title,
        effectiveDate: input.effectiveDate ?? new Date(),
        changes: input.changes && input.changes.length ? (input.changes as unknown as Prisma.InputJsonValue) : undefined,
        documentId: input.documentId ?? null,
        actorUserId: input.actor?.id ?? null,
        actorName: input.actor ? await this.actorName(input.actor, db) : null,
        note: input.note?.trim() || null,
      },
    });
  }

  /** Name shown on the timeline — the actor's employee name if they have one, else their login. */
  private async actorName(actor: RequestUser, db: Db): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: actor.id },
      select: { username: true, email: true, employee: { select: { firstName: true, lastName: true } } },
    });
    return personName(user?.employee) || user?.username || user?.email || actor.email || 'Unknown user';
  }

  /**
   * The full timeline, newest first. HR/Admin only — it collects role, pay and
   * exit history in one place. Pay values inside events are blanked for anyone
   * without compensation access (kept as a guard even though today's viewer
   * set is entirely compensation-cleared).
   */
  async getHistory(employeeId: string, viewer?: RequestUser) {
    if (!viewer || !HISTORY_VIEW_ROLES.has(viewer.role)) {
      throw new ForbiddenException('Only HR and administrators can view employee history.');
    }
    return this.buildHistory(employeeId, COMPENSATION_ROLES.has(viewer.role));
  }

  /** The signed-in person's own timeline — resolved from their login, never a supplied id. */
  async getOwnHistory(viewer?: RequestUser) {
    if (!viewer) throw new NotFoundException('Not signed in.');
    const self = await this.prisma.employee.findUnique({ where: { userId: viewer.id }, select: { id: true } });
    if (!self) throw new NotFoundException('No employee record is linked to this account yet.');
    // Your own pay is yours to see, same rule as /self/profile.
    return this.buildHistory(self.id, true);
  }

  private async buildHistory(employeeId: string, canSeePay: boolean) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true, firstName: true, lastName: true, empCode: true, joinDate: true, empType: true, status: true,
        lastWorkingDay: true, convertedFromInternAt: true, internshipEndDate: true,
        designation: { select: { title: true } },
        department: { select: { name: true } },
        workMode: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const events = (
      await this.prisma.employeeEvent.findMany({
        where: { employeeId },
        include: { document: { select: { id: true, kind: true, fileName: true } } },
      })
    )
      // Newest calendar day first, then the order things actually happened —
      // date-only events (a conversion's start date) and timestamped ones
      // (a letter sent at 3pm) on the same day must not jump ahead of each other.
      .sort((a, b) => {
        const day = (d: Date) => d.toISOString().slice(0, 10);
        return day(b.effectiveDate).localeCompare(day(a.effectiveDate)) || b.createdAt.getTime() - a.createdAt.getTime();
      });

    const end = employee.status === 'INACTIVE' && employee.lastWorkingDay ? employee.lastWorkingDay : new Date();
    const tenureDays = Math.max(0, Math.floor((end.getTime() - employee.joinDate.getTime()) / 86400000));

    return {
      employee,
      summary: {
        tenureDays,
        roleChanges: events.filter((e) => ['ROLE_CONVERTED', 'EMPLOYMENT_TYPE_CHANGED', 'DESIGNATION_CHANGED'].includes(e.type)).length,
        documents: events.filter((e) => e.document).length,
      },
      events: events.map((e) => ({
        ...e,
        changes: Array.isArray(e.changes)
          ? (e.changes as unknown as HistoryChange[]).map((c) =>
              c.sensitive && !canSeePay ? { ...c, from: 'Hidden', to: 'Hidden' } : c,
            )
          : null,
      })),
    };
  }
}
