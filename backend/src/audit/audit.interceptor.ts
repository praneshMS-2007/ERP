import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that don't represent business record mutations
const NON_MUTATING_PATHS = new Set(['/api/ai/chat', '/api/search', '/api/analytics/export']);

const PATH_TO_MODULE: Record<string, string> = {
  hrm: 'HR',
  crm: 'CRM',
  inventory: 'INVENTORY',
  finance: 'FINANCE',
  projects: 'PROJECTS',
  analytics: 'ANALYTICS',
  users: 'ADMIN',
  auth: 'ADMIN',
  notifications: 'ADMIN',
  upload: 'STORAGE',
};

function moduleForPath(path: string): string {
  const segment = path.replace(/^\/?api\/?/, '').split('/')[0]?.toLowerCase();
  return PATH_TO_MODULE[segment] ?? segment?.toUpperCase() ?? 'OTHER';
}

function entityTypeForPath(path: string): string {
  const segments = path.replace(/^\/?api\/?/, '').split('/').filter(Boolean);
  if (segments.length < 2) return segments[0] ? capitalize(segments[0]) : 'Record';
  
  const sub = segments[1];
  const map: Record<string, string> = {
    employees: 'Employee',
    payrolls: 'Payroll',
    leaves: 'Leave',
    attendance: 'Attendance',
    holidays: 'Holiday',
    salary: 'SalaryStructure',
    'offer-letter': 'OfferLetter',
    users: 'User',
    products: 'Product',
    warehouse: 'Warehouse',
    'raw-materials': 'RawMaterial',
    'sales-orders': 'SalesOrder',
    invoices: 'Invoice',
    expenses: 'Expense',
    budgets: 'Budget',
    taxes: 'Tax',
    ledger: 'LedgerEntry',
    leads: 'Lead',
    customers: 'Customer',
    opportunities: 'Opportunity',
    support: 'SupportTicket',
    contacts: 'Contact',
    tasks: 'Task',
    milestones: 'Milestone',
    announcements: 'Announcement',
  };
  return map[sub] || capitalize(sub);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function extractTargetLabel(body: any, entityId?: string): string {
  if (!body && !entityId) return '';
  if (body?.name) return String(body.name);
  if (body?.firstName) {
    const last = body.lastName ? ` ${body.lastName}` : '';
    return `${body.firstName}${last}`.trim();
  }
  if (body?.title) return String(body.title);
  if (body?.code) return String(body.code);
  if (entityId) return `#${entityId.slice(0, 8)}`;
  return '';
}

function describeAction(method: string, path: string, body: any, entityType: string, entityId?: string): { actionType: string; description: string } {
  const isStatus = path.includes('/status');
  let actionType = 'UPDATE';

  if (method === 'POST') {
    if (isStatus) {
      actionType = 'STATUS_CHANGE';
    } else if (path.includes('/login')) {
      actionType = 'LOGIN';
    } else {
      actionType = 'CREATE';
    }
  } else if (method === 'DELETE') {
    actionType = 'DELETE';
  } else if (isStatus) {
    actionType = 'STATUS_CHANGE';
  }

  const targetLabel = extractTargetLabel(body, entityId);
  const statusVal = body?.status ? ` to '${body.status}'` : '';
  const periodVal = body?.payPeriod ? ` for ${body.payPeriod}` : '';

  let description = `${capitalize(actionType.toLowerCase())} ${entityType}`;
  if (targetLabel) {
    description += ` '${targetLabel}'`;
  }
  if (statusVal) {
    description += statusVal;
  }
  if (periodVal) {
    description += periodVal;
  }

  return { actionType, description };
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

    return next.handle().pipe(
      tap(() => {
        const user = request.user;
        if (!user) return; // public routes — audited explicitly where necessary

        const entityId: string | undefined = request.params?.id || request.body?.id;
        const module = moduleForPath(rawPath);
        const entityType = entityTypeForPath(rawPath);
        const { actionType, description } = describeAction(method, rawPath, request.body, entityType, entityId);

        this.audit.log({
          userId: user.id,
          userEmail: user.email,
          role: user.role,
          actionType,
          action: `${method} ${rawPath}`,
          module,
          entityType,
          entityId,
          description,
          ipAddress: request.ip || request.headers?.['x-forwarded-for'] || null,
          userAgent: request.headers?.['user-agent'] || null,
          details: request.body || null,
        });
      }),
    );
  }
}
