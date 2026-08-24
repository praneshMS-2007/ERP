import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Routes whose POST isn't really a "business mutation" — an AI chat message
 * is not an audit-worthy event, search is just a query, and the analytics
 * export is a read that happens to use POST.
 */
const NON_MUTATING_PATHS = new Set([
  '/api/ai/chat',
  '/api/search',
  '/api/analytics/export',
]);

const PATH_TO_MODULE: Record<string, string> = {
  hrm:           'HR',
  crm:           'CRM',
  inventory:     'INVENTORY',
  finance:       'FINANCE',
  projects:      'PROJECTS',
  analytics:     'ANALYTICS',
  users:         'ADMIN',
  auth:          'AUTH',
  notifications: 'NOTIFICATIONS',
  upload:        'STORAGE',
  settings:      'SETTINGS',
};

/**
 * Maps the second URL segment (the sub-resource) to a human-readable entity
 * type.  Covers every resource in the ERP.
 */
const SUB_RESOURCE_TO_ENTITY: Record<string, string> = {
  employees:       'Employee',
  payrolls:        'Payroll',
  payroll:         'Payroll',
  leaves:          'Leave Request',
  attendance:      'Attendance Record',
  holidays:        'Holiday',
  salary:          'Salary Structure',
  'offer-letter':  'Offer Letter',
  'offer-letters': 'Offer Letter',
  users:           'User Account',
  products:        'Product',
  warehouse:       'Warehouse',
  warehouses:      'Warehouse',
  'raw-materials': 'Raw Material',
  'sales-orders':  'Sales Order',
  invoices:        'Invoice',
  expenses:        'Expense',
  budgets:         'Budget',
  taxes:           'Tax Record',
  ledger:          'Ledger Entry',
  leads:           'Lead',
  customers:       'Customer',
  opportunities:   'Opportunity',
  support:         'Support Ticket',
  contacts:        'Contact',
  tasks:           'Task',
  milestones:      'Milestone',
  announcements:   'Announcement',
  'salary-structures': 'Salary Structure',
  designations:    'Designation',
  departments:     'Department',
  roles:           'Role',
  permissions:     'Permission',
  settings:        'Setting',
  login:           'Session',
};

function moduleForPath(path: string): string {
  const segment = path.replace(/^\/?api\/?/, '').split('/')[0]?.toLowerCase();
  return PATH_TO_MODULE[segment] ?? segment?.toUpperCase() ?? 'OTHER';
}

/**
 * Given a full route path like `/api/hrm/employees/:id/offer-letter`,
 * extract the most specific entity type by checking the deepest segment
 * first, then falling back up the path.
 */
function entityTypeForPath(path: string): string {
  const segments = path
    .replace(/^\/?api\/?/, '')
    .split('/')
    .filter(Boolean)
    .filter((s) => !s.startsWith(':'));  // drop param placeholders like :id

  // Walk from deepest to shallowest
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].toLowerCase();
    if (SUB_RESOURCE_TO_ENTITY[seg]) {
      return SUB_RESOURCE_TO_ENTITY[seg];
    }
  }

  // If nothing matched, capitalize the second segment or fall back to the first
  const fallback = segments[1] || segments[0] || 'Record';
  return capitalize(fallback);
}

function capitalize(s: string): string {
  return s
    .charAt(0).toUpperCase()
    + s.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Determine the action type from the HTTP method and any contextual route
 * segments.
 */
function resolveActionType(method: string, path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('/login') || lowerPath.includes('/logout')) return 'LOGIN';
  if (lowerPath.includes('/status') || lowerPath.includes('/approve') || lowerPath.includes('/reject')) {
    return 'STATUS_CHANGE';
  }
  switch (method) {
    case 'POST':   return 'CREATE';
    case 'PUT':    return 'UPDATE';
    case 'PATCH':  return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default:       return 'UPDATE';
  }
}

/**
 * Extract the most human-meaningful label from the request body so the
 * description can reference an actual name or title rather than just an ID.
 */
function extractTargetLabel(body: any): string {
  if (!body || typeof body !== 'object') return '';
  if (body.firstName) {
    const last = body.lastName ? ` ${body.lastName}` : '';
    return `${body.firstName}${last}`.trim();
  }
  if (body.name)         return String(body.name);
  if (body.title)        return String(body.title);
  if (body.productName)  return String(body.productName);
  if (body.customerName) return String(body.customerName);
  if (body.subject)      return String(body.subject);
  if (body.code)         return String(body.code);
  if (body.empCode)      return String(body.empCode);
  if (body.email)        return String(body.email);
  if (body.username)     return String(body.username);
  return '';
}

/**
 * Build a rich, production-quality description string that tells the Super
 * Admin exactly what happened — who did it, what they did, and to what
 * target.
 *
 * Examples:
 *   "HR Manager Neha Kapoor created new Employee 'Farhan Ali' in HR module"
 *   "Finance Manager Elena Choi updated Invoice 'INV-2026-0045' in Finance module"
 *   "Admin User deleted User Account #a3f2c901 in Admin module"
 *   "HR Manager Neha Kapoor generated Offer Letter for Employee #e4a12b3c in HR module"
 *   "Super Admin logged into the system"
 */
function buildDescription(
  actorName: string,
  actorRole: string,
  actionType: string,
  entityType: string,
  module: string,
  targetLabel: string,
  entityId: string | undefined,
  body: any,
  path: string,
): string {
  // Format the actor
  const roleLabel = formatRoleLabel(actorRole);
  const actor = `${roleLabel} ${actorName}`;

  // Special case: login
  if (actionType === 'LOGIN') {
    return `${actor} logged into the system`;
  }

  // Determine verb
  const verb = actionVerbMap[actionType] || 'modified';

  // Special cases for sub-operations
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('/offer-letter')) {
    const idRef = entityId ? ` (ID: ${entityId.slice(0, 8)}...)` : '';
    return `${actor} generated Offer Letter for Employee${targetLabel ? ` '${targetLabel}'` : ''}${idRef} in ${module} module`;
  }
  if (lowerPath.includes('/salary') && !lowerPath.includes('/salary-structures')) {
    const idRef = entityId ? ` (ID: ${entityId.slice(0, 8)}...)` : '';
    return `${actor} updated Salary Structure for Employee${targetLabel ? ` '${targetLabel}'` : ''}${idRef} in ${module} module`;
  }
  if (lowerPath.includes('/status') || lowerPath.includes('/approve') || lowerPath.includes('/reject')) {
    const statusTo = body?.status ? ` to '${body.status}'` : '';
    const idRef = entityId ? ` (ID: ${entityId.slice(0, 8)}...)` : '';
    return `${actor} changed status of ${entityType}${targetLabel ? ` '${targetLabel}'` : ''}${idRef}${statusTo} in ${module} module`;
  }
  if (lowerPath.includes('/payslip')) {
    const period = body?.payPeriod || body?.month || '';
    const periodStr = period ? ` for period ${period}` : '';
    return `${actor} generated Payslip${targetLabel ? ` for '${targetLabel}'` : ''}${periodStr} in ${module} module`;
  }

  // Standard description
  const parts: string[] = [`${actor} ${verb}`];

  if (actionType === 'CREATE') {
    parts.push(`new ${entityType}`);
  } else {
    parts.push(entityType);
  }

  if (targetLabel) {
    parts.push(`'${targetLabel}'`);
  } else if (entityId) {
    parts.push(`(ID: ${entityId.slice(0, 8)}...)`);
  }

  // Extra context from body
  const extras: string[] = [];
  if (body?.department && typeof body.department === 'string') {
    extras.push(`department: ${body.department}`);
  }
  if (body?.designation && typeof body.designation === 'string') {
    extras.push(`designation: ${body.designation}`);
  }
  if (body?.empType) extras.push(`type: ${body.empType}`);
  if (body?.amount) extras.push(`amount: ${body.amount}`);
  if (body?.payPeriod) extras.push(`period: ${body.payPeriod}`);

  if (extras.length > 0) {
    parts.push(`[${extras.join(', ')}]`);
  }

  parts.push(`in ${module} module`);

  return parts.join(' ');
}

const actionVerbMap: Record<string, string> = {
  CREATE:        'created',
  UPDATE:        'updated',
  DELETE:        'deleted',
  STATUS_CHANGE: 'changed status of',
  LOGIN:         'logged in',
  EXPORT:        'exported',
};

function formatRoleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN:       'Super Admin',
    HR_MANAGER:        'HR Manager',
    FINANCE_MANAGER:   'Finance Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
    CRM_MANAGER:       'CRM Manager',
    PROJECT_MANAGER:   'Project Manager',
    EMPLOYEE:          'Employee',
  };
  return map[role] || role;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;
    const rawPath: string = request.route?.path || request.path || request.url;

    if (!MUTATING_METHODS.has(method) || NON_MUTATING_PATHS.has(rawPath)) {
      return next.handle();
    }

    // Capture request body BEFORE the handler runs (NestJS may consume the stream)
    const requestBody = request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0
      ? { ...request.body }
      : null;

    return next.handle().pipe(
      tap((responseBody) => {
        const user = request.user;
        if (!user) return; // Public routes — audited explicitly where it matters

        const entityId: string | undefined =
          request.params?.id ||
          responseBody?.id ||
          requestBody?.id;

        const module = moduleForPath(rawPath);
        const entityType = entityTypeForPath(rawPath);
        const actionType = resolveActionType(method, rawPath);
        const targetLabel = extractTargetLabel(requestBody) || extractTargetLabel(responseBody);

        // Merge request + response for richer detail (response often has the
        // server-generated fields like empCode, id, createdAt, etc.)
        let mergedDetails: Record<string, any> | null = null;
        if (requestBody || (responseBody && typeof responseBody === 'object')) {
          mergedDetails = {
            ...(requestBody ? { request: requestBody } : {}),
            ...(responseBody && typeof responseBody === 'object'
              ? { response: { id: responseBody.id, empCode: responseBody.empCode, status: responseBody.status } }
              : {}),
          };
        }

        this.audit.log({
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          actionType,
          action: `${method} ${rawPath}`,
          module,
          entityType,
          entityId,
          targetLabel,
          ipAddress: request.ip || request.headers?.['x-forwarded-for'] || null,
          userAgent: request.headers?.['user-agent'] || null,
          details: mergedDetails,
        });
      }),
    );
  }
}
