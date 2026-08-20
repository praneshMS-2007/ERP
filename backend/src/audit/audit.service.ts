import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  role?: string | null;
  department?: string | null;
  actionType?: string;       // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, EXPORT
  action: string;            // e.g. "POST /api/hrm/employees"
  module: string;            // HR, INVENTORY, FINANCE, CRM, PROJECTS, ADMIN, SETTINGS
  entityType?: string | null;
  entityId?: string | null;
  targetLabel?: string | null; // The name/title of the affected record
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | string | null;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordplain',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'pan',
  'bankaccountno',
  'accountnumber',
  'ssn',
  'aadhaar',
  'aadhar',
]);

/** Recursively sanitize objects to redact credentials and sensitive PII */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const safe: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_KEYS.has(lower) ||
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('creditcard')
    ) {
      safe[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      safe[key] = sanitizePayload(val);
    } else {
      safe[key] = val;
    }
  }
  return safe;
}

function formatRoleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN:       'Super Admin',
    HR_MANAGER:        'HR Manager',
    FINANCE_MANAGER:   'Finance Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
    CRM_MANAGER:       'CRM Manager',
    PROJECT_MANAGER:   'Project Manager',
    TEAM_LEAD:         'Team Lead',
    EMPLOYEE:          'Employee',
  };
  return map[role] || role;
}

const ACTION_VERBS: Record<string, string> = {
  CREATE:        'created',
  UPDATE:        'updated',
  DELETE:        'deleted',
  STATUS_CHANGE: 'changed status of',
  LOGIN:         'logged into the system',
  EXPORT:        'exported',
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      let userName = entry.userName;
      let userEmail = entry.userEmail;
      let role = entry.role;
      let department = entry.department;

      // ───────────────────────────────────────────────────────────────
      // AUTO-LOOKUP: Resolve the actor's real identity from the database
      // This is what makes descriptions like "HR Manager Neha Kapoor"
      // instead of "System" or "hr@shuroq.com" — no mocking, real DB query.
      // ───────────────────────────────────────────────────────────────
      if (entry.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
          include: {
            role: true,
            employee: { include: { department: true, designation: true } },
          },
        });

        if (user) {
          userEmail = user.email || user.username || userEmail || 'unknown';
          role = user.role?.name || role || 'USER';

          if (user.employee) {
            userName = `${user.employee.firstName} ${user.employee.lastName}`.trim();
            department = user.employee.department?.name || department || 'General';
          } else {
            // Admin accounts without an employee record
            userName = user.username || user.email || userName || 'Admin User';
            department = department || 'Management';
          }
        }
      }

      // ───────────────────────────────────────────────────────────────
      // SANITIZE PAYLOAD: Redact passwords, tokens, bank details
      // ───────────────────────────────────────────────────────────────
      let detailsJson: string | null = null;
      if (entry.details) {
        try {
          const raw = typeof entry.details === 'string'
            ? JSON.parse(entry.details)
            : entry.details;
          detailsJson = JSON.stringify(sanitizePayload(raw));
        } catch {
          detailsJson = typeof entry.details === 'string'
            ? entry.details
            : JSON.stringify(entry.details);
        }
      }

      // ───────────────────────────────────────────────────────────────
      // GENERATE DESCRIPTION: Build a real, human-readable, actor-aware
      // sentence that tells the Super Admin exactly what happened.
      // ───────────────────────────────────────────────────────────────
      const actionType = entry.actionType || 'UPDATE';
      const actorName = userName || 'System User';
      const actorRole = role || 'USER';
      const entityType = entry.entityType || 'Record';
      const module = entry.module || 'OTHER';
      const targetLabel = entry.targetLabel || '';
      const entityId = entry.entityId;

      const description = entry.description || this.buildDescription({
        actorName,
        actorRole,
        actionType,
        entityType,
        module,
        targetLabel,
        entityId,
        action: entry.action,
        details: entry.details,
      });

      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          userName: userName ?? null,
          userEmail: userEmail ?? null,
          role: role ?? null,
          department: department ?? null,
          actionType,
          action: entry.action,
          module: entry.module,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          description,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          details: detailsJson,
        },
      });
    } catch (err) {
      // Audit writes must never fail the user's actual request
      this.logger.error(`Failed to write audit log entry: ${err}`);
    }
  }

  /**
   * Build a rich, production-quality description that tells the Super Admin
   * exactly WHO did WHAT to WHICH record.
   *
   * Real examples:
   *   "HR Manager Neha Kapoor created new Employee 'Farhan Ali' [department: Engineering, type: FULL_TIME] in HR module"
   *   "Finance Manager Elena Choi updated Invoice 'INV-2026-0045' in Finance module"
   *   "Super Admin Admin User deleted User Account (ID: a3f2c901...) in Admin module"
   *   "HR Manager Neha Kapoor generated Offer Letter for Employee 'Rohan Verma' in HR module"
   *   "HR Manager Neha Kapoor changed status of Payroll 'July 2026' to 'APPROVED' in HR module"
   *   "Super Admin Admin User logged into the system"
   */
  private buildDescription(d: {
    actorName: string;
    actorRole: string;
    actionType: string;
    entityType: string;
    module: string;
    targetLabel: string;
    entityId?: string | null;
    action: string;
    details?: Record<string, any> | string | null;
  }): string {
    const roleLabel = formatRoleLabel(d.actorRole);
    const actor = `${roleLabel} ${d.actorName}`;
    const route = d.action.toLowerCase();

    // ── LOGIN ──────────────────────────────────────────────
    if (d.actionType === 'LOGIN') {
      return `${actor} logged into the system`;
    }

    // ── OFFER LETTER GENERATION ────────────────────────────
    if (route.includes('/offer-letter')) {
      const target = d.targetLabel ? ` '${d.targetLabel}'` : (d.entityId ? ` (ID: ${d.entityId.slice(0, 8)}...)` : '');
      return `${actor} generated Offer Letter for Employee${target} in ${d.module} module`;
    }

    // ── SALARY STRUCTURE UPDATE ────────────────────────────
    if (route.includes('/salary') && !route.includes('/salary-structures')) {
      const target = d.targetLabel ? ` '${d.targetLabel}'` : (d.entityId ? ` (ID: ${d.entityId.slice(0, 8)}...)` : '');
      return `${actor} updated Salary Structure for Employee${target} in ${d.module} module`;
    }

    // ── PAYSLIP GENERATION ─────────────────────────────────
    if (route.includes('/payslip')) {
      const body = typeof d.details === 'object' && d.details !== null ? d.details : {};
      const reqBody = (body as any).request || body;
      const period = reqBody?.payPeriod || reqBody?.month || '';
      const periodStr = period ? ` for period ${period}` : '';
      const target = d.targetLabel ? ` for '${d.targetLabel}'` : '';
      return `${actor} generated Payslip${target}${periodStr} in ${d.module} module`;
    }

    // ── STATUS CHANGE ──────────────────────────────────────
    if (d.actionType === 'STATUS_CHANGE') {
      const body = typeof d.details === 'object' && d.details !== null ? d.details : {};
      const reqBody = (body as any).request || body;
      const statusTo = reqBody?.status ? ` to '${reqBody.status}'` : '';
      const target = d.targetLabel ? ` '${d.targetLabel}'` : (d.entityId ? ` (ID: ${d.entityId.slice(0, 8)}...)` : '');
      return `${actor} changed status of ${d.entityType}${target}${statusTo} in ${d.module} module`;
    }

    // ── STANDARD CREATE / UPDATE / DELETE ───────────────────
    const verb = ACTION_VERBS[d.actionType] || 'modified';
    const parts: string[] = [actor, verb];

    if (d.actionType === 'CREATE') {
      parts.push(`new ${d.entityType}`);
    } else {
      parts.push(d.entityType);
    }

    if (d.targetLabel) {
      parts.push(`'${d.targetLabel}'`);
    } else if (d.entityId) {
      parts.push(`(ID: ${d.entityId.slice(0, 8)}...)`);
    }

    // Extract context from request body for richer detail
    const body = typeof d.details === 'object' && d.details !== null ? d.details : {};
    const reqBody = (body as any).request || body;
    const extras: string[] = [];
    if (reqBody?.department && typeof reqBody.department === 'string') extras.push(`department: ${reqBody.department}`);
    if (reqBody?.designation && typeof reqBody.designation === 'string') extras.push(`designation: ${reqBody.designation}`);
    if (reqBody?.empType) extras.push(`type: ${reqBody.empType}`);
    if (reqBody?.amount) extras.push(`amount: ${reqBody.amount}`);
    if (reqBody?.payPeriod) extras.push(`period: ${reqBody.payPeriod}`);
    if (reqBody?.status) extras.push(`status: ${reqBody.status}`);

    if (extras.length > 0) {
      parts.push(`[${extras.join(', ')}]`);
    }

    parts.push(`in ${d.module} module`);

    return parts.join(' ');
  }
}
