import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  role?: string | null;
  department?: string | null;
  actionType?: string; // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, EXPORT
  action: string;      // e.g. "POST /api/hrm/employees"
  module: string;      // HR, INVENTORY, FINANCE, CRM, PROJECTS, ADMIN, SETTINGS
  entityType?: string | null;
  entityId?: string | null;
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
]);

/** Recursively sanitize objects to redact credentials and sensitive PII */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const safe: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes('password') || lower.includes('token') || lower.includes('secret')) {
      safe[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      safe[key] = sanitizePayload(val);
    } else {
      safe[key] = val;
    }
  }
  return safe;
}

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

      // Auto-lookup user profile snapshot if not fully provided
      if (entry.userId && (!userName || !role || !department)) {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
          include: {
            role: true,
            employee: { include: { department: true, designation: true } },
          },
        });

        if (user) {
          userEmail = userEmail || user.email || user.username || 'unknown';
          role = role || user.role?.name || 'EMPLOYEE';
          if (user.employee) {
            userName = userName || `${user.employee.firstName} ${user.employee.lastName}`.trim();
            department = department || user.employee.department?.name || 'General';
          } else {
            userName = userName || user.username || user.email || 'System User';
            department = department || 'Management';
          }
        }
      }

      // Format details into clean JSON
      let detailsJson: string | null = null;
      if (entry.details) {
        try {
          const safe = typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details;
          detailsJson = JSON.stringify(sanitizePayload(safe));
        } catch {
          detailsJson = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
        }
      }

      // Generate human-readable description if not provided
      const description = entry.description || this.generateDescription({
        userName: userName || 'User',
        role: role || 'Manager',
        actionType: entry.actionType || 'UPDATE',
        module: entry.module,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
      });

      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          userName: userName ?? null,
          userEmail: userEmail ?? null,
          role: role ?? null,
          department: department ?? null,
          actionType: entry.actionType || 'UPDATE',
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
      this.logger.error(`Failed to write audit log entry: ${err}`);
    }
  }

  private generateDescription(d: {
    userName: string;
    role: string;
    actionType: string;
    module: string;
    entityType?: string | null;
    entityId?: string | null;
    action: string;
  }): string {
    const verb = d.actionType === 'CREATE' ? 'created' : d.actionType === 'DELETE' ? 'deleted' : 'updated';
    const target = d.entityType ? d.entityType : 'record';
    const idInfo = d.entityId ? ` #${d.entityId.slice(0, 8)}` : '';
    return `${d.userName} (${d.role}) ${verb} ${target}${idInfo} in ${d.module}`;
  }
}
