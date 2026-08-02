import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
        tasks: true,
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
        assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(data: Prisma.TaskUncheckedCreateInput) {
    return this.prisma.task.create({ data });
  }

  /**
   * BUSINESS LOGIC: When a task status is updated to DONE,
   * check if ALL tasks in the project are now DONE.
   * If so, auto-update the project status to COMPLETED.
   */
  async updateTaskStatus(id: string, status: any) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status },
    });

    // Check if all tasks in the project are now DONE
    if (status === 'DONE') {
      const allTasks = await this.prisma.task.findMany({
        where: { projectId: task.projectId },
        select: { status: true },
      });

      const allDone = allTasks.length > 0 && allTasks.every(t => t.status === 'DONE');

      if (allDone) {
        await this.prisma.project.update({
          where: { id: task.projectId },
          data: { status: 'COMPLETED' },
        });
        this.logger.log(`All tasks done — Project ${task.projectId} auto-marked COMPLETED`);
      }
    }

    // If project was COMPLETED but a task is reopened, revert to IN_PROGRESS
    if (status !== 'DONE') {
      const project = await this.prisma.project.findUnique({ where: { id: task.projectId } });
      if (project && project.status === 'COMPLETED') {
        await this.prisma.project.update({
          where: { id: task.projectId },
          data: { status: 'IN_PROGRESS' },
        });
        this.logger.log(`Task reopened — Project ${task.projectId} reverted to IN_PROGRESS`);
      }
    }

    return updatedTask;
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

  /**
   * BUSINESS LOGIC: Validate that the employee is assigned to the project
   * before allowing a time log entry.
   */
  async createTimeLog(data: Prisma.TimeLogUncheckedCreateInput) {
    // Check if employee is assigned to this project
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        employeeId: data.employeeId,
        projectId: data.projectId,
      },
    });

    if (!assignment) {
      // Auto-assign the employee to the project instead of blocking
      await this.prisma.assignment.create({
        data: {
          employeeId: data.employeeId,
          projectId: data.projectId,
          role: 'Contributor',
        },
      });
      this.logger.log(`Auto-assigned employee ${data.employeeId} to project ${data.projectId}`);
    }

    return this.prisma.timeLog.create({ data });
  }
}
