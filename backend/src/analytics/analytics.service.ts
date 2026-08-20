import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class AuditLogFilterDto {
  startDate?: string;
  endDate?: string;
  userId?: string;
  department?: string;
  module?: string;
  actionType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type AuditLogFilterQuery = AuditLogFilterDto;

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // AUDIT LOGS & TELEMETRY (SUPER ADMIN ONLY)
  // ==========================================

  async getAuditLogs(query: AuditLogFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        where.timestamp.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.department && query.department !== 'ALL') {
      where.department = { equals: query.department, mode: 'insensitive' };
    }

    if (query.module && query.module !== 'ALL') {
      where.module = { equals: query.module, mode: 'insensitive' };
    }

    if (query.actionType && query.actionType !== 'ALL') {
      where.actionType = { equals: query.actionType, mode: 'insensitive' };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { action: { contains: s, mode: 'insensitive' } },
        { userName: { contains: s, mode: 'insensitive' } },
        { userEmail: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: { select: { id: true, name: true } },
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  empCode: true,
                  avatarUrl: true,
                  department: { select: { id: true, name: true } },
                  designation: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getManagers() {
    // Fetch all users with management/admin roles, plus any user who has performed logged actions
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            empCode: true,
            avatarUrl: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => {
      const displayName = u.employee ? `${u.employee.firstName} ${u.employee.lastName}`.trim() : u.username || u.email || 'Admin';
      const departmentName = u.employee?.department?.name || 'Management';
      const roleName = u.role?.name || 'USER';
      return {
        id: u.id,
        displayName,
        email: u.email || u.username,
        role: roleName,
        department: departmentName,
        empCode: u.employee?.empCode || null,
        avatarUrl: u.employee?.avatarUrl || null,
      };
    });
  }

  async getDepartments() {
    const depts = await this.prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return depts.map((d) => d.name);
  }

  async getAuditStats(query: AuditLogFilterQuery) {
    const where: any = {};

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        where.timestamp.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    if (query.userId) where.userId = query.userId;
    if (query.department && query.department !== 'ALL') where.department = { equals: query.department, mode: 'insensitive' };
    if (query.module && query.module !== 'ALL') where.module = { equals: query.module, mode: 'insensitive' };
    if (query.actionType && query.actionType !== 'ALL') where.actionType = { equals: query.actionType, mode: 'insensitive' };

    const logs = await this.prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        userName: true,
        role: true,
        department: true,
        actionType: true,
        module: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    const totalEvents = logs.length;
    const uniqueUsers = new Set(logs.map((l) => l.userId).filter(Boolean));
    const activeManagersCount = uniqueUsers.size;

    // Action Breakdown
    const actionBreakdown: Record<string, number> = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      STATUS_CHANGE: 0,
      OTHER: 0,
    };

    // Module Breakdown
    const moduleBreakdown: Record<string, number> = {
      HR: 0,
      INVENTORY: 0,
      FINANCE: 0,
      CRM: 0,
      PROJECTS: 0,
      ADMIN: 0,
      SETTINGS: 0,
      OTHER: 0,
    };

    // Manager Activity Counts
    const managerCounts: Record<string, { count: number; name: string; role: string; department: string }> = {};

    // Timeline Aggregation by Day
    const timelineMap: Record<string, { date: string; total: number; create: number; update: number; delete: number }> = {};

    for (const log of logs) {
      // Action
      const act = log.actionType?.toUpperCase() || 'UPDATE';
      if (actionBreakdown[act] !== undefined) {
        actionBreakdown[act]++;
      } else {
        actionBreakdown.OTHER++;
      }

      // Module
      const mod = log.module?.toUpperCase() || 'OTHER';
      if (moduleBreakdown[mod] !== undefined) {
        moduleBreakdown[mod]++;
      } else {
        moduleBreakdown.OTHER = (moduleBreakdown.OTHER || 0) + 1;
      }

      // Manager
      const uid = log.userId || 'system';
      const mName = log.userName || 'System';
      if (!managerCounts[uid]) {
        managerCounts[uid] = { count: 0, name: mName, role: log.role || 'USER', department: log.department || 'General' };
      }
      managerCounts[uid].count++;

      // Timeline (YYYY-MM-DD)
      const dayKey = log.timestamp.toISOString().split('T')[0];
      if (!timelineMap[dayKey]) {
        timelineMap[dayKey] = { date: dayKey, total: 0, create: 0, update: 0, delete: 0 };
      }
      timelineMap[dayKey].total++;
      if (act === 'CREATE') timelineMap[dayKey].create++;
      else if (act === 'DELETE') timelineMap[dayKey].delete++;
      else timelineMap[dayKey].update++;
    }

    const topActiveManagers = Object.entries(managerCounts)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const timeline = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // Find most active module
    let mostActiveModule = 'None';
    let maxModuleCount = 0;
    for (const [m, count] of Object.entries(moduleBreakdown)) {
      if (count > maxModuleCount && m !== 'OTHER') {
        maxModuleCount = count;
        mostActiveModule = m;
      }
    }

    return {
      totalEvents,
      activeManagersCount,
      mostActiveModule,
      actionBreakdown,
      moduleBreakdown,
      timeline,
      topActiveManagers,
    };
  }

  async exportAuditLogs(query: AuditLogFilterQuery): Promise<string> {
    // Get up to 1000 logs for export
    const result = await this.getAuditLogs({ ...query, limit: 1000, page: 1 });
    const logs = result.data;

    const headers = [
      'Timestamp (UTC)',
      'Actor Name',
      'Actor Email',
      'Role',
      'Department',
      'Action Type',
      'Module',
      'Entity Type',
      'Entity ID',
      'Description',
      'IP Address',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((l) => [
      escapeCsv(l.timestamp.toISOString()),
      escapeCsv(l.userName || (l.user ? `${(l.user as any).employee?.firstName || ''} ${(l.user as any).employee?.lastName || ''}`.trim() : 'System')),
      escapeCsv(l.userEmail || l.user?.email || l.user?.username || ''),
      escapeCsv(l.role || (l.user as any)?.role?.name || ''),
      escapeCsv(l.department || (l.user as any)?.employee?.department?.name || ''),
      escapeCsv(l.actionType),
      escapeCsv(l.module),
      escapeCsv(l.entityType || ''),
      escapeCsv(l.entityId || ''),
      escapeCsv(l.description || ''),
      escapeCsv(l.ipAddress || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // ==========================================
  // EXISTING METRICS (RETENTION & REVENUE)
  // ==========================================

  async getDashboardMetrics() {
    const totalEmployees = await this.prisma.employee.count({ where: { status: { not: 'INACTIVE' } } });
    const totalProjects = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
    const totalCustomers = await this.prisma.customer.count();
    
    const incomeAgg = await this.prisma.income.aggregate({
      _sum: { amount: true },
    });
    
    const products = await this.prisma.product.findMany({ select: { stockLevel: true, price: true } });
    const inventoryValue = products.reduce((acc, p) => acc + ((p.stockLevel || 0) * (p.price || 0)), 0);

    return {
      employees: totalEmployees,
      activeProjects: totalProjects,
      totalCustomers,
      revenueYTD: incomeAgg._sum.amount || 0,
      inventoryValue,
    };
  }

  async getRetention() {
    const periodStart = new Date();
    periodStart.setFullYear(periodStart.getFullYear() - 1);
    const now = new Date();

    const headcountAtPeriodStart = await this.prisma.employee.count({
      where: {
        joinDate: { lte: periodStart },
        OR: [{ lastWorkingDay: null }, { lastWorkingDay: { gt: periodStart } }],
      },
    });

    if (headcountAtPeriodStart === 0) {
      return { insufficientData: true, retentionPercent: null, periodMonths: 12, headcountAtPeriodStart: 0, leaversInPeriod: 0 };
    }

    const leaversInPeriod = await this.prisma.employee.count({
      where: {
        lastWorkingDay: { gte: periodStart, lte: now },
        joinDate: { lte: periodStart },
      },
    });

    const retentionPercent = Math.round(((headcountAtPeriodStart - leaversInPeriod) / headcountAtPeriodStart) * 1000) / 10;

    return { insufficientData: false, retentionPercent, periodMonths: 12, headcountAtPeriodStart, leaversInPeriod };
  }

  async getRevenueTrend() {
    const incomes = await this.prisma.income.findMany({
      select: { amount: true, date: true },
    });
    
    const trend = Array(12).fill(0);
    incomes.forEach(inc => {
      if (inc.date) {
        const month = new Date(inc.date).getMonth();
        if (month >= 0 && month < 12) {
          trend[month] += (inc.amount || 0);
        }
      }
    });

    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      data: trend,
    };
  }
}
