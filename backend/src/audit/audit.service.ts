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

export interface TargetRouteInfo {
  url: string;
  label: string;
  category: string;
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
export function sanitizePayload(obj: any): any {
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

export function formatRoleLabel(role?: string | null): string {
  if (!role) return 'Team Member';
  const map: Record<string, string> = {
    SUPER_ADMIN:       'Super Admin',
    HR_MANAGER:        'HR Manager',
    FINANCE_MANAGER:   'Finance Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
    CRM_MANAGER:       'CRM Manager',
    PROJECT_MANAGER:   'Project Manager',
    EMPLOYEE:          'Employee',
  };
  return map[role] || role.replace('_', ' ');
}

export function extractLabelFromBody(body: any): string {
  if (!body || typeof body !== 'object') return '';
  if (body.firstName) {
    const last = body.lastName ? ` ${body.lastName}` : '';
    return `${body.firstName}${last}`.trim();
  }
  if (body.name) return String(body.name);
  if (body.title) return String(body.title);
  if (body.subject) return String(body.subject);
  if (body.clientName) return String(body.clientName);
  if (body.customerName) return String(body.customerName);
  if (body.productName) return String(body.productName);
  if (body.code) return String(body.code);
  if (body.empCode) return String(body.empCode);
  if (body.email) return String(body.email);
  if (body.username) return String(body.username);
  return '';
}

/**
 * Resolves the direct URL where the management work was performed
 * so non-technical users can click "Take Me to this Record" in one click.
 */
export function resolveTargetRoute(module: string, entityType?: string | null, action?: string, entityId?: string | null): TargetRouteInfo {
  const mod = (module || '').toUpperCase();
  const ent = (entityType || '').toLowerCase();
  const act = (action || '').toLowerCase();

  // HR MODULE
  if (mod === 'HR' || act.includes('/hrm') || act.includes('/self')) {
    if (ent.includes('payroll') || act.includes('payroll')) {
      return { url: '/hrm/payroll', label: 'View Payroll in HR', category: 'HR & Payroll' };
    }
    if (ent.includes('leave') || ent.includes('attendance') || act.includes('attendance') || act.includes('leave')) {
      return { url: '/hrm/attendance', label: 'View Attendance & Leaves', category: 'HR Attendance' };
    }
    if (ent.includes('user') || act.includes('/users')) {
      return { url: '/hrm/user-management', label: 'View User Management', category: 'HR Users' };
    }
    if (ent.includes('performance') || act.includes('performance')) {
      return { url: '/hrm/performance', label: 'View Performance Reviews', category: 'HR Performance' };
    }
    return { url: '/hrm/employees', label: 'View Employees in HR', category: 'HR Management' };
  }

  // FINANCE MODULE
  if (mod === 'FINANCE' || act.includes('/finance')) {
    if (ent.includes('budget') || act.includes('budget')) {
      return { url: '/finance/budgets', label: 'View Budgets in Finance', category: 'Finance Budgets' };
    }
    if (ent.includes('ledger') || act.includes('ledger')) {
      return { url: '/finance/ledger', label: 'View General Ledger', category: 'Finance Ledger' };
    }
    if (ent.includes('payroll') || act.includes('payroll')) {
      return { url: '/finance/payroll', label: 'View Payroll in Finance', category: 'Finance Payroll' };
    }
    return { url: '/finance', label: 'View Invoices & Expenses', category: 'Finance' };
  }

  // INVENTORY MODULE
  if (mod === 'INVENTORY' || act.includes('/inventory')) {
    if (ent.includes('warehouse') || act.includes('warehouse')) {
      return { url: '/inventory/warehouse', label: 'View Warehouses', category: 'Inventory Warehouses' };
    }
    if (ent.includes('raw') || act.includes('raw-materials')) {
      return { url: '/inventory/raw-materials', label: 'View Raw Materials', category: 'Inventory Materials' };
    }
    if (ent.includes('sales') || ent.includes('order') || act.includes('sales-orders')) {
      return { url: '/inventory/sales-orders', label: 'View Sales Orders', category: 'Inventory Orders' };
    }
    if (ent.includes('alert') || act.includes('stock-alerts')) {
      return { url: '/inventory/stock-alerts', label: 'View Stock Alerts', category: 'Inventory Alerts' };
    }
    return { url: '/inventory/products', label: 'View Products in Inventory', category: 'Inventory Products' };
  }

  // CRM MODULE
  if (mod === 'CRM' || act.includes('/crm')) {
    if (ent.includes('customer') || act.includes('customer')) {
      return { url: '/crm/customers', label: 'View Customers in CRM', category: 'CRM Customers' };
    }
    if (ent.includes('opportunity') || act.includes('opportunit')) {
      return { url: '/crm/opportunities', label: 'View Opportunities in CRM', category: 'CRM Opportunities' };
    }
    if (ent.includes('support') || ent.includes('ticket') || act.includes('support')) {
      return { url: '/crm/support', label: 'View Support Tickets', category: 'CRM Support' };
    }
    if (ent.includes('contact') || act.includes('contact')) {
      return { url: '/crm/contacts', label: 'View Contacts in CRM', category: 'CRM Contacts' };
    }
    return { url: '/crm/leads', label: 'View Leads in CRM', category: 'CRM Leads' };
  }

  // PROJECTS MODULE
  if (mod === 'PROJECTS' || act.includes('/projects')) {
    return { url: '/projects', label: 'View Projects', category: 'Project Management' };
  }

  // ANNOUNCEMENTS MODULE
  if (mod === 'ANNOUNCEMENTS' || act.includes('/announcements')) {
    return { url: '/announcements', label: 'View Announcements', category: 'Company Announcements' };
  }

  // ADMIN / USERS
  if (mod === 'ADMIN' || mod === 'AUTH' || act.includes('/auth') || act.includes('/users')) {
    if (act.includes('login')) {
      return { url: '/', label: 'Go to Dashboard', category: 'System Authentication' };
    }
    return { url: '/hrm/user-management', label: 'View User Accounts', category: 'System Administration' };
  }

  // SETTINGS
  if (mod === 'SETTINGS' || act.includes('/settings')) {
    return { url: '/settings', label: 'View System Settings', category: 'Settings' };
  }

  return { url: '/', label: 'Go to Dashboard', category: 'General' };
}

/**
 * Builds conversational, non-technical plain English explanations for any ERP action
 * so that normal non-technical people understand what happened immediately.
 */
export function buildPlainEnglishDescription(d: {
  actorName: string;
  actorRole: string;
  department?: string | null;
  actionType: string;
  entityType?: string | null;
  module: string;
  targetLabel?: string | null;
  entityId?: string | null;
  action: string;
  details?: any;
}): string {
  const roleTitle = formatRoleLabel(d.actorRole || 'USER');
  const actor = `${roleTitle} (${d.actorName})`;
  const route = (d.action || '').toLowerCase();
  const actType = (d.actionType || 'UPDATE').toUpperCase();

  // Extract payload object
  let body: any = {};
  if (d.details) {
    try {
      const parsed = typeof d.details === 'string' ? JSON.parse(d.details) : d.details;
      body = parsed?.request || parsed || {};
    } catch {
      body = {};
    }
  }

  const target = d.targetLabel || extractLabelFromBody(body) || (d.entityId ? `#${d.entityId.slice(0, 8)}` : '');

  // 1. AUTHENTICATION & LOGIN
  if (actType === 'LOGIN' || route === 'login' || route.includes('/auth/login')) {
    return `${actor} signed into the management system.`;
  }
  if (route.includes('/auth/logout')) {
    return `${actor} logged out of the system.`;
  }
  if (route.includes('/auth/request-password-reset') || route.includes('reset-password')) {
    return `${actor} requested a password reset for account ${target || 'user'}.`;
  }

  // 2. HR MANAGEMENT (EMPLOYEES, OFFERS, SALARY)
  if (route.includes('/hrm/employees') || d.entityType === 'Employee') {
    if (route.includes('/offer-letter')) {
      return `${actor} generated and issued an official Offer Letter for employee ${target ? `'${target}'` : ''}.`;
    }
    if (route.includes('/salary')) {
      return `${actor} updated the salary and compensation structure for employee ${target ? `'${target}'` : ''}.`;
    }
    if (route.includes('/documents')) {
      return `${actor} uploaded verification documents for employee ${target ? `'${target}'` : ''}.`;
    }
    if (actType === 'CREATE') {
      const deptStr = body.department ? ` in the ${body.department} department` : '';
      const desigStr = body.designation ? ` as ${body.designation}` : '';
      const typeStr = body.empType ? ` (${body.empType.replace('_', ' ')})` : '';
      return `${actor} added a new employee: '${target || 'New Employee'}'${desigStr}${deptStr}${typeStr}.`;
    }
    if (actType === 'DELETE') {
      return `${actor} removed the employee record for '${target || 'employee'}'.`;
    }
    return `${actor} updated the profile and details of employee '${target || 'employee'}'.`;
  }

  // 3. PAYROLL
  if (route.includes('payroll') || d.entityType === 'Payroll') {
    const period = body.payPeriod || body.month || '';
    const periodStr = period ? ` for ${period}` : '';
    if (route.includes('/status') || actType === 'STATUS_CHANGE') {
      const st = body.status || 'UPDATED';
      return `${actor} changed the status of payroll${periodStr} to '${st}'.`;
    }
    if (route.includes('/payslip') || route.includes('/email')) {
      return `${actor} generated and emailed salary payslips${periodStr} to employees.`;
    }
    if (actType === 'CREATE') {
      return `${actor} processed and generated new payroll${periodStr}.`;
    }
    return `${actor} updated the payroll records${periodStr}.`;
  }

  // 4. ATTENDANCE & LEAVES
  if (route.includes('leave') || d.entityType === 'Leave' || d.entityType === 'Leave Request') {
    if (actType === 'STATUS_CHANGE' || route.includes('/status')) {
      const st = (body.status || 'REVIEWED').toUpperCase();
      const actionVerb = st === 'APPROVED' ? 'approved' : st === 'REJECTED' ? 'rejected' : 'reviewed';
      return `${actor} ${actionVerb} the leave request${target ? ` for '${target}'` : ''}.`;
    }
    if (actType === 'CREATE') {
      return `${actor} submitted a new leave request${target ? ` for '${target}'` : ''}.`;
    }
    return `${actor} updated leave request records.`;
  }

  if (route.includes('attendance') || d.entityType === 'Attendance' || d.entityType === 'Attendance Record') {
    return `${actor} updated employee attendance and check-in logs.`;
  }

  // 5. FINANCE - INVOICES
  if (route.includes('invoice') || d.entityType === 'Invoice') {
    const amtStr = body.amount ? ` (Amount: ₹${Number(body.amount).toLocaleString('en-IN')})` : '';
    const clientStr = body.clientName || body.customerName || target;
    if (actType === 'CREATE') {
      return `${actor} created a new customer Invoice for '${clientStr || 'Client'}'${amtStr}.`;
    }
    if (actType === 'DELETE') {
      return `${actor} deleted the invoice record for '${clientStr || 'Client'}'.`;
    }
    return `${actor} updated Invoice details for '${clientStr || 'Client'}'${amtStr}.`;
  }

  // 6. FINANCE - EXPENSES
  if (route.includes('expense') || d.entityType === 'Expense') {
    const amtStr = body.amount ? ` (Amount: ₹${Number(body.amount).toLocaleString('en-IN')})` : '';
    const catStr = body.category || body.description || target;
    if (actType === 'CREATE') {
      return `${actor} recorded a new company Expense: '${catStr || 'General Expense'}'${amtStr}.`;
    }
    if (actType === 'DELETE') {
      return `${actor} deleted an expense entry: '${catStr || 'Expense'}'.`;
    }
    return `${actor} updated the expense entry: '${catStr || 'Expense'}'${amtStr}.`;
  }

  // 7. FINANCE - BUDGETS & LEDGER & TAXES
  if (route.includes('budget') || d.entityType === 'Budget') {
    return `${actor} ${actType === 'CREATE' ? 'created' : 'updated'} a departmental budget allocation${target ? ` for '${target}'` : ''}.`;
  }
  if (route.includes('ledger') || d.entityType === 'LedgerEntry') {
    return `${actor} posted a transaction entry into the General Ledger.`;
  }
  if (route.includes('tax') || d.entityType === 'Tax') {
    return `${actor} updated corporate tax configuration and records.`;
  }

  // 8. INVENTORY - PRODUCTS
  if (route.includes('/products') || d.entityType === 'Product') {
    const qtyStr = body.stockLevel !== undefined ? ` (Stock: ${body.stockLevel} units)` : '';
    const priceStr = body.price !== undefined ? ` (Price: ₹${Number(body.price).toLocaleString('en-IN')})` : '';
    if (actType === 'CREATE') {
      return `${actor} added a new product to inventory: '${target || 'Product'}'${qtyStr}${priceStr}.`;
    }
    if (actType === 'DELETE') {
      return `${actor} removed the product '${target || 'Product'}' from inventory.`;
    }
    return `${actor} updated product details for '${target || 'Product'}'${qtyStr}.`;
  }

  // 9. INVENTORY - WAREHOUSE & RAW MATERIALS & SALES ORDERS
  if (route.includes('/warehouse') || d.entityType === 'Warehouse') {
    return `${actor} ${actType === 'CREATE' ? 'registered' : 'updated'} the warehouse facility '${target || 'Warehouse'}'.`;
  }
  if (route.includes('/raw-materials') || d.entityType === 'RawMaterial') {
    return `${actor} ${actType === 'CREATE' ? 'added' : 'updated'} raw material inventory: '${target || 'Material'}'.`;
  }
  if (route.includes('/sales-orders') || d.entityType === 'SalesOrder') {
    return `${actor} ${actType === 'CREATE' ? 'created' : 'updated'} Sales Order '${target || 'Order'}' in inventory.`;
  }

  // 10. CRM - LEADS, CUSTOMERS, OPPORTUNITIES, SUPPORT
  if (route.includes('/leads') || d.entityType === 'Lead') {
    const srcStr = body.source ? ` from ${body.source}` : '';
    if (actType === 'CREATE') {
      return `${actor} added a new sales lead: '${target || 'New Lead'}'${srcStr}.`;
    }
    if (actType === 'DELETE') {
      return `${actor} deleted sales lead '${target || 'Lead'}'.`;
    }
    return `${actor} updated lead information for '${target || 'Lead'}'.`;
  }

  if (route.includes('/customers') || d.entityType === 'Customer') {
    if (actType === 'CREATE') {
      return `${actor} onboarded a new customer account: '${target || 'New Customer'}'.`;
    }
    if (actType === 'DELETE') {
      return `${actor} deleted customer record '${target || 'Customer'}'.`;
    }
    return `${actor} updated customer account details for '${target || 'Customer'}'.`;
  }

  if (route.includes('/support') || d.entityType === 'SupportTicket') {
    if (actType === 'CREATE') {
      return `${actor} opened a customer support ticket: '${target || 'Support Ticket'}'.`;
    }
    if (actType === 'STATUS_CHANGE') {
      return `${actor} changed support ticket status to '${body.status || 'Updated'}'.`;
    }
    return `${actor} updated support ticket '${target || 'Ticket'}'.`;
  }

  if (route.includes('/opportunities') || d.entityType === 'Opportunity') {
    return `${actor} ${actType === 'CREATE' ? 'created' : 'updated'} sales opportunity '${target || 'Deal'}'.`;
  }

  // 11. PROJECTS (the project record itself only — matched on entityType,
  // not the route: every project sub-resource — tasks, milestones,
  // holidays, announcements, documents, timesheets, staffing — is also
  // served under /projects/*, so a route-substring check here used to
  // swallow all of them and mislabel a task creation as "created a new
  // project". Anything that isn't specifically entityType 'Project' now
  // falls through to the honest default fallback below, which already
  // names the real entity type correctly.)
  if (d.entityType === 'Project') {
    if (actType === 'CREATE') {
      return `${actor} created a new project: '${target || 'Project'}'.`;
    }
    if (actType === 'DELETE') {
      return `${actor} removed project '${target || 'Project'}'.`;
    }
    return `${actor} updated project details for '${target || 'Project'}'.`;
  }

  // 12. ANNOUNCEMENTS
  if (route.includes('/announcements') || d.entityType === 'Announcement') {
    if (actType === 'CREATE') {
      return `${actor} published a company-wide announcement: '${target || 'Announcement'}'.`;
    }
    return `${actor} updated the announcement '${target || 'Announcement'}'.`;
  }

  // 13. USER MANAGEMENT & ADMIN
  if (route.includes('/users') || d.entityType === 'User' || d.entityType === 'User Account') {
    if (actType === 'CREATE') {
      return `${actor} created a new user login account for '${target || 'User'}'.`;
    }
    if (actType === 'DELETE') {
      return `${actor} deactivated user account '${target || 'User'}'.`;
    }
    return `${actor} updated account permissions for '${target || 'User'}'.`;
  }

  // DEFAULT CONVERSATIONAL FALLBACK
  const verb = actType === 'CREATE' ? 'created a new' : actType === 'DELETE' ? 'deleted' : 'updated';
  const entName = d.entityType ? d.entityType : 'record';
  const targetStr = target ? ` '${target}'` : '';
  const modStr = d.module ? ` in ${d.module}` : '';
  return `${actor} ${verb} ${entName}${targetStr}${modStr}.`;
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

      // ───────────────────────────────────────────────────────────────
      // AUTO-LOOKUP: Resolve the actor's real identity from the database
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
      // GENERATE PLAIN ENGLISH DESCRIPTION
      // ───────────────────────────────────────────────────────────────
      const actionType = entry.actionType || 'UPDATE';
      const actorName = userName || 'System User';
      const actorRole = role || 'USER';
      const entityType = entry.entityType || 'Record';
      const module = entry.module || 'OTHER';
      const targetLabel = entry.targetLabel || '';
      const entityId = entry.entityId;

      const description = entry.description || buildPlainEnglishDescription({
        actorName,
        actorRole,
        department,
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
      this.logger.error(`Failed to write audit log entry: ${err}`);
    }
  }
}
