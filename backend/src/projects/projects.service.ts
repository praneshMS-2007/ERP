import { Injectable, NotFoundException, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/permission.util';
import { NotificationService } from '../notification/notification.service';

/**
 * Only Super Admin and HR Manager may create/delete a project or change who's
 * staffed on it (the Project Manager and the team) — a deliberately narrower
 * allowlist than the general PROJECTS module permission. A system-wide
 * "Project Manager" role holder does NOT automatically get this: staffing is
 * exclusively HR/Admin's call, at any time, even for a project someone else
 * already manages.
 */
const PROJECT_STAFFING_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);

function canStaffProjects(viewer?: AuthenticatedUser): boolean {
  return !!viewer && PROJECT_STAFFING_ROLES.has(viewer.role);
}

const DOCUMENT_KINDS = new Set(['PRD', 'BRD', 'ARCHITECTURE', 'WORKFLOW', 'OTHER']);

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  /**
   * Resolves the caller's own Employee id from their User id — the same
   * resolveSelf()-style database lookup used throughout the SELF module
   * (hrm.service.ts). Never trusts a client-supplied employeeId.
   */
  private async resolveEmployeeId(viewer?: AuthenticatedUser): Promise<string | null> {
    if (!viewer) return null;
    const employee = await this.prisma.employee.findUnique({ where: { userId: viewer.id }, select: { id: true } });
    return employee?.id ?? null;
  }

  /** Is the caller the specific, staffed Project Manager of this one project? */
  private async isProjectManagerOf(viewer: AuthenticatedUser | undefined, projectId: string): Promise<boolean> {
    const employeeId = await this.resolveEmployeeId(viewer);
    if (!employeeId) return false;
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { projectManagerId: true } });
    return !!project && project.projectManagerId === employeeId;
  }

  /**
   * The gate for day-to-day project management: the project's own PM, or
   * Super Admin / HR Manager as an override. Deliberately NOT any general
   * PROJECTS:WRITE holder — a system-wide "Project Manager" role does not,
   * by itself, grant control over a project someone else was specifically
   * assigned to run.
   */
  private async canManageProject(viewer: AuthenticatedUser | undefined, projectId: string): Promise<boolean> {
    if (canStaffProjects(viewer)) return true;
    return this.isProjectManagerOf(viewer, projectId);
  }

  private async assertCanManageProject(viewer: AuthenticatedUser | undefined, projectId: string) {
    if (!(await this.canManageProject(viewer, projectId))) {
      throw new ForbiddenException("Only this project's manager, HR, or an administrator can do that.");
    }
  }

  /**
   * The one source of truth for NOT_STARTED / IN_PROGRESS / COMPLETED —
   * purely a function of today's date against the project's own start/end
   * dates, the same for every viewer (Admin, HR, PM, or a plain member).
   * ON_HOLD is deliberately not decided here at all: it's the one manual
   * status, handled by the caller of this function (see syncStatus).
   *
   * No start date at all -> stays NOT_STARTED indefinitely (nothing to
   * measure "in progress" against). A start date with no end date runs
   * IN_PROGRESS indefinitely once started — there's no deadline to have
   * passed yet.
   */
  private computeStatusFromDates(startDate: Date | null, endDate: Date | null): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' {
    const now = new Date();
    if (!startDate || now < startDate) return 'NOT_STARTED';
    if (endDate && now > endDate) return 'COMPLETED';
    return 'IN_PROGRESS';
  }

  /**
   * Applies the date-based computation to one project, persisting the
   * correction when the stored value has drifted (e.g. nobody opened this
   * project on the exact day its deadline passed) — so every other place
   * that reads project.status directly (filters, notifications, audit
   * trails) stays correct too, not just this one response.
   */
  private async syncStatus<T extends { id: string; status: string; startDate: Date | null; endDate: Date | null }>(
    project: T,
  ): Promise<T> {
    if (project.status === 'ON_HOLD') return project; // sticky — manual only, see updateProjectStatus
    const computed = this.computeStatusFromDates(project.startDate, project.endDate);
    if (computed === project.status) return project;
    await this.prisma.project.update({ where: { id: project.id }, data: { status: computed as any } });
    return { ...project, status: computed };
  }

  /** Is the caller staffed on this project at all — PM or a plain member? */
  private async isStaffedOnProject(viewer: AuthenticatedUser | undefined, projectId: string): Promise<boolean> {
    const employeeId = await this.resolveEmployeeId(viewer);
    if (!employeeId) return false;
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true, assignments: { where: { employeeId }, select: { id: true } } },
    });
    if (!project) return false;
    return project.projectManagerId === employeeId || project.assignments.length > 0;
  }

  // ========== PROJECTS ==========

  /**
   * Super Admin / HR Manager see every project — same audience as
   * canStaffProjects, since running the whole portfolio is their job. Every
   * other role (Employee, a system-wide Project Manager, Team Lead, etc.)
   * only ever sees projects they're personally staffed on — as PM or as a
   * team member — never the company's full list. This was previously
   * unfiltered: the list endpoint sent every project's name, tasks and team
   * to every viewer regardless of involvement, the same class of gap
   * already closed for a single project's own task list.
   */
  async getProjects(status: any, viewer?: AuthenticatedUser) {
    const employeeId = await this.resolveEmployeeId(viewer);
    const where: Prisma.ProjectWhereInput = {};

    if (!canStaffProjects(viewer)) {
      if (!employeeId) return [];
      where.OR = [{ projectManagerId: employeeId }, { assignments: { some: { employeeId } } }];
    }

    // Status is filtered in memory, AFTER syncing — filtering at the DB
    // level first would miss any project whose stored status has drifted
    // from today's date (e.g. nobody opened it on the exact day its
    // deadline passed) and nobody would ever see it move into that filter.
    const projects = await this.prisma.project.findMany({
      where,
      include: {
        tasks: { select: { id: true, status: true } },
        assignments: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const synced = await Promise.all(projects.map((p) => this.syncStatus(p)));
    const filtered = status ? synced.filter((p) => p.status === status) : synced;
    return filtered.map((p) => this.withMyRole(p, employeeId));
  }

  async getProjectById(id: string, viewer?: AuthenticatedUser) {
    const rawProject = await this.prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        assignments: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!rawProject) throw new NotFoundException('Project not found');
    const project = await this.syncStatus(rawProject);
    const employeeId = await this.resolveEmployeeId(viewer);
    const isManager = await this.canManageProject(viewer, id);

    // A plain team member only ever receives their OWN tasks in the API
    // response — not just hidden in the UI. Before this, every staffed
    // member's full task list (including colleagues' tasks) was sent to
    // every viewer and only filtered client-side, which is not a real
    // access control — the same class of gap closed elsewhere this session.
    const taskWhere = isManager
      ? { projectId: id }
      : { projectId: id, assignedEmployeeId: employeeId ?? '__none__' };

    const tasks = await this.prisma.task.findMany({
      where: taskWhere,
      include: { assignedEmployee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const taggedTasks = tasks.map((t) => ({ ...t, isMine: !!employeeId && t.assignedEmployeeId === employeeId }));

    return this.withMyRole({ ...project, tasks: taggedTasks }, employeeId);
  }

  private withMyRole<T extends { projectManagerId: string | null; assignments: { employeeId: string; role: string | null }[] }>(
    project: T,
    employeeId: string | null,
  ) {
    let myRole: 'PROJECT_MANAGER' | 'MEMBER' | null = null;
    // The descriptive label (e.g. "Frontend") on the viewer's OWN roster
    // row — the frontend has no employeeId to match assignments against
    // itself, by design, so "which row is mine" has to be answered here.
    let myRoleLabel: string | null = null;
    if (employeeId) {
      if (project.projectManagerId === employeeId) {
        myRole = 'PROJECT_MANAGER';
      } else {
        const mine = project.assignments.find((a) => a.employeeId === employeeId);
        if (mine) {
          myRole = 'MEMBER';
          myRoleLabel = mine.role;
        }
      }
    }
    return { ...project, myRole, myRoleLabel };
  }

  async createProject(
    data: {
      name: string;
      description?: string;
      status: any;
      priority: any;
      startDate?: string;
      endDate?: string;
      projectManagerId: string;
      teamEmployeeIds?: string[];
    },
    viewer?: AuthenticatedUser,
  ) {
    if (!canStaffProjects(viewer)) {
      throw new ForbiddenException('Only HR and administrators can create a project.');
    }
    if (!data.projectManagerId) {
      throw new BadRequestException('A Project Manager must be selected.');
    }

    const { projectManagerId, teamEmployeeIds, status, startDate, endDate, ...projectFields } = data;
    const uniqueTeamIds = [...new Set((teamEmployeeIds || []).filter((id) => id && id !== projectManagerId))];

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;
    if ((parsedStartDate && Number.isNaN(parsedStartDate.getTime())) || (parsedEndDate && Number.isNaN(parsedEndDate.getTime()))) {
      throw new BadRequestException('A valid start and end date are required.');
    }
    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      throw new BadRequestException('The end date cannot be before the start date.');
    }

    // Status is never taken from the client, even at creation — it's
    // computed the same way it is everywhere else, from the dates being
    // submitted right here.
    const initialStatus = this.computeStatusFromDates(parsedStartDate, parsedEndDate);

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { ...projectFields, startDate: parsedStartDate, endDate: parsedEndDate, status: initialStatus as any, projectManagerId },
      });
      if (uniqueTeamIds.length) {
        await tx.assignment.createMany({
          data: uniqueTeamIds.map((employeeId) => ({ projectId: project.id, employeeId })),
        });
      }
      return project;
    });
  }

  async updateProject(id: string, data: Prisma.ProjectUncheckedUpdateInput, viewer?: AuthenticatedUser) {
    if (!canStaffProjects(viewer)) {
      throw new ForbiddenException("Only HR and administrators can edit a project's core details.");
    }
    return this.prisma.project.update({ where: { id }, data });
  }

  async deleteProject(id: string, viewer?: AuthenticatedUser) {
    if (!canStaffProjects(viewer)) {
      throw new ForbiddenException('Only HR and administrators can delete a project.');
    }
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }

  /**
   * Replaces a project's staffing — who's the PM, who's on the team.
   * HR/Admin-only, at any time, per the locked decision: not even the
   * project's own manager can change this.
   */
  async updateProjectStaffing(
    id: string,
    body: { projectManagerId?: string; teamEmployeeIds?: string[] },
    viewer?: AuthenticatedUser,
  ) {
    if (!canStaffProjects(viewer)) {
      throw new ForbiddenException('Only HR and administrators can change project staffing.');
    }
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    const projectManagerId = body.projectManagerId ?? project.projectManagerId;
    if (!projectManagerId) {
      throw new BadRequestException('A project must always have a Project Manager.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: { projectManagerId } });

      if (body.teamEmployeeIds) {
        const uniqueTeamIds = [...new Set(body.teamEmployeeIds.filter((eid) => eid && eid !== projectManagerId))];
        await tx.assignment.deleteMany({ where: { projectId: id } });
        if (uniqueTeamIds.length) {
          await tx.assignment.createMany({
            data: uniqueTeamIds.map((employeeId) => ({ projectId: id, employeeId })),
          });
        }
      }

      return tx.project.findUnique({
        where: { id },
        include: {
          assignments: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
          projectManager: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async getProjectStaff(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        assignments: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return {
      manager: project.projectManager,
      members: project.assignments.map((a) => ({ ...a.employee, role: a.role })),
    };
  }

  /**
   * A team member's descriptive role label on this project (e.g. "Frontend",
   * "DevOps") — free text, since a project's roles vary too much for a fixed
   * list. The project's manager (or HR/Admin) may relabel anyone already on
   * the team, but this never adds or removes who's staffed — that stays
   * exclusively HR/Admin's call via updateProjectStaffing above.
   */
  async updateMemberRole(projectId: string, employeeId: string, role: string, viewer?: AuthenticatedUser) {
    await this.assertCanManageProject(viewer, projectId);
    const assignment = await this.prisma.assignment.findUnique({
      where: { projectId_employeeId: { projectId, employeeId } },
    });
    if (!assignment) throw new NotFoundException('That person is not on this project\'s team.');
    return this.prisma.assignment.update({ where: { id: assignment.id }, data: { role } });
  }

  /**
   * The project's brief/motive, plus its start date and deadline — the two
   * dates status is now computed from (see computeStatusFromDates). The
   * brief stays editable by the project's own manager or HR/Admin; the
   * dates are narrower still — HR/Admin only, even for the project's own
   * PM — since changing either one immediately changes what NOT_STARTED /
   * IN_PROGRESS / COMPLETED means for this project going forward.
   */
  async updateProjectOverview(
    id: string,
    data: { description?: string; startDate?: string | null; endDate?: string | null },
    viewer?: AuthenticatedUser,
  ) {
    await this.assertCanManageProject(viewer, id);
    const editingDates = data.startDate !== undefined || data.endDate !== undefined;
    if (editingDates && !canStaffProjects(viewer)) {
      throw new ForbiddenException("Only HR and administrators can change a project's start date or deadline.");
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      },
    });
    // Changing either date can immediately change what today's status
    // should be (e.g. pushing the start date into the future should show
    // NOT_STARTED right away, not on the next unrelated read).
    return this.syncStatus(updated);
  }

  /**
   * The ONE manual lever left in project status: HR/Admin can pause a
   * project (ON_HOLD) or resume it. Every other state — NOT_STARTED,
   * IN_PROGRESS, COMPLETED — is computed automatically from the start date
   * and deadline (see computeStatusFromDates) and cannot be set directly by
   * anyone, including the project's own PM.
   */
  async updateProjectStatus(id: string, status: string, viewer?: AuthenticatedUser) {
    if (!canStaffProjects(viewer)) {
      throw new ForbiddenException(
        'Only HR and administrators can change project status — every other state is automatic, based on the start date and deadline.',
      );
    }
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (status === 'ON_HOLD') {
      return this.prisma.project.update({ where: { id }, data: { status: 'ON_HOLD' } });
    }
    if (status === 'RESUME') {
      const computed = this.computeStatusFromDates(project.startDate, project.endDate);
      return this.prisma.project.update({ where: { id }, data: { status: computed as any } });
    }
    throw new BadRequestException('Status can only be set to ON_HOLD or RESUME manually — every other state is computed automatically from the dates.');
  }

  // ========== TASKS ==========

  async getTasks(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.task.findMany({
      where,
      include: {
        project: { select: { name: true } },
        assignedEmployee: { select: { firstName: true, lastName: true } },
        assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(data: Prisma.TaskUncheckedCreateInput, viewer?: AuthenticatedUser) {
    await this.assertCanManageProject(viewer, data.projectId);
    const task = await this.prisma.task.create({ data: { ...data, status: data.status ?? 'NOT_STARTED' } });
    await this.recalculateProjectProgress(data.projectId);
    return task;
  }

  /** Full task edit — title/description/assignee/dueDate/priority. */
  async updateTask(
    id: string,
    data: { title?: string; description?: string; assignedEmployeeId?: string | null; dueDate?: string; priority?: any },
    viewer?: AuthenticatedUser,
  ) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertCanManageProject(viewer, task.projectId);
    return this.prisma.task.update({ where: { id }, data });
  }

  /** HR/Admin/PM only — an employee can never delete their own task. */
  async deleteTask(id: string, viewer?: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertCanManageProject(viewer, task.projectId);
    await this.prisma.task.delete({ where: { id } });
    await this.recalculateProjectProgress(task.projectId);
    return { message: 'Task deleted' };
  }

  /**
   * BUSINESS LOGIC: When a task status is updated, auto-recalculate project
   * completion progress % and status (unchanged from before this feature).
   *
   * Status (Not Started / In Progress / Done) is set exclusively by the
   * project's manager or HR/Admin — an employee has no self-service status
   * change here at all. This is a deliberate design choice: the daily task
   * sheet is something HR/Admin/PM fill in and mark complete, not something
   * an employee reports on themselves.
   */
  async updateTaskStatus(id: string, status: any, viewer?: AuthenticatedUser) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    await this.assertCanManageProject(viewer, task.projectId);

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status },
    });

    await this.recalculateProjectProgress(task.projectId);
    return updatedTask;
  }

  /**
   * Task completion only ever drives the progress %, not the status badge
   * anymore — status is purely date-based now (see computeStatusFromDates).
   * A project can legitimately sit at COMPLETED with tasks still open (the
   * deadline passed) or IN_PROGRESS at 100% (finished early, deadline not
   * yet reached) — both are honest reflections of reality, not a bug.
   */
  private async recalculateProjectProgress(projectId: string) {
    const allTasks = await this.prisma.task.findMany({
      where: { projectId },
      select: { status: true },
    });

    if (allTasks.length === 0) return;

    const doneCount = allTasks.filter((t) => t.status === 'DONE').length;
    const progress = Math.round((doneCount / allTasks.length) * 100);

    await this.prisma.project.update({ where: { id: projectId }, data: { progress } });
  }

  // ========== MILESTONES ==========
  // Project-level checkpoints (title, optional due date, PENDING/REACHED) —
  // separate from Tasks, which track day-to-day work. Visibility and write
  // access follow the same rule as Holidays just above: staffed team
  // members can view, only the project's own manager/HR/Admin can write.

  async getMilestones(projectId: string, viewer?: AuthenticatedUser) {
    const allowed = (await this.canManageProject(viewer, projectId)) || (await this.isStaffedOnProject(viewer, projectId));
    if (!allowed) {
      throw new ForbiddenException('Only people staffed on this project can see its milestones.');
    }
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createMilestone(data: Prisma.MilestoneUncheckedCreateInput, viewer?: AuthenticatedUser) {
    await this.assertCanManageProject(viewer, data.projectId);
    if (!data.title?.trim()) throw new BadRequestException('A title is required.');
    return this.prisma.milestone.create({ data: { ...data, status: data.status ?? 'PENDING' } });
  }

  async updateMilestoneStatus(id: string, status: any, viewer?: AuthenticatedUser) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');
    await this.assertCanManageProject(viewer, milestone.projectId);
    return this.prisma.milestone.update({ where: { id }, data: { status } });
  }

  async deleteMilestone(id: string, viewer?: AuthenticatedUser) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');
    await this.assertCanManageProject(viewer, milestone.projectId);
    await this.prisma.milestone.delete({ where: { id } });
    return { message: 'Milestone deleted' };
  }

  // ========== TIMESHEETS (TimeLog) ==========
  // Lives entirely inside a project now, not a standalone page: a team
  // member logs hours against themselves only, for today only. HR/Admin/PM
  // never fill one in — for anyone — only view. This replaces the old
  // getTimeLogs/createTimeLog, which let any caller log hours as any
  // employee, against any project, on any date — the exact "looks
  // restricted, isn't" shape this whole session has been closing elsewhere.

  private dayRange(dateInput: Date | string) {
    const d = new Date(dateInput);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return { start, end };
  }

  /** Is the caller a staffed team MEMBER (not the PM) of this project? Only
   * members fill their own timesheet — the PM's contribution is already
   * captured by the tasks/overview/announcements they manage. */
  private async isMemberOf(viewer: AuthenticatedUser | undefined, projectId: string): Promise<boolean> {
    const employeeId = await this.resolveEmployeeId(viewer);
    if (!employeeId) return false;
    const assignment = await this.prisma.assignment.findUnique({
      where: { projectId_employeeId: { projectId, employeeId } },
    });
    return !!assignment;
  }

  /** Today's entry (editable) plus the caller's own past entries on this
   * project (view-only history — the day is locked the moment it's over). */
  async getMyTimesheet(projectId: string, viewer?: AuthenticatedUser) {
    if (!(await this.isMemberOf(viewer, projectId))) {
      throw new ForbiddenException('Only a project team member can view their own timesheet here.');
    }
    const employeeId = await this.resolveEmployeeId(viewer);
    const { start, end } = this.dayRange(new Date());

    const [project, today, history] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
      this.prisma.timeLog.findFirst({ where: { employeeId: employeeId!, projectId, date: { gte: start, lt: end } } }),
      this.prisma.timeLog.findMany({
        where: { employeeId: employeeId!, projectId, date: { lt: start } },
        orderBy: { date: 'desc' },
      }),
    ]);
    return { today, history, projectStatus: project?.status, timesheetActive: project?.status === 'IN_PROGRESS' };
  }

  /**
   * Creates or updates the caller's OWN entry for TODAY only — the date is
   * never taken from the client, so there is no way to target any other
   * day through this endpoint. Once "today" becomes "yesterday" this same
   * call simply creates a new entry instead of touching the old one.
   *
   * Gated to the project's current status: the timesheet only accepts
   * entries while the project is actually IN_PROGRESS — nothing before it
   * starts, nothing while it's on hold, nothing once it's completed.
   */
  async upsertMyTimesheet(projectId: string, data: { hours: number; description?: string }, viewer?: AuthenticatedUser) {
    if (!(await this.isMemberOf(viewer, projectId))) {
      throw new ForbiddenException('Only a project team member can fill in a timesheet here.');
    }
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { status: true } });
    if (project?.status !== 'IN_PROGRESS') {
      const reason =
        project?.status === 'NOT_STARTED'
          ? "This project hasn't started yet."
          : project?.status === 'ON_HOLD'
            ? 'This project is on hold.'
            : 'This project is already completed.';
      throw new BadRequestException(`Timesheets can only be filled while the project is in progress. ${reason}`);
    }
    if (!data.hours || data.hours <= 0 || data.hours > 24) {
      throw new BadRequestException('Hours must be a real number between 0 and 24.');
    }
    const employeeId = await this.resolveEmployeeId(viewer);
    const now = new Date();
    const { start, end } = this.dayRange(now);

    const existing = await this.prisma.timeLog.findFirst({
      where: { employeeId: employeeId!, projectId, date: { gte: start, lt: end } },
    });

    if (existing) {
      return this.prisma.timeLog.update({
        where: { id: existing.id },
        data: { hours: data.hours, description: data.description },
      });
    }
    return this.prisma.timeLog.create({
      data: { employeeId: employeeId!, projectId, hours: data.hours, description: data.description, date: now },
    });
  }

  /**
   * The manager's read-only view of one member's timesheet for one date.
   * Returns enough context (isWeekend, holiday) that the frontend never has
   * to guess why an entry is missing — "Absent" only ever means "a working
   * day, no holiday, and genuinely nothing logged."
   */
  async getMemberTimesheetForDate(projectId: string, employeeId: string, dateStr: string | undefined, viewer?: AuthenticatedUser) {
    await this.assertCanManageProject(viewer, projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, projectManagerId: true, assignments: { where: { employeeId }, select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isStaffed = project.projectManagerId === employeeId || project.assignments.length > 0;
    if (!isStaffed) throw new BadRequestException('That person is not staffed on this project.');

    const date = dateStr ? new Date(dateStr) : new Date();
    const { start, end } = this.dayRange(date);
    const isWeekend = [0, 6].includes(date.getDay());

    const [entry, holiday] = await Promise.all([
      this.prisma.timeLog.findFirst({ where: { employeeId, projectId, date: { gte: start, lt: end } } }),
      this.prisma.projectHoliday.findFirst({ where: { projectId, date: { gte: start, lt: end } } }),
    ]);

    // The timesheet only runs while the project is IN_PROGRESS. If nothing
    // was logged and the project wasn't in progress, that's not a missed
    // day — there was nothing to log. Only ever call it "Absent" when the
    // project was actually active and asking for an entry.
    const timesheetActive = project.status === 'IN_PROGRESS';

    return {
      date: start,
      entry,
      isWeekend,
      holiday: holiday ? { id: holiday.id, title: holiday.title } : null,
      timesheetActive,
      projectStatus: project.status,
    };
  }

  // ========== HOLIDAYS ==========

  /** Project-scoped only — a PM speaks for their own project, not the
   * company. Upserts on (project, date) so re-declaring the same date just
   * updates the title instead of erroring. */
  async createHoliday(projectId: string, data: { date: string; title: string }, viewer?: AuthenticatedUser) {
    await this.assertCanManageProject(viewer, projectId);
    if (!data.date || !data.title?.trim()) {
      throw new BadRequestException('A date and a title are both required.');
    }
    const createdByEmployeeId = await this.resolveEmployeeId(viewer);
    if (!createdByEmployeeId) {
      throw new ForbiddenException('No employee record is linked to this account.');
    }
    const { start } = this.dayRange(data.date);
    return this.prisma.projectHoliday.upsert({
      where: { projectId_date: { projectId, date: start } },
      update: { title: data.title },
      create: { projectId, date: start, title: data.title, createdByEmployeeId },
    });
  }

  async getHolidays(projectId: string, viewer?: AuthenticatedUser) {
    const allowed = (await this.canManageProject(viewer, projectId)) || (await this.isStaffedOnProject(viewer, projectId));
    if (!allowed) {
      throw new ForbiddenException('Only people staffed on this project can see its holidays.');
    }
    return this.prisma.projectHoliday.findMany({ where: { projectId }, orderBy: { date: 'asc' } });
  }

  async deleteHoliday(id: string, viewer?: AuthenticatedUser) {
    const holiday = await this.prisma.projectHoliday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.assertCanManageProject(viewer, holiday.projectId);
    await this.prisma.projectHoliday.delete({ where: { id } });
    return { message: 'Holiday removed' };
  }

  // ========== DOCUMENTS ==========

  async uploadDocument(
    projectId: string,
    body: { kind: string; fileUrl: string; fileName: string },
    viewer?: AuthenticatedUser,
  ) {
    await this.assertCanManageProject(viewer, projectId);
    if (!DOCUMENT_KINDS.has(body.kind)) {
      throw new BadRequestException(`"${body.kind}" is not a recognised document type.`);
    }
    const uploaderEmployeeId = await this.resolveEmployeeId(viewer);
    if (!uploaderEmployeeId) {
      throw new ForbiddenException('No employee record is linked to this account.');
    }
    return this.prisma.projectDocument.create({
      data: { projectId, uploaderEmployeeId, kind: body.kind, fileUrl: body.fileUrl, fileName: body.fileName },
    });
  }

  /** Readable by anyone staffed on the project, or HR/Admin. */
  async getDocuments(projectId: string, viewer?: AuthenticatedUser) {
    const allowed = (await this.canManageProject(viewer, projectId)) || (await this.isStaffedOnProject(viewer, projectId));
    if (!allowed) {
      throw new ForbiddenException('Only people staffed on this project can see its documents.');
    }
    return this.prisma.projectDocument.findMany({
      where: { projectId },
      include: { uploader: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(id: string, viewer?: AuthenticatedUser) {
    const doc = await this.prisma.projectDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.assertCanManageProject(viewer, doc.projectId);
    await this.prisma.projectDocument.delete({ where: { id } });
    return { message: 'Document deleted' };
  }

  // ========== ANNOUNCEMENTS ==========

  async createAnnouncement(
    projectId: string,
    body: { title: string; body: string; fileUrl?: string; fileName?: string; audienceEmployeeId?: string },
    viewer?: AuthenticatedUser,
  ) {
    await this.assertCanManageProject(viewer, projectId);
    const authorEmployeeId = await this.resolveEmployeeId(viewer);
    if (!authorEmployeeId) {
      throw new ForbiddenException('No employee record is linked to this account.');
    }

    if (body.audienceEmployeeId) {
      const staff = await this.getStaffEmployeeIds(projectId);
      if (!staff.includes(body.audienceEmployeeId)) {
        throw new BadRequestException('That person is not staffed on this project.');
      }
    }

    const announcement = await this.prisma.projectAnnouncement.create({
      data: { projectId, authorEmployeeId, ...body },
    });

    // Fan out a real inbox alert — targeted to one person, or every staffed
    // member (PM + team) if broadcast. Anyone with no linked login is
    // skipped, the same edge case resolveSelf() already has to handle.
    const recipientEmployeeIds = body.audienceEmployeeId ? [body.audienceEmployeeId] : await this.getStaffEmployeeIds(projectId);

    const recipients = await this.prisma.employee.findMany({
      where: { id: { in: recipientEmployeeIds }, userId: { not: null } },
      select: { userId: true },
    });

    for (const r of recipients) {
      if (r.userId) {
        await this.notifications.createNotification({
          userId: r.userId,
          title: body.audienceEmployeeId ? `New task note: ${body.title}` : `Project announcement: ${body.title}`,
          message: body.body,
          type: 'INFO',
          link: `/projects/${projectId}`,
        });
      }
    }

    return announcement;
  }

  private async getStaffEmployeeIds(projectId: string): Promise<string[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { projectManagerId: true, assignments: { select: { employeeId: true } } },
    });
    if (!project) return [];
    const ids = project.assignments.map((a) => a.employeeId);
    if (project.projectManagerId) ids.push(project.projectManagerId);
    return [...new Set(ids)];
  }

  /**
   * The project's chat-style announcement feed, oldest first (so a new
   * message appears at the bottom, like a messaging app). A manager sees
   * everything they've posted, including who a targeted note went to; a
   * plain staffed member sees only broadcasts plus notes sent to them.
   */
  async getAnnouncements(projectId: string, viewer?: AuthenticatedUser) {
    const isManager = await this.canManageProject(viewer, projectId);
    let where: Prisma.ProjectAnnouncementWhereInput = { projectId };

    if (!isManager) {
      const staffed = await this.isStaffedOnProject(viewer, projectId);
      if (!staffed) {
        throw new ForbiddenException('Only people staffed on this project can see its announcements.');
      }
      const employeeId = await this.resolveEmployeeId(viewer);
      where = { projectId, OR: [{ audienceEmployeeId: null }, { audienceEmployeeId: employeeId ?? '__none__' }] };
    }

    return this.prisma.projectAnnouncement.findMany({
      where,
      include: {
        author: { select: { firstName: true, lastName: true } },
        audienceEmployee: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAnnouncement(id: string, viewer?: AuthenticatedUser) {
    const announcement = await this.prisma.projectAnnouncement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');
    await this.assertCanManageProject(viewer, announcement.projectId);
    await this.prisma.projectAnnouncement.delete({ where: { id } });
    return { message: 'Announcement deleted' };
  }
}
