"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProjectsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProjectsService = ProjectsService_1 = class ProjectsService {
    prisma;
    logger = new common_1.Logger(ProjectsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProjects(status) {
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
    async getProjectById(id) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: {
                tasks: { include: { assignedEmployee: { select: { firstName: true, lastName: true } } } },
                milestones: true,
                assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        return project;
    }
    async createProject(data) {
        return this.prisma.project.create({ data });
    }
    async updateProject(id, data) {
        return this.prisma.project.update({ where: { id }, data });
    }
    async deleteProject(id) {
        await this.prisma.project.delete({ where: { id } });
        return { message: 'Project deleted' };
    }
    async getTasks(projectId) {
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
    async createTask(data) {
        const task = await this.prisma.task.create({ data });
        await this.recalculateProjectProgress(data.projectId);
        return task;
    }
    async updateTaskStatus(id, status) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const updatedTask = await this.prisma.task.update({
            where: { id },
            data: { status },
        });
        await this.recalculateProjectProgress(task.projectId);
        return updatedTask;
    }
    async recalculateProjectProgress(projectId) {
        const allTasks = await this.prisma.task.findMany({
            where: { projectId },
            select: { status: true },
        });
        if (allTasks.length === 0)
            return;
        const doneCount = allTasks.filter(t => t.status === 'DONE').length;
        const progress = Math.round((doneCount / allTasks.length) * 100);
        const newStatus = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';
        await this.prisma.project.update({
            where: { id: projectId },
            data: { progress, status: newStatus },
        });
        this.logger.log(`Project ${projectId} progress auto-updated to ${progress}%`);
    }
    async getMilestones(projectId) {
        return this.prisma.milestone.findMany({
            where: { projectId },
            orderBy: { dueDate: 'asc' },
        });
    }
    async createMilestone(data) {
        return this.prisma.milestone.create({ data });
    }
    async getTimeLogs(projectId) {
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
    async createTimeLog(data) {
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
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = ProjectsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map