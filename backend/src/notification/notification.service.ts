import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatDateDMY } from '../common/date-format';

const UPCOMING_DEADLINE_WINDOW_DAYS = 7;

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Real, persisted notifications (announcements etc.) merged with two
   * kinds that are computed fresh on every call rather than stored —
   * "you have pending tasks" and "a project deadline is close" — the same
   * derive-it-live philosophy already used for leave balance and project
   * status elsewhere in this app. That means they can never go stale or
   * need a background job to keep them in sync: they simply stop
   * appearing the moment the task is done or the project completes.
   */
  async getUserNotifications(userId: string) {
    const [user, stored] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: { select: { name: true } }, employee: { select: { id: true } } },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const virtual = await this.buildVirtualNotifications(user?.employee?.id, user?.role?.name);
    return [...virtual, ...stored].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async buildVirtualNotifications(employeeId: string | undefined, roleName: string | undefined) {
    if (!employeeId) return [];
    const now = new Date();
    const virtual: {
      id: string; userId: string; title: string; message: string; type: string; link: string; isRead: boolean; createdAt: Date;
    }[] = [];

    // ---- Task reminder — one line, not one per task ----
    const pendingTaskCount = await this.prisma.task.count({
      where: { assignedEmployeeId: employeeId, status: { not: 'DONE' } },
    });
    if (pendingTaskCount > 0) {
      virtual.push({
        id: 'virtual-tasks',
        userId: '',
        title: 'Task reminder',
        message: `You have ${pendingTaskCount} task${pendingTaskCount === 1 ? '' : 's'} not yet done.`,
        type: 'INFO',
        link: '/',
        isRead: false,
        createdAt: now,
      });
    }

    // ---- Project deadlines — one per project, since each has to link
    // somewhere different. Employees only see projects they're staffed on
    // (as PM or team member); everyone else (HR/Admin/management) sees
    // every project company-wide.
    const isManagement = !!roleName && roleName !== 'EMPLOYEE';
    const deadlineWindow = new Date(now.getTime() + UPCOMING_DEADLINE_WINDOW_DAYS * 86400000);

    const projectWhere: any = {
      endDate: { not: null, lte: deadlineWindow },
      status: { not: 'COMPLETED' },
    };
    if (!isManagement) {
      projectWhere.OR = [
        { projectManagerId: employeeId },
        { assignments: { some: { employeeId, projectId: { not: null } } } },
      ];
    }

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, endDate: true },
    });

    for (const p of projects) {
      const overdue = p.endDate! < now;
      virtual.push({
        id: `virtual-deadline-${p.id}`,
        userId: '',
        title: 'Project deadline',
        message: `${p.name} ${overdue ? 'was due' : 'is due'} ${formatDateDMY(p.endDate)}${overdue ? ' — overdue' : ''}.`,
        type: overdue ? 'ALERT' : 'WARNING',
        link: `/projects/${p.id}`,
        isRead: false,
        createdAt: now,
      });
    }

    return virtual;
  }

  async markAsRead(id: string, userId: string) {
    if (id.startsWith('virtual-')) return { count: 0 }; // nothing to persist — it clears itself once the underlying task/project changes
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(data: { userId: string; title: string; message: string; type?: string; link?: string }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link,
      },
    });
  }
}
