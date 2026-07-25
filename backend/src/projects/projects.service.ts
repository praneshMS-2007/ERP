import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
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

  async updateTaskStatus(id: string, status: any) {
    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
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
}
