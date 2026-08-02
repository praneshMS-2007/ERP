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
                tasks: true,
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
                assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createTask(data) {
        return this.prisma.task.create({ data });
    }
    async updateTaskStatus(id, status) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const updatedTask = await this.prisma.task.update({
            where: { id },
            data: { status },
        });
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
            this.logger.log(`Auto-assigned employee ${data.employeeId} to project ${data.projectId}`);
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