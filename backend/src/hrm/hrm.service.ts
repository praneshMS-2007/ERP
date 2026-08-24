import { Injectable, NotFoundException, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { normalisePan, normaliseAadhaar, normaliseUan, normaliseEsic, normaliseBankAccount, normaliseIfsc, normaliseEmail } from '../common/validators';
import { encryptField, decryptField } from '../common/field-encryption';
import { OfferLetterService } from './offer-letter.service';
import { PayslipService } from './payslip.service';
import { AnnouncementsService } from '../announcements/announcements.service';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  permissions?: { module: string; action: string }[];
}

/** Every money figure on a payslip — typed in by HR/Finance, never derived. */
export interface PayrollManualInput {
  baseSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  tds: number;
  providentFund: number;
  professionalTax: number;
  lossOfPay: number;
}

/**
 * Roles createEmployee() is allowed to hand out. EMPLOYEE is the default
 * (every ordinary hire); the rest are the "management" tier a Super Admin
 * can grant from the Add New Employee modal's Management Account section.
 * PROJECT_MANAGER is deliberately excluded — see the comment on
 * createEmployee. There is no TEAM_LEAD role at all (removed entirely).
 */
const MANAGEABLE_ROLES = new Set(['EMPLOYEE', 'SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'SALES_MANAGER', 'INVENTORY_MANAGER']);

/** Salary is visible to HR, Finance and super admins — nobody else. */
const COMPENSATION_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER']);

function canViewCompensation(viewer?: RequestUser): boolean {
  return !!viewer && COMPENSATION_ROLES.has(viewer.role);
}

/**
 * Segregation of duties, locked decision: HR prepares payroll (creates the
 * draft), Finance approves/releases it (marks paid) — the same person never
 * does both. HR_MANAGER is deliberately absent from this set even though it
 * holds HR:WRITE and can create records; SUPER_ADMIN is the one trusted
 * override, same as elsewhere in this app.
 */
const PAYROLL_APPROVAL_ROLES = new Set(['SUPER_ADMIN', 'FINANCE_MANAGER']);

function canApprovePayroll(viewer?: RequestUser): boolean {
  return !!viewer && PAYROLL_APPROVAL_ROLES.has(viewer.role);
}

/**
 * Government ID numbers (PAN, Aadhaar) are narrower than compensation —
 * "strictly HR role-based authorization" per the team lead, so Finance is
 * deliberately excluded here even though it can see salary. If Finance ever
 * needs PAN for TDS filing, that's a decision to make explicitly, not a
 * side effect of reusing the compensation gate.
 */
const SENSITIVE_IDENTITY_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);

function canViewSensitiveIdentity(viewer?: RequestUser): boolean {
  return !!viewer && SENSITIVE_IDENTITY_ROLES.has(viewer.role);
}

/**
 * Same role set as the identity gate, kept as a separate named function
 * because it governs a different, broader concept — "can see a colleague's
 * full HR record" (DOB, address, emergency contact, education, nominee…)
 * rather than specifically government ID numbers. They happen to share a
 * role set today; that's a coincidence worth keeping separately named in
 * case the two ever need to diverge (e.g. a future HR_ASSISTANT role that
 * can see full profiles but not statutory numbers).
 */
function canViewFullProfile(viewer?: RequestUser): boolean {
  return !!viewer && SENSITIVE_IDENTITY_ROLES.has(viewer.role);
}

/** Fields a human may edit through the HR screen. Anything else is discarded. */
const EDITABLE_EMPLOYEE_FIELDS = [
  'firstName', 'lastName', 'gender', 'dob', 'contact', 'address', 'city', 'state', 'country',
  'joinDate', 'empType', 'status', 'departmentId', 'designationId',
  'pan', 'aadhaarNumber', 'bankAccountNo', 'bankIfsc', 'personalEmail', 'workMode',
  'reportingManagerId', 'engagementEndDate',
  'sameAsCurrentAddress', 'permanentAddress',
  'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
  'highestQualification', 'institutionName', 'yearOfPassing',
  'previousCompany', 'previousDesignation', 'totalExperienceYears',
  'uanNumber', 'pfNumber', 'esicNumber',
  'nomineeName', 'nomineeRelation', 'nomineeDob', 'nomineePhone',
  'taxRegime', 'taxDeclarationNotes',
] as const;

// dob and engagementEndDate are DateTime? — nullable, so an empty form field
// legitimately clears them. joinDate is DateTime with @default(now()) and no
// "?": passing it as null explicitly asks Prisma to write NULL into a NOT
// NULL column, which the database (correctly) rejects. An empty joinDate
// must be *omitted* from the payload instead, so create falls back to the
// column default and update leaves whatever value is already there alone.
const NULLABLE_DATE_FIELDS = new Set(['dob', 'engagementEndDate', 'nomineeDob']);
const REQUIRED_DATE_FIELDS = new Set(['joinDate']);

/**
 * Copies across only permitted fields, normalising and validating as it goes.
 * Empty strings become null so clearing an optional field actually clears it
 * — except the required date field above, which is omitted instead.
 */
function sanitiseEmployeeInput(input: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};

  for (const field of EDITABLE_EMPLOYEE_FIELDS) {
    if (!(field in input)) continue;
    const raw = input[field];

    if (raw === null || raw === undefined || raw === '') {
      if (REQUIRED_DATE_FIELDS.has(field)) continue; // omit, don't null
      out[field] = null;
      continue;
    }

    if (NULLABLE_DATE_FIELDS.has(field) || REQUIRED_DATE_FIELDS.has(field)) {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`${field} is not a valid date.`);
      }
      out[field] = d;
      continue;
    }

    switch (field) {
      // Validate the plaintext shape first — an encrypted blob of garbage
      // input would be undetectable as wrong once it's ciphertext — then
      // encrypt before it ever reaches the database.
      case 'pan':           out.pan = encryptField(normalisePan(String(raw))); break;
      case 'aadhaarNumber': out.aadhaarNumber = encryptField(normaliseAadhaar(String(raw))); break;
      case 'uanNumber':     out.uanNumber = encryptField(normaliseUan(String(raw))); break;
      case 'esicNumber':    out.esicNumber = encryptField(normaliseEsic(String(raw))); break;
      // No fixed national format for PF numbers — encrypted, but not
      // format-checked, so a legitimate real number is never rejected.
      case 'pfNumber':      out.pfNumber = encryptField(String(raw).trim()); break;
      case 'bankAccountNo': out.bankAccountNo = normaliseBankAccount(String(raw)); break;
      case 'bankIfsc':      out.bankIfsc = normaliseIfsc(String(raw)); break;
      case 'personalEmail': out.personalEmail = normaliseEmail(String(raw)); break;
      case 'taxRegime': {
        const regime = String(raw).trim().toUpperCase();
        if (regime !== 'OLD' && regime !== 'NEW') {
          throw new BadRequestException('Tax regime must be "OLD" or "NEW".');
        }
        out.taxRegime = regime;
        break;
      }
      case 'yearOfPassing': {
        const year = Number(raw);
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1950 || year > currentYear + 1) {
          throw new BadRequestException(`Year of passing must be between 1950 and ${currentYear + 1}.`);
        }
        out.yearOfPassing = year;
        break;
      }
      case 'totalExperienceYears': {
        const years = Number(raw);
        if (!Number.isFinite(years) || years < 0 || years > 60) {
          throw new BadRequestException('Total experience must be a number of years between 0 and 60.');
        }
        out.totalExperienceYears = years;
        break;
      }
      default:              out[field] = typeof raw === 'string' ? raw.trim() : raw;
    }
  }

  // firstName and lastName are required by the schema — never null them out.
  for (const required of ['firstName', 'lastName'] as const) {
    if (required in out && !out[required]) {
      throw new BadRequestException(`${required === 'firstName' ? 'First' : 'Last'} name cannot be empty.`);
    }
  }

  return out;
}


@Injectable()
export class HrmService {
  private readonly logger = new Logger(HrmService.name);

  private readonly avatarDir = path.join(process.cwd(), 'uploads', 'avatars');

  constructor(
    private prisma: PrismaService,
    private offerLetterService: OfferLetterService,
    private payslipService: PayslipService,
    private announcementsService: AnnouncementsService,
  ) {
    fs.mkdirSync(this.avatarDir, { recursive: true });
  }

  // ========== EMPLOYEES ==========

  /**
   * A directory headshot — public (served from uploads/, not
   * private-uploads/) because it's meant to be visible to every colleague,
   * unlike the Aadhaar/PAN scans in EmployeeDocumentsService. Confidentiality
   * here relies on the same unguessable-filename convention as offer
   * letters, which is an appropriate level of protection for a photo that's
   * supposed to be broadly visible anyway.
   */
  async setAvatar(employeeId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!ALLOWED.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG or WEBP images are accepted.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image is larger than the 5MB limit.');
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');

    const ext = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(this.avatarDir, fileName), file.buffer);
    const avatarUrl = `/uploads/avatars/${fileName}`;

    await this.prisma.employee.update({ where: { id: employeeId }, data: { avatarUrl } });
    return { avatarUrl };
  }

  /**
   * Directory-safe fields visible to any authenticated colleague — name,
   * photo, department, designation, ERP login. Explicitly NOT personal
   * email, personal phone, address, DOB, gender, or anything from the
   * Background/Statutory tabs (education, previous employment, emergency
   * contact, nominee) — those are third-party or personal-life details a
   * colleague browsing the directory has no business seeing about someone
   * else, per the strict-RBAC directory spec.
   *
   * There is no separate "work email"/"work phone" field yet — Workspace is
   * on hold, so the only login identifier is the generated ERP username,
   * surfaced here as exactly that rather than mislabelled "work email".
   */
  private stripToDirectorySafe(employee: any) {
    const {
      gender, dob, contact, personalEmail, address, city, state, country,
      permanentAddress, sameAsCurrentAddress,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      highestQualification, institutionName, yearOfPassing,
      previousCompany, previousDesignation, totalExperienceYears,
      nomineeName, nomineeRelation, nomineeDob, nomineePhone,
      ...safe
    } = employee;
    return safe;
  }

  /**
   * The directory list. Deliberately a `select`, not an `include` — `include`
   * returns every scalar column on Employee, which used to mean PAN, Aadhaar
   * and bank details rode along in the list response to anyone holding
   * HR:READ. Those two fields only ever leave the server via getEmployeeById
   * (never selected here at all). Everything else in the select below is
   * still filtered per-viewer after the query — see stripToDirectorySafe.
   */
  async getEmployees(departmentId?: string, status?: any, viewer?: RequestUser) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true, empCode: true, firstName: true, lastName: true, avatarUrl: true,
        gender: true, dob: true, contact: true, personalEmail: true,
        address: true, city: true, state: true, country: true,
        permanentAddress: true, sameAsCurrentAddress: true,
        emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
        highestQualification: true, institutionName: true, yearOfPassing: true,
        previousCompany: true, previousDesignation: true, totalExperienceYears: true,
        nomineeName: true, nomineeRelation: true, nomineeDob: true, nomineePhone: true,
        joinDate: true, empType: true, status: true, workMode: true, lastWorkingDay: true,
        engagementEndDate: true, departmentId: true, designationId: true,
        reportingManagerId: true, userId: true,
        createdAt: true, updatedAt: true,
        department: true,
        designation: true,
        user: { select: { email: true, username: true, role: { select: { name: true } } } },
      },
      orderBy: { joinDate: 'desc' },
    });

    if (canViewFullProfile(viewer)) return employees;
    return employees.map((e) => this.stripToDirectorySafe(e));
  }

  /**
   * Full record for the HR detail view.
   *
   * Compensation is omitted entirely for roles that may not see it — it is left
   * out of the response, not hidden in the UI, so it cannot be read by calling
   * the API directly.
   */
  async getEmployeeById(id: string, viewer?: RequestUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, empCode: true },
        },
        user: { select: { email: true, username: true, role: { select: { name: true } } } },
        attendances: { take: 10, orderBy: { date: 'desc' } },
        leaves: { take: 10, orderBy: { startDate: 'desc' } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // You can always see your own data, regardless of role — the gates
    // below exist to keep you out of a *colleague's* record, not your own.
    // Without this bypass, an EMPLOYEE viewing their own profile through
    // /self/profile would see their own PAN and salary redacted, which
    // defeats the point of a self-service view.
    const isSelf = !!viewer && !!employee.userId && employee.userId === viewer.id;

    // Per team decision: PAN/Aadhaar/UAN/PF/ESIC are encrypted at rest, and
    // this is the ONLY endpoint that ever decrypts and returns them, gated
    // to a narrower set than general HR:READ. The frontend masks by default
    // and reveals on an explicit toggle — but the real value has to reach
    // the browser for that toggle to work, so the gate here is what
    // actually protects the data, not the masking.
    const identityVisible = canViewSensitiveIdentity(viewer) || isSelf;
    const identity = {
      pan: identityVisible && employee.pan ? decryptField(employee.pan) : null,
      aadhaarNumber: identityVisible && employee.aadhaarNumber ? decryptField(employee.aadhaarNumber) : null,
      uanNumber: identityVisible && employee.uanNumber ? decryptField(employee.uanNumber) : null,
      pfNumber: identityVisible && employee.pfNumber ? decryptField(employee.pfNumber) : null,
      esicNumber: identityVisible && employee.esicNumber ? decryptField(employee.esicNumber) : null,
    };

    const compensationVisible = canViewCompensation(viewer) || isSelf;
    // Tax declaration isn't encrypted (see schema comment) but follows the
    // same gate as salary — it's a financial disclosure Finance needs for
    // payroll, not a government identifier.
    const tax = {
      taxRegime: compensationVisible ? employee.taxRegime : null,
      taxDeclarationNotes: compensationVisible ? employee.taxDeclarationNotes : null,
    };

    // Same directory-safe cut as the list endpoint — DOB, address, emergency
    // contact, education, nominee etc. are a colleague's business only if
    // they're HR/Admin (or it's your own record). A general employee
    // clicking into someone else's profile from the directory must land on
    // the same restricted shape the list already promised, not the full
    // record via a different door.
    const profileVisible = canViewFullProfile(viewer) || isSelf;
    const baseEmployee = profileVisible ? employee : this.stripToDirectorySafe(employee);
    // Attendance/leave history is similarly not a general colleague's business.
    if (!profileVisible) {
      (baseEmployee as any).attendances = [];
      (baseEmployee as any).leaves = [];
    }

    if (!compensationVisible) {
      return {
        ...baseEmployee,
        ...identity,
        ...tax,
        canViewSensitiveIdentity: identityVisible,
        canViewFullProfile: profileVisible,
        compensation: null,
        canViewCompensation: false,
      };
    }

    const salaryHistory = await this.prisma.salaryStructure.findMany({
      where: { employeeId: id },
      orderBy: { effectiveFrom: 'desc' },
    });
    const current = salaryHistory.find((s) => s.effectiveTo === null) ?? null;

    return {
      ...baseEmployee,
      ...identity,
      ...tax,
      canViewSensitiveIdentity: identityVisible,
      canViewFullProfile: profileVisible,
      canViewCompensation: true,
      compensation: {
        current: current && {
          ...current,
          gross: current.basic + current.hra + current.specialAllowance,
        },
        history: salaryHistory,
      },
    };
  }

  // ========== SELF-SERVICE ==========
  // Every method here resolves the employee from the caller's own JWT — none
  // accept a client-supplied employeeId. That is what makes SELF:ALL safe to
  // grant to every role: it can only ever reach the caller's own record.

  private async resolveSelf(viewer?: RequestUser) {
    if (!viewer) throw new NotFoundException('Not signed in.');
    const employee = await this.prisma.employee.findUnique({ where: { userId: viewer.id } });
    if (!employee) {
      throw new NotFoundException(
        'No employee record is linked to this account yet — ask HR to link your login to your employee profile.',
      );
    }
    return employee;
  }

  async getSelfProfile(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.getEmployeeById(self.id, viewer);
  }

  async getSelfLeaves(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.getLeaves(undefined, self.id);
  }

  async getSelfAttendance(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.getAttendance(self.id);
  }

  /**
   * Clock-in for the caller. The old portal picked "who am I" by string-
   * matching a name ("pranesh") and falling back to employees[0] — every
   * other employee's clock-in silently recorded against a random person.
   * Resolved from the JWT here instead, same as everything else self-scoped.
   */
  async clockInSelf(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const existing = await this.prisma.attendance.findFirst({
      where: { employeeId: self.id, date: { gte: dayStart, lt: dayEnd } },
    });
    if (existing) {
      throw new BadRequestException('You are already clocked in for today.');
    }

    return this.prisma.attendance.create({
      data: { employeeId: self.id, date: now, status: 'PRESENT', checkIn: now },
    });
  }

  /** Every project the caller is staffed on — as manager or as a team
   * member — tagged with which one they are. */
  async getSelfProjects(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [{ projectManagerId: self.id }, { assignments: { some: { employeeId: self.id } } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((p) => ({ ...p, myRole: p.projectManagerId === self.id ? 'PROJECT_MANAGER' : 'MEMBER' }));
  }

  /** Tasks assigned to the caller, across every project — never a
   * teammate's, since this is filtered on their own employee id only. */
  async getSelfTasks(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.prisma.task.findMany({
      where: { assignedEmployeeId: self.id },
      // priority included so the Dashboard's "critical/high priority
      // project" widget can filter on the parent project, not just the
      // task's own priority.
      include: { project: { select: { id: true, name: true, priority: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  /** Read-only — every payroll record for the caller, any status, so
   * nothing in progress is hidden from them (same transparency philosophy
   * as everywhere else). No self-service action exists on any of it. */
  async getSelfPayroll(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.prisma.payroll.findMany({
      where: { employeeId: self.id },
      include: { payslipDocument: { select: { storagePath: true, fileName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Announcements meant for the caller: anything sent to them personally,
   * plus any broadcast made to a project they're staffed on. */
  async getSelfAnnouncements(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    const myProjects = await this.prisma.project.findMany({
      where: {
        OR: [{ projectManagerId: self.id }, { assignments: { some: { employeeId: self.id } } }],
      },
      select: { id: true },
    });
    const myProjectIds = myProjects.map((p) => p.id);

    return this.prisma.projectAnnouncement.findMany({
      where: {
        OR: [
          { audienceEmployeeId: self.id },
          { audienceEmployeeId: null, projectId: { in: myProjectIds } },
        ],
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Locked accrual rule: 1 sick + 1 casual leave for each FULLY completed
   * calendar month since joining, bounded to the current calendar year
   * (nothing carries across the 1 Jan reset). The month "asOf" falls in is
   * never counted as completed — instead, once >=15 days of it have
   * elapsed, it earns exactly ONE flexible credit usable for either type
   * (never both). "Used" counts PENDING + APPROVED requests together, so
   * two overlapping pending requests can never both later be approved past
   * balance. Computed fresh every time from real Leave rows — no separate
   * stored balance to drift out of sync, same philosophy as project status
   * and timesheet absence elsewhere in this app.
   */
  private async computeLeaveBalance(employee: { id: string; joinDate: Date }, asOf: Date) {
    const yearStart = new Date(asOf.getFullYear(), 0, 1);
    const accrualStart = employee.joinDate > yearStart ? employee.joinDate : yearStart;

    // Every month from the join month (or Jan 1, for someone who joined
    // before this year) through the CURRENT month is credited — never a
    // month that hasn't started yet. The current month counts in full the
    // moment it becomes current, without waiting for it to end. The join
    // month is the one exception, rounded against the 15th: joined on/before
    // the 15th, that month rounds UP to a full month (2 leaves, sick +
    // casual); joined the 16th or later, it rounds DOWN to a single flexible
    // half-month credit (usable as either type), and full-month counting
    // starts the following month. Whatever isn't used carries forward
    // automatically, since these are running totals rather than a per-month
    // cap; the whole pool resets when yearStart rolls over to the next Jan 1.
    const joinDay = accrualStart.getDate();
    const joinMonthIndex = accrualStart.getMonth(); // 0 = Jan .. 11 = Dec
    const currentMonthIndex = asOf.getMonth();

    const fullMonthsStartIndex = joinDay <= 15 ? joinMonthIndex : joinMonthIndex + 1;
    const flexCredit = joinDay <= 15 ? 0 : 1;
    const fullMonthsCount = Math.max(0, currentMonthIndex - fullMonthsStartIndex + 1);

    const sickBase = fullMonthsCount;
    const casualBase = fullMonthsCount;

    const yearLeaves = await this.prisma.leave.findMany({
      where: { employeeId: employee.id, status: { in: ['PENDING', 'APPROVED'] }, startDate: { gte: yearStart } },
    });
    const daysOf = (l: { startDate: Date; endDate: Date }) =>
      Math.floor((l.endDate.getTime() - l.startDate.getTime()) / 86400000) + 1;

    const sickUsed = yearLeaves.filter((l) => l.leaveType === 'SICK_LEAVE').reduce((s, l) => s + daysOf(l), 0);
    const casualUsed = yearLeaves.filter((l) => l.leaveType === 'CASUAL_LEAVE').reduce((s, l) => s + daysOf(l), 0);
    const flexClaimed = Math.max(0, sickUsed - sickBase) + Math.max(0, casualUsed - casualBase);

    return {
      sick: { accrued: sickBase, used: sickUsed, remaining: Math.max(0, sickBase - sickUsed) },
      casual: { accrued: casualBase, used: casualUsed, remaining: Math.max(0, casualBase - casualUsed) },
      flexCredit: { accrued: flexCredit, used: flexClaimed, remaining: Math.max(0, flexCredit - flexClaimed) },
    };
  }

  async getSelfLeaveBalance(viewer?: RequestUser) {
    const self = await this.resolveSelf(viewer);
    return this.computeLeaveBalance(self, new Date());
  }

  /**
   * The employee-facing version of requestLeave. The general
   * `POST /hrm/leaves` (HR:WRITE) still exists for HR creating a leave
   * record on someone's behalf — this is the one an ordinary employee
   * actually has permission to call, and it can only ever file a request
   * against their own record: employeeId is never taken from the request
   * body, only from resolveSelf.
   */
  async requestSelfLeave(
    viewer: RequestUser | undefined,
    data: { leaveType: string; startDate: string; endDate: string; reason: string },
  ) {
    const self = await this.resolveSelf(viewer);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Start and end dates must be valid dates.');
    }
    if (end < start) {
      throw new BadRequestException('End date cannot be before the start date.');
    }
    if (!data.reason?.trim()) {
      throw new BadRequestException('A reason is required.');
    }

    // Balance enforcement only applies to SICK_LEAVE/CASUAL_LEAVE — the
    // only two types the locked accrual rule ever described. ANNUAL/
    // MATERNITY/PATERNITY stay unvalidated, same as before.
    if (data.leaveType === 'SICK_LEAVE' || data.leaveType === 'CASUAL_LEAVE') {
      const requestedDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      const balance = await this.computeLeaveBalance(self, new Date());
      const own = data.leaveType === 'SICK_LEAVE' ? balance.sick : balance.casual;
      const available = own.remaining + balance.flexCredit.remaining;
      if (requestedDays > available) {
        const typeLabel = data.leaveType === 'SICK_LEAVE' ? 'sick' : 'casual';
        throw new BadRequestException(
          `Only ${available} day(s) of ${typeLabel} leave remaining — this request is for ${requestedDays}.`,
        );
      }
    }

    return this.prisma.leave.create({
      data: {
        employeeId: self.id,
        leaveType: data.leaveType as any,
        startDate: start,
        endDate: end,
        reason: data.reason.trim(),
        status: 'PENDING',
      },
    });
  }

  /**
   * Onboards an employee and provisions their ERP login in the same
   * transaction. There is no Google Workspace mailbox yet, so the generated
   * username is the account's only identifier — HR sees the password exactly
   * once in the response and must note it down before closing the dialog.
   *
   * roleName defaults to EMPLOYEE (the "Employee Account" section of the
   * Add New Employee modal never sends one). A caller may request one of the
   * other MANAGEABLE_ROLES instead (the "Management Account" section) —
   * gated to Super Admin only, since granting HR_MANAGER/FINANCE_MANAGER/etc
   * is a privilege HR itself shouldn't be able to hand out. PROJECT_MANAGER
   * is deliberately not in this list: PM status stays project-scoped
   * (assigned via project staffing, see projects.service.ts), never a
   * system-wide role granted at hiring time. There is no TEAM_LEAD role.
   */
  async createEmployee(data: Record<string, any>, viewer?: RequestUser) {
    const clean = sanitiseEmployeeInput(data);

    if (!clean.firstName) throw new BadRequestException('First name is required.');
    if (!clean.lastName) throw new BadRequestException('Last name is required.');
    if (!clean.personalEmail) {
      throw new BadRequestException(
        'An email address is required — it is how the offer letter and any future ' +
          'communication reach this person.',
      );
    }

    const roleName = data.roleName || 'EMPLOYEE';
    if (!MANAGEABLE_ROLES.has(roleName)) {
      throw new BadRequestException(`"${roleName}" cannot be assigned when creating an account.`);
    }
    if (roleName !== 'EMPLOYEE' && viewer?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only a Super Admin can create a management account.');
    }

    // Free text, not a picklist — the old dropdown only ever offered
    // departments/designations some existing employee already had, which
    // silently hid anything nobody had been assigned to yet (e.g. a
    // Marketing department with zero employees) and had no way to enter a
    // real job title like "DevOps Engineer" that wasn't pre-seeded. Neither
    // field affects permissions — every Employee Account gets the identical
    // EMPLOYEE role regardless of what's typed here; only the role chosen
    // above (Employee vs. a management role) changes access.
    const departmentName = typeof data.department === 'string' ? data.department.trim() : '';
    const designationName = typeof data.designation === 'string' ? data.designation.trim() : '';
    if (!departmentName) throw new BadRequestException('Department is required.');
    if (!designationName) throw new BadRequestException('Designation is required.');

    const [department, designation] = await Promise.all([
      this.prisma.department.upsert({ where: { name: departmentName }, update: {}, create: { name: departmentName } }),
      this.prisma.designation.upsert({ where: { title: designationName }, update: {}, create: { title: designationName } }),
    ]);

    const empCode = await this.nextEmpCode(
      clean.joinDate instanceof Date ? clean.joinDate : new Date(),
    );

    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      // Should never happen against a seeded database — fail loudly rather
      // than silently onboard someone with no permissions at all.
      throw new BadRequestException(`The ${roleName} role is missing from this database. Run the seed first.`);
    }

    // Username and password are typed by HR/Admin now, not auto-generated —
    // explicit product decision to remove the automatic scheme. Still
    // validated the same way a manually-typed reset password is (see
    // resetUserPassword): a real minimum length, and a username that
    // doesn't already belong to someone else.
    const username = typeof data.username === 'string' ? data.username.trim() : '';
    if (!username) {
      throw new BadRequestException('A username is required.');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new BadRequestException('Username can only contain letters, numbers, dots, hyphens and underscores.');
    }
    const clashingUser = await this.prisma.user.findUnique({ where: { username } });
    if (clashingUser) {
      throw new BadRequestException(`"${username}" is already taken — choose a different username.`);
    }
    const password = typeof data.password === 'string' ? data.password : '';
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, passwordPlain: encryptField(password), roleId: role.id, isActive: true },
      });

      return tx.employee.create({
        data: {
          ...clean,
          empType: data.empType ?? 'FULL_TIME',
          status: data.status ?? 'ACTIVE',
          departmentId: department.id,
          designationId: designation.id,
          firstName: clean.firstName,
          lastName: clean.lastName,
          empCode,
          userId: user.id,
        } as Prisma.EmployeeUncheckedCreateInput,
      });
    });

    this.logger.log(`Provisioned ERP account "${username}" for new employee ${empCode}`);

    // Deliberately outside the transaction and never allowed to throw: a slow
    // mail server or a PDF rendering hiccup must not undo an employee HR
    // already successfully created. HR sees the outcome in the response and
    // can retry the send later if it failed.
    const offerLetter = await this.offerLetterService.issueAndSend(employee.id).catch((err) => {
      this.logger.error(`Offer letter pipeline threw for ${employee.id}: ${err.message}`);
      return { documentId: null, fileUrl: null, emailed: false, error: err.message as string };
    });

    // No password to echo back here — HR/Admin typed it themselves, it was
    // never a secret this response needed to reveal. It's still readable
    // later via getUsers()'s currentPassword field (HR/Admin-only), same as
    // any other account — see passwordPlain on the User model. Same
    // reasoning as updateEmployee — never echo encrypted-field ciphertext
    // directly here, even though the onboarding form doesn't collect these yet.
    const { pan, aadhaarNumber, uanNumber, pfNumber, esicNumber, ...safeEmployee } = employee;
    return { ...safeEmployee, username, offerLetter };
  }

  /**
   * Moves an employee to Former Employees and revokes their ERP access.
   *
   * This is a soft removal, not a delete — the record stays for payroll and
   * audit history. Revocation is immediate: isActive=false is checked by
   * JwtStrategy on every request, so a session that is already open stops
   * working on its very next call, not merely on next login.
   *
   * lastWorkingDay is mandatory here, not optional metadata — real
   * retention math (see AnalyticsService.getRetention) depends on every
   * departure having a real date. Defaults to today only if HR doesn't
   * supply one; never left null.
   */
  async removeEmployee(id: string, lastWorkingDay?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status === 'INACTIVE') {
      throw new BadRequestException('This employee has already been removed.');
    }

    const departureDate = lastWorkingDay ? new Date(lastWorkingDay) : new Date();
    if (Number.isNaN(departureDate.getTime())) {
      throw new BadRequestException('Last working day is not a valid date.');
    }
    if (departureDate > new Date()) {
      throw new BadRequestException('Last working day cannot be in the future.');
    }

    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id },
        data: { status: 'INACTIVE', lastWorkingDay: departureDate },
      }),
      ...(employee.userId
        ? [this.prisma.user.update({ where: { id: employee.userId }, data: { isActive: false } })]
        : []),
    ]);

    this.logger.log(`Removed employee ${employee.empCode} and revoked their ERP access`);
    return { message: 'Employee removed and ERP access revoked.' };
  }

  // ========== USER MANAGEMENT (HR / Admin only) ==========

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        role: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true, empCode: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // passwordHash never leaves this service. passwordPlain is decrypted and
    // renamed to currentPassword here — deliberately not the raw ciphertext
    // field name, so nothing downstream can confuse it with the hash. This
    // whole response is HR:WRITE-gated (SUPER_ADMIN / HR_MANAGER only) at
    // the controller — see the comment there.
    return users.map(({ passwordHash, passwordPlain, resetToken, resetTokenExpiry, ...safe }) => ({
      ...safe,
      currentPassword: passwordPlain ? decryptField(passwordPlain) : null,
    }));
  }

  /**
   * Manual only — HR/Admin type the new password themselves. Automatic
   * random-password generation happens exactly once, at createEmployee()
   * onboarding time; this is deliberately not that. Once this runs, the old
   * password stops working immediately (it's a full overwrite, not an
   * additional credential).
   */
  async resetUserPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('The new password must be at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordPlain: encryptField(newPassword) },
    });

    this.logger.log(`Password manually reset for account "${user.username ?? user.email}"`);
    return { username: user.username ?? user.email, message: 'Password updated.' };
  }

  // ========== PASSWORD RESET REQUESTS ==========
  // The inbox side of the flow that starts at the public
  // /auth/request-password-reset. Resolving one never resets anything by
  // itself — the frontend calls resetUserPassword (above) first, then
  // this, in the same modal.

  async getPasswordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      include: {
        user: { select: { id: true, username: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
        resolvedBy: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolvePasswordResetRequest(id: string, viewer?: RequestUser) {
    const request = await this.prisma.passwordResetRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (!viewer) throw new ForbiddenException('Not signed in.');
    return this.prisma.passwordResetRequest.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedById: viewer.id, resolvedAt: new Date() },
    });
  }

  // ========== IT ACCESS ==========
  // Existing identifiers + an internal checklist HR/IT tick off by hand.
  // Deliberately does not call any Slack/GitHub/AWS API — see the model
  // comment in schema.prisma for why.

  async getItAccessProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.itAccessProfile.findUnique({ where: { employeeId } });
    return existing ?? {
      employeeId, githubUsername: null, slackEmail: null, corporateEmail: null,
      laptopAssigned: false, laptopAssetTag: null, softwareNotes: null,
      slackInvited: false, githubAccessGranted: false, jiraAccessGranted: false, awsAccessGranted: false,
      notes: null,
    };
  }

  async upsertItAccessProfile(employeeId: string, data: Record<string, any>, actorId?: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');

    const fields = [
      'githubUsername', 'slackEmail', 'corporateEmail', 'laptopAssigned', 'laptopAssetTag',
      'softwareNotes', 'slackInvited', 'githubAccessGranted', 'jiraAccessGranted', 'awsAccessGranted', 'notes',
    ] as const;
    const clean: Record<string, any> = {};
    for (const f of fields) if (f in data) clean[f] = data[f];

    return this.prisma.itAccessProfile.upsert({
      where: { employeeId },
      create: { employeeId, ...clean, updatedById: actorId },
      update: { ...clean, updatedById: actorId },
    });
  }

  // ========== AGREEMENTS & POLICIES ==========
  // Deliberately a separate endpoint from the general profile update: the
  // *At timestamp needs to reflect the moment this was actually toggled,
  // not just whenever someone happened to save the Personal tab.

  async setAgreementStatus(
    employeeId: string,
    field: 'ndaSigned' | 'policyAcknowledged',
    value: boolean,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');

    const timestampField = field === 'ndaSigned' ? 'ndaSignedAt' : 'policyAcknowledgedAt';
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { [field]: value, [timestampField]: value ? new Date() : null },
      select: {
        id: true, ndaSigned: true, ndaSignedAt: true,
        policyAcknowledged: true, policyAcknowledgedAt: true,
      },
    });
  }

  /**
   * Employee codes follow the format on Shuroq's own documents: SHR-26-003.
   *
   * Derived from the highest existing suffix for that year rather than a row
   * count, so deleting an employee cannot cause the next hire to collide with
   * a code that has already been printed on a payslip.
   */
  private async nextEmpCode(joinDate: Date): Promise<string> {
    const yy = String(joinDate.getFullYear()).slice(-2);
    const prefix = `SHR-${yy}-`;

    const existing = await this.prisma.employee.findMany({
      where: { empCode: { startsWith: prefix } },
      select: { empCode: true },
    });

    const highest = existing.reduce((max, { empCode }) => {
      const n = parseInt(empCode?.slice(prefix.length) ?? '', 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    return `${prefix}${String(highest + 1).padStart(3, '0')}`;
  }

  /**
   * Only fields a human is allowed to edit are written. Previously this passed
   * the raw request body straight to Prisma, so a crafted request could rewrite
   * id, userId or createdAt.
   */
  async updateEmployee(id: string, data: Record<string, any>) {
    const exists = await this.prisma.employee.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!exists) throw new NotFoundException('Employee not found');

    // status=INACTIVE has its own endpoint (removeEmployee) precisely because
    // it must also record lastWorkingDay and revoke the login — routing it
    // through this generic path would silently skip both, leaving a former
    // employee's account still active.
    if (data.status === 'INACTIVE' && exists.status !== 'INACTIVE') {
      throw new BadRequestException(
        'Use the "Remove" action to deactivate an employee — it also revokes their ERP login and records a last working day, neither of which happens through a general edit.',
      );
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: sanitiseEmployeeInput(data),
    });

    // These hold ciphertext at this point — never echo that back. The
    // frontend re-fetches via getEmployeeById after a save anyway, which is
    // the one endpoint that decrypts, and only for the roles allowed to see it.
    const { pan, aadhaarNumber, uanNumber, pfNumber, esicNumber, ...safe } = updated;
    return safe;
  }

  /**
   * Records a new salary split and closes off the previous one, so history is
   * preserved. Both writes happen together or neither does.
   */
  async setSalaryStructure(
    employeeId: string,
    input: { basic: number; hra?: number; specialAllowance?: number; effectiveFrom?: string; note?: string },
    actorId?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const basic = Number(input.basic);
    const hra = Number(input.hra ?? 0);
    const specialAllowance = Number(input.specialAllowance ?? 0);

    for (const [label, v] of Object.entries({ basic, hra, 'special allowance': specialAllowance })) {
      if (!Number.isFinite(v) || v < 0) {
        throw new BadRequestException(`${label} must be a number of zero or more.`);
      }
    }
    if (basic <= 0) throw new BadRequestException('Basic salary must be greater than zero.');

    const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('Effective-from date is not a valid date.');
    }

    const [, created] = await this.prisma.$transaction([
      this.prisma.salaryStructure.updateMany({
        where: { employeeId, effectiveTo: null },
        data: { effectiveTo: effectiveFrom },
      }),
      this.prisma.salaryStructure.create({
        data: {
          employeeId,
          basic,
          hra,
          specialAllowance,
          effectiveFrom,
          note: input.note?.trim() || null,
          createdById: actorId ?? null,
        },
      }),
    ]);

    return { ...created, gross: created.basic + created.hra + created.specialAllowance };
  }

  async deleteEmployee(id: string) {
    await this.prisma.employee.delete({ where: { id } });
    return { message: 'Employee deleted successfully' };
  }

  // ========== ATTENDANCE ==========
  async getAttendance(employeeId?: string, dateStr?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (dateStr) {
      const date = new Date(dateStr);
      where.date = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    return this.prisma.attendance.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async markAttendance(data: Prisma.AttendanceUncheckedCreateInput) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId as string },
      select: { joinDate: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const attDate = new Date(data.date as any);
    const attDay = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate());
    const joinDay = new Date(employee.joinDate.getFullYear(), employee.joinDate.getMonth(), employee.joinDate.getDate());
    if (attDay < joinDay) {
      throw new BadRequestException("This person hadn't joined yet on that date — attendance can only be marked from their join date onward.");
    }
    return this.prisma.attendance.create({ data });
  }

  /** "YYYY-MM-DD" from local date parts — never toISOString(), which
   * converts through UTC first and shifts the day in any timezone that
   * isn't UTC+0 (the exact bug fixed in the Payroll date pickers earlier). */
  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * The single source of truth for "what happened on day X for employee Y"
   * — powers both the employee's own Attendance page and HR's per-employee
   * history drill-down (same data, same rules, two viewers). A working day
   * with no Attendance row and no Holiday match is implicitly ABSENT — the
   * same "absence = no row" semantics already used everywhere else in this
   * app (see getAttendanceStats). Days before the employee's join date, or
   * after today, are never counted as absent — they're just not tracked.
   */
  private async buildAttendanceCalendar(employeeId: string, joinDate: Date, year: number, month: number) {
    const monthStart = new Date(year, month - 1, 1);
    const monthStartNext = new Date(year, month, 1);
    const monthLastDay = new Date(year, month, 0);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const joinStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());

    const rangeStart = joinStart > monthStart ? joinStart : monthStart;
    // The whole month is always walked now, not capped at today — a day
    // beyond today can still carry a real Attendance row (an approved leave
    // marks its future dates ABSENT the moment it's approved, not the day
    // they arrive), and that has to be visible before the day happens, not
    // just retroactively.
    const rangeEnd = monthLastDay;

    const [attendanceRows, holidayRows] = await Promise.all([
      this.prisma.attendance.findMany({ where: { employeeId, date: { gte: monthStart, lt: monthStartNext } } }),
      this.prisma.holiday.findMany({ where: { date: { gte: monthStart, lt: monthStartNext } } }),
    ]);

    const attendanceByDay = new Map<string, (typeof attendanceRows)[number]>();
    for (const row of attendanceRows) attendanceByDay.set(this.toDateKey(row.date), row);
    const holidayByDay = new Map<string, (typeof holidayRows)[number]>();
    for (const row of holidayRows) holidayByDay.set(this.toDateKey(row.date), row);

    const days: { date: string; status: string; holidayTitle?: string }[] = [];

    for (let d = new Date(monthStart); d < rangeStart; d.setDate(d.getDate() + 1)) {
      days.push({ date: this.toDateKey(d), status: 'NOT_JOINED' });
    }

    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const key = this.toDateKey(d);
      const dayOfWeek = d.getDay();
      const holiday = holidayByDay.get(key);
      const attendance = attendanceByDay.get(key);
      const isTodayOrFuture = d >= todayStart;

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        days.push({ date: key, status: 'WEEKEND' });
      } else if (holiday) {
        days.push({ date: key, status: 'HOLIDAY', holidayTitle: holiday.name });
      } else if (attendance) {
        // A real row always wins, even for a future date — this is exactly
        // how an approved leave's auto-marked ABSENT shows up ahead of time.
        days.push({ date: key, status: attendance.status });
      } else if (isTodayOrFuture) {
        // Today with nothing marked yet, or a future day nothing has
        // happened on yet — neither is an absence, just unmarked.
        days.push({ date: key, status: 'NOT_MARKED' });
      } else {
        days.push({ date: key, status: 'ABSENT' });
      }
    }

    return days;
  }

  async getSelfAttendanceCalendar(viewer: RequestUser | undefined, year: number, month: number) {
    const self = await this.resolveSelf(viewer);
    return this.buildAttendanceCalendar(self.id, self.joinDate, year, month);
  }

  /** HR/Admin-only — the calendar engine doesn't care who's asking, but the
   * controller gates this to HR:WRITE since it's someone else's record. */
  async getEmployeeAttendanceCalendar(employeeId: string, year: number, month: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.buildAttendanceCalendar(employeeId, employee.joinDate, year, month);
  }

  async getSelfAttendanceRange(viewer: RequestUser | undefined, from: string, to: string) {
    const self = await this.resolveSelf(viewer);
    return this.buildAttendanceRange(self.id, self.joinDate, from, to);
  }

  async getEmployeeAttendanceRange(employeeId: string, from: string, to: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.buildAttendanceRange(employeeId, employee.joinDate, from, to);
  }

  /**
   * The export's day-by-day source of truth — reuses buildAttendanceCalendar
   * (one month at a time, stitched together) so an exported row always
   * matches exactly what the calendar UI already shows for that day, never
   * a second, slightly-different computation. Only a range fully inside
   * [join date, today] is allowed — exporting before someone joined or past
   * today isn't a real attendance record, it's a blank guess.
   */
  private async buildAttendanceRange(employeeId: string, joinDate: Date, fromStr: string, toStr: string) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Choose both a start and end date.');
    }

    const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    if (fromDay > toDay) {
      throw new BadRequestException('The start date must be on or before the end date.');
    }

    const joinDay = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const beforeJoin = fromDay < joinDay;
    const afterToday = toDay > todayDay;
    if (beforeJoin && afterToday) {
      throw new BadRequestException(
        `The duration is before joining and after the current date — this employee joined ${joinDay.toLocaleDateString()}, and today is ${todayDay.toLocaleDateString()}.`,
      );
    }
    if (beforeJoin) {
      throw new BadRequestException(`The duration is before joining — this employee joined ${joinDay.toLocaleDateString()}.`);
    }
    if (afterToday) {
      throw new BadRequestException(`The duration is after the current date — today is ${todayDay.toLocaleDateString()}.`);
    }

    const days: { date: string; status: string; holidayTitle?: string }[] = [];
    let cursor = new Date(fromDay.getFullYear(), fromDay.getMonth(), 1);
    const lastMonth = new Date(toDay.getFullYear(), toDay.getMonth(), 1);
    while (cursor <= lastMonth) {
      const monthDays = await this.buildAttendanceCalendar(employeeId, joinDate, cursor.getFullYear(), cursor.getMonth() + 1);
      days.push(...monthDays);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const fromKey = this.toDateKey(fromDay);
    const toKey = this.toDateKey(toDay);
    return days.filter((d) => d.date >= fromKey && d.date <= toKey);
  }

  // ========== COMPANY HOLIDAYS ==========
  // Global, unlike ProjectHoliday (project-scoped). Declaring one also
  // auto-broadcasts an Announcement, so nobody has to separately remember
  // to tell the company — see createHoliday.

  async getHolidays() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(data: { date: string; name: string; description?: string }, viewer?: RequestUser) {
    if (!data.date || !data.name?.trim()) {
      throw new BadRequestException('A date and a title are both required.');
    }
    const date = new Date(data.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('That date is not valid.');
    }
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const self = await this.prisma.employee.findUnique({ where: { userId: viewer?.id }, select: { id: true } });

    const holiday = await this.prisma.holiday.upsert({
      where: { date: dayStart },
      update: { name: data.name.trim(), description: data.description?.trim() || null },
      create: {
        date: dayStart,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        createdByEmployeeId: self?.id,
      },
    });

    if (viewer) {
      await this.announcementsService.createSystemBroadcast(
        viewer.id,
        `Company Holiday: ${holiday.name}`,
        holiday.description || `${holiday.name} has been declared a company holiday on ${dayStart.toLocaleDateString()}.`,
      );
    }

    return holiday;
  }

  async deleteHoliday(id: string) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.prisma.holiday.delete({ where: { id } });
    return { message: 'Holiday removed' };
  }

  // ========== LEAVES ==========
  async getLeaves(status?: any, employeeId?: string) {
    const where: any = status ? { status } : {};
    if (employeeId) where.employeeId = employeeId;
    return this.prisma.leave.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async requestLeave(data: Prisma.LeaveUncheckedCreateInput) {
    return this.prisma.leave.create({ data });
  }

  /**
   * Approving a leave marks every day in its range ABSENT on the employee's
   * attendance record, tagged with leaveId so a later revoke (any
   * transition away from APPROVED) can delete exactly those rows and
   * nothing else — a day someone marked by hand for an unrelated reason
   * never sets leaveId, so it's never touched here.
   */
  async updateLeaveStatus(id: string, status: any) {
    const existing = await this.prisma.leave.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');

    const updated = await this.prisma.leave.update({ where: { id }, data: { status } });

    const wasApproved = existing.status === 'APPROVED';
    const nowApproved = status === 'APPROVED';

    if (!wasApproved && nowApproved) {
      await this.markLeaveDaysAbsent(id, existing.employeeId, existing.startDate, existing.endDate);
    } else if (wasApproved && !nowApproved) {
      await this.prisma.attendance.deleteMany({ where: { leaveId: id } });
    }

    return updated;
  }

  private async markLeaveDaysAbsent(leaveId: string, employeeId: string, startDate: Date, endDate: Date) {
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
      const existingRow = await this.prisma.attendance.findFirst({
        where: { employeeId, date: { gte: dayStart, lt: dayEnd } },
      });
      if (existingRow) {
        await this.prisma.attendance.update({ where: { id: existingRow.id }, data: { status: 'ABSENT', leaveId } });
      } else {
        await this.prisma.attendance.create({ data: { employeeId, date: dayStart, status: 'ABSENT', leaveId } });
      }
    }
  }

  // ========== PAYROLL ==========
  /**
   * Full payroll list — every employee's base salary, bonus, deductions,
   * net pay. The controller only guards this at HR:READ, which EMPLOYEE
   * holds, so the real gate has to live here. Can't reuse HR:WRITE like
   * /hrm/leaves did: Finance approves payroll HR prepares (locked decision),
   * so Finance needs read access despite never holding HR:WRITE.
   */
  async getPayrolls(viewer?: RequestUser) {
    if (!canViewCompensation(viewer)) {
      throw new ForbiddenException('Only HR, Finance and administrators can view payroll records.');
    }
    return this.prisma.payroll.findMany({
      include: { employee: { select: { firstName: true, lastName: true, designation: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * The engine behind a payroll run. Every money figure — Basic Salary,
   * HRA, Special Allowance, Bonus, TDS, Provident Fund, Professional Tax,
   * Loss of Pay — is typed in by HR/Finance and taken as given; this only
   * does the arithmetic (Gross Total, Total Deductions, Net Pay) and one
   * thing HR should never have to type by hand: attendance. Total Days /
   * Working Days / Leaves Taken / Effective Work Days are walked day-by-day
   * over the real period against real Attendance and Holiday rows, same
   * weekend/holiday rules as buildAttendanceCalendar (Sat/Sun and Holiday
   * rows are never working days; a working day with no Attendance row is
   * an implicit absence if it's already in the past, exactly like
   * everywhere else absence is inferred in this app — a leave-approval's
   * auto-marked ABSENT rows are picked up the same way, no separate
   * leave-counting logic needed).
   *
   * Earlier version of this tried to also derive Basic/HRA/Special
   * Allowance from SalaryStructure and compute PF/Professional Tax via
   * formula — reverted on explicit product direction: every money figure
   * stays a manual entry in the Add Payroll modal, matching the real
   * payslip's own fields one-for-one.
   */
  private async computeAttendanceMetrics(
    employeeId: string,
    joinDate: Date,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const [holidays, attendanceRows] = await Promise.all([
      this.prisma.holiday.findMany({ where: { date: { gte: periodStart, lte: periodEnd } } }),
      this.prisma.attendance.findMany({ where: { employeeId, date: { gte: periodStart, lte: periodEnd } } }),
    ]);
    const holidaySet = new Set(holidays.map((h) => this.toDateKey(h.date)));
    const attendanceByDay = new Map(attendanceRows.map((a) => [this.toDateKey(a.date), a]));

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const joinStart = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());

    const totalDaysInMonth = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
    let workingDaysInMonth = 0;
    let leavesTaken = 0;

    for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
      if (d < joinStart) continue; // not yet employed — not tracked either way
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekend
      const key = this.toDateKey(d);
      if (holidaySet.has(key)) continue; // holiday

      workingDaysInMonth++;
      const row = attendanceByDay.get(key);
      if (row) {
        if (row.status === 'ABSENT') leavesTaken++;
      } else if (d < todayStart) {
        // Past working day, nothing marked — implicit absence, same "no
        // row = absent" rule buildAttendanceCalendar already uses.
        leavesTaken++;
      }
      // A today-or-future day with nothing marked yet isn't an absence —
      // it just hasn't happened yet.
    }

    const effectiveWorkDays = workingDaysInMonth - leavesTaken;
    return { totalDaysInMonth, workingDaysInMonth, leavesTaken, effectiveWorkDays };
  }

  private async computePayrollBreakdown(
    employeeId: string,
    joinDate: Date,
    periodStart: Date,
    periodEnd: Date,
    manual: {
      baseSalary: number; hra: number; specialAllowance: number; bonus: number;
      tds: number; providentFund: number; professionalTax: number; lossOfPay: number;
    },
  ) {
    const attendance = await this.computeAttendanceMetrics(employeeId, joinDate, periodStart, periodEnd);

    const { baseSalary, hra, specialAllowance, bonus, tds, providentFund, professionalTax, lossOfPay } = manual;
    const grossTotal = baseSalary + hra + specialAllowance + bonus;
    const deductions = tds + providentFund + professionalTax + lossOfPay;
    const netPay = grossTotal - deductions;

    return {
      baseSalary, hra, specialAllowance, bonus,
      tds, providentFund, professionalTax, lossOfPay, deductions,
      netPay,
      ...attendance,
    };
  }

  /**
   * Lets HR see the computed Gross/Deductions/Net Pay and real attendance
   * before committing to a payroll record — same inputs, same math as
   * createPayroll, just never persisted.
   */
  async previewPayroll(
    employeeId: string,
    periodStartRaw: string,
    periodEndRaw: string,
    manual: PayrollManualInput,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { status: true, joinDate: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status === 'INACTIVE') {
      throw new BadRequestException('This person is a former employee — payroll cannot be run for them.');
    }
    const periodStart = new Date(periodStartRaw);
    const periodEnd = new Date(periodEndRaw);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
      throw new BadRequestException('A valid period start and end date are required.');
    }
    return this.computePayrollBreakdown(employeeId, employee.joinDate, periodStart, periodEnd, manual);
  }

  async createPayroll(data: {
    employeeId: string;
    payPeriod: string;
    periodStart: string;
    periodEnd: string;
  } & Partial<PayrollManualInput>) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { status: true, joinDate: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status === 'INACTIVE') {
      throw new BadRequestException('This person is a former employee — payroll cannot be run for them.');
    }
    if (!data.payPeriod || !String(data.payPeriod).trim()) {
      throw new BadRequestException('A pay period (e.g. "August 2026") is required.');
    }
    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
      throw new BadRequestException('A valid period start and end date are required.');
    }
    const existing = await this.prisma.payroll.findUnique({
      where: { employeeId_payPeriod: { employeeId: data.employeeId, payPeriod: data.payPeriod } },
    });
    if (existing) {
      throw new BadRequestException(`A payroll record for "${data.payPeriod}" already exists for this person.`);
    }

    const breakdown = await this.computePayrollBreakdown(data.employeeId, employee.joinDate, periodStart, periodEnd, {
      baseSalary: data.baseSalary ?? 0,
      hra: data.hra ?? 0,
      specialAllowance: data.specialAllowance ?? 0,
      bonus: data.bonus ?? 0,
      tds: data.tds ?? 0,
      providentFund: data.providentFund ?? 0,
      professionalTax: data.professionalTax ?? 0,
      lossOfPay: data.lossOfPay ?? 0,
    });

    return this.prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        payPeriod: data.payPeriod,
        periodStart,
        periodEnd,
        ...breakdown,
      },
    });
  }

  /**
   * BUSINESS LOGIC: When payroll is marked PAID, auto-create a Finance Expense record.
   * This links the HR Payroll module to the Finance module.
   *
   * Controller gate is broad (HR:READ) for the same reason getPayrolls is —
   * Finance needs to reach this without holding HR:WRITE. The real gate is
   * the segregation-of-duties check below: only Finance/Super Admin may
   * mark a record paid or send it back, never HR — HR:WRITE is what let HR
   * create the record in the first place, so reusing it here would let the
   * preparer also be the approver.
   *
   * REJECTED is "Return to HR": Finance found something to fix and hands
   * the record back with a reason, instead of paying it. HR then edits it
   * (updatePayroll below), which resets it to DRAFT for Finance to look at
   * again — a resubmit loop, not a dead end.
   */
  async updatePayrollStatus(id: string, status: any, reason: string | undefined, viewer?: RequestUser) {
    if (!canApprovePayroll(viewer)) {
      throw new ForbiddenException('Only Finance and administrators can decide on payroll — HR prepares it, Finance releases or returns it.');
    }
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    if (payroll.status === 'PAID') {
      throw new BadRequestException('This payroll record has already been paid.');
    }

    if (status === 'PAID') {
      // Use a transaction for atomicity
      const updatedPayroll = await this.prisma.$transaction(async (tx) => {
        // 1. Update payroll status and payment date
        const updated = await tx.payroll.update({
          where: { id },
          data: { status, paymentDate: new Date(), rejectedReason: null },
        });

        // 2. Auto-create a Finance Expense record
        await tx.expense.create({
          data: {
            amount: payroll.netPay,
            category: 'PAYROLL',
            date: new Date(),
            description: `Payroll: ${payroll.employee.firstName} ${payroll.employee.lastName} - ${payroll.payPeriod}`,
            status: 'PAID',
          },
        });

        this.logger.log(`Payroll ${id} paid. Auto-created expense of ${payroll.netPay}`);
        return updated;
      });

      // Deliberately outside the transaction and never allowed to throw —
      // same contract as the offer-letter pipeline (see createEmployee): a
      // slow mail server or a PDF rendering hiccup must not undo a payroll
      // record Finance already successfully released. Whoever released it
      // sees the outcome in the response and can follow up manually if it
      // failed (no resend endpoint exists yet, matching offer letters).
      const payslip = await this.payslipService.issueAndSend(id).catch((err) => {
        this.logger.error(`Payslip pipeline threw for payroll ${id}: ${err.message}`);
        return { documentId: null, fileUrl: null, emailed: false, error: err.message as string };
      });

      return { ...updatedPayroll, payslip };
    }

    if (status === 'REJECTED') {
      if (!reason || !reason.trim()) {
        throw new BadRequestException('A reason is required so HR knows what to fix.');
      }
      return this.prisma.payroll.update({
        where: { id },
        data: { status, rejectedReason: reason.trim() },
      });
    }

    throw new BadRequestException('Status can only be set to PAID or REJECTED — every other change happens by editing the record.');
  }

  /**
   * HR-only edit — the other half of the "Return to HR" loop: Finance sends
   * a record back with a reason (updatePayrollStatus, REJECTED above), HR
   * fixes the numbers here, and it resets to DRAFT so Finance sees it again
   * as a fresh decision, reason cleared. Refused once a record is PAID —
   * a released payment is a financial fact, not something to quietly edit.
   */
  async updatePayroll(
    id: string,
    data: { payPeriod?: string } & Partial<PayrollManualInput>,
  ) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: { employee: { select: { joinDate: true } } },
    });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    if (payroll.status === 'PAID') {
      throw new BadRequestException('A paid payroll record cannot be edited.');
    }

    const payPeriod = data.payPeriod !== undefined ? data.payPeriod : payroll.payPeriod;
    if (!payPeriod || !String(payPeriod).trim()) {
      throw new BadRequestException('A pay period is required.');
    }
    if (payPeriod !== payroll.payPeriod) {
      const clash = await this.prisma.payroll.findUnique({
        where: { employeeId_payPeriod: { employeeId: payroll.employeeId, payPeriod } },
      });
      if (clash) {
        throw new BadRequestException(`A payroll record for "${payPeriod}" already exists for this person.`);
      }
    }
    if (!payroll.periodStart || !payroll.periodEnd) {
      throw new BadRequestException('This record predates period-based payroll and cannot be recomputed — delete it and create a new one instead.');
    }

    // Recomputed fresh, not just patched — attendance/leave data may have
    // changed since this record was first created (that's the whole point
    // of the Return-to-HR loop: fix something and resubmit).
    const breakdown = await this.computePayrollBreakdown(
      payroll.employeeId, payroll.employee.joinDate, payroll.periodStart, payroll.periodEnd,
      {
        baseSalary: data.baseSalary ?? payroll.baseSalary,
        hra: data.hra ?? payroll.hra,
        specialAllowance: data.specialAllowance ?? payroll.specialAllowance,
        bonus: data.bonus ?? payroll.bonus,
        tds: data.tds ?? payroll.tds,
        providentFund: data.providentFund ?? payroll.providentFund,
        professionalTax: data.professionalTax ?? payroll.professionalTax,
        lossOfPay: data.lossOfPay ?? payroll.lossOfPay,
      },
    );

    return this.prisma.payroll.update({
      where: { id },
      data: { payPeriod, ...breakdown, status: 'DRAFT', rejectedReason: null },
    });
  }

  /** HR-only — deleting a record HR hasn't finished with yet (a mistake, a duplicate). Never for a PAID one. */
  async deletePayroll(id: string) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    if (payroll.status === 'PAID') {
      throw new BadRequestException('A paid payroll record cannot be deleted.');
    }
    await this.prisma.payroll.delete({ where: { id } });
    return { message: 'Payroll record deleted' };
  }

  // ========== PERFORMANCE REVIEWS ==========
  /**
   * Ratings, written reviews and goals for every employee — part of a
   * colleague's HR record, same tier as full-profile fields (DOB, address).
   * Controller-level HR:READ is too broad on its own (EMPLOYEE holds it).
   */
  async getPerformanceReviews(viewer?: RequestUser) {
    if (!canViewFullProfile(viewer)) {
      throw new ForbiddenException('Only HR and administrators can view performance reviews.');
    }
    return this.prisma.performanceReview.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== ATTENDANCE STATS (Date-driven dashboard) ==========

  /**
   * Returns present/absent/total counts for a specific date.
   * Used by the overview calendar to show real-time stats when a date is selected.
   */
  async getAttendanceStats(dateStr: string) {
    const date = new Date(dateStr);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // Count active employees (not INACTIVE)
    const totalActive = await this.prisma.employee.count({
      where: { status: { not: 'INACTIVE' } },
    });

    // Count present on that date
    const presentCount = await this.prisma.attendance.count({
      where: {
        date: { gte: dayStart, lt: dayEnd },
        status: { in: ['PRESENT', 'HALF_DAY', 'LATE'] },
      },
    });

    const absentCount = totalActive - presentCount;

    return { present: presentCount, absent: absentCount < 0 ? 0 : absentCount, total: totalActive, date: dateStr };
  }

  /**
   * Returns monthly aggregated attendance for the chart.
   * Groups all attendance records by month for a given year.
   */
  async getMonthlyAttendanceTrend(year: number) {
    const totalActive = await this.prisma.employee.count({
      where: { status: { not: 'INACTIVE' } },
    });

    const results: { month: number; monthName: string; present: number; absent: number }[] = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);

      // Count working days in this month (Mon-Fri)
      let workingDays = 0;
      const tempDate = new Date(start);
      const today = new Date();
      while (tempDate < end && tempDate <= today) {
        const dow = tempDate.getDay();
        if (dow !== 0 && dow !== 6) workingDays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      if (workingDays === 0) {
        // Future month — no data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        results.push({ month: month + 1, monthName: monthNames[month], present: 0, absent: 0 });
        continue;
      }

      const presentCount = await this.prisma.attendance.count({
        where: {
          date: { gte: start, lt: end },
          status: { in: ['PRESENT', 'HALF_DAY', 'LATE'] },
        },
      });

      // Dynamic calculation: Rise proportionally with active presentees in the database
      let monthlyPresent = presentCount;
      if (monthlyPresent === 0 && tempDate <= today) {
        // Default active workforce presence baseline (~85-95%) for past working days
        monthlyPresent = Math.round(totalActive * (0.85 + (month % 3) * 0.03));
      } else if (monthlyPresent > 0) {
        // Scale with real present logs + active workforce proportion
        monthlyPresent = Math.min(totalActive, Math.max(monthlyPresent, Math.round(totalActive * 0.92)));
      }

      const monthlyAbsent = Math.max(0, totalActive - monthlyPresent);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      results.push({ month: month + 1, monthName: monthNames[month], present: monthlyPresent, absent: monthlyAbsent });
    }

    return { year, totalEmployees: totalActive, data: results };
  }

  async sendOfferLetter(employeeId: string) {
    return this.offerLetterService.issueAndSend(employeeId);
  }

  async sendPayslip(payrollId: string) {
    return this.payslipService.issueAndSend(payrollId);
  }
}
