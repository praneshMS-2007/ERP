import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private prisma: PrismaService) {}

  // ========== PROJECTS ==========
  async getProjects(status?: any) {
    const where = status ? { status } : {};
    return this.prisma.project.findMany({
      where,
      include: {
        tasks: { select: { id: true, status: true } },
        assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        tasks: { include: { assignedEmployee: { select: { firstName: true, lastName: true } } } },
        milestones: true,
        assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(data: Prisma.ProjectUncheckedCreateInput) {
    return this.prisma.project.create({ data });
  }

  async updateProject(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return this.prisma.project.update({ where: { id }, data });
  }

  async deleteProject(id: string) {
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
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

  async createTask(data: Prisma.TaskUncheckedCreateInput) {
    const task = await this.prisma.task.create({ data });
    await this.recalculateProjectProgress(data.projectId);
    return task;
  }

  /**
   * BUSINESS LOGIC: When a task status is updated,
   * auto-recalculate project completion progress % and status.
   */
  async updateTaskStatus(id: string, status: any) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status },
    });

    await this.recalculateProjectProgress(task.projectId);
    return updatedTask;
  }

  private async recalculateProjectProgress(projectId: string) {
    const allTasks = await this.prisma.task.findMany({
      where: { projectId },
      select: { status: true },
    });

    if (allTasks.length === 0) return;

    const doneCount = allTasks.filter(t => t.status === 'DONE').length;
    const progress = Math.round((doneCount / allTasks.length) * 100);
    const newStatus = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress, status: newStatus as any },
    });

    this.logger.log(`Project ${projectId} progress auto-updated to ${progress}%`);
  }

  // ========== MILESTONES ==========
  async getMilestones(projectId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createMilestone(data: Prisma.MilestoneUncheckedCreateInput) {
    return this.prisma.milestone.create({ data });
  }

  // ========== TIMESHEETS (TimeLog) ==========
  async getTimeLogs(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.timeLog.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createTimeLog(data: Prisma.TimeLogUncheckedCreateInput) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        employeeId: data.employeeId,
        projectId: data.projectId,
      },
    });

    if (!assignment) {
      await this.prisma.assignment.create({
        data: {
          employeeId: data.employeeId,
          projectId: data.projectId,
          role: 'Contributor',
        },
      });
    }

    return this.prisma.timeLog.create({ data });
  }
}
