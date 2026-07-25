import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class ProjectsService {
    private prisma;
    constructor(prisma: PrismaService);
    getProjects(status?: any): Promise<({
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            role: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            projectId: string | null;
            taskId: string | null;
            assignedAt: Date;
        })[];
        tasks: {
            id: string;
            status: import(".prisma/client").$Enums.TaskStatus;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: import(".prisma/client").$Enums.Priority;
    })[]>;
    getProjectById(id: string): Promise<{
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            role: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            projectId: string | null;
            taskId: string | null;
            assignedAt: Date;
        })[];
        tasks: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TaskStatus;
            description: string | null;
            title: string;
            priority: import(".prisma/client").$Enums.Priority;
            projectId: string;
            dueDate: Date | null;
        }[];
        milestones: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.MilestoneStatus;
            title: string;
            projectId: string;
            dueDate: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    createProject(data: Prisma.ProjectUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    updateProject(id: string, data: Prisma.ProjectUncheckedUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: import(".prisma/client").$Enums.Priority;
    }>;
    deleteProject(id: string): Promise<{
        message: string;
    }>;
    getTasks(projectId?: string): Promise<({
        project: {
            name: string;
        };
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            role: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            employeeId: string;
            projectId: string | null;
            taskId: string | null;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        dueDate: Date | null;
    })[]>;
    createTask(data: Prisma.TaskUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        dueDate: Date | null;
    }>;
    updateTaskStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaskStatus;
        description: string | null;
        title: string;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        dueDate: Date | null;
    }>;
    getMilestones(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MilestoneStatus;
        title: string;
        projectId: string;
        dueDate: Date | null;
    }[]>;
    createMilestone(data: Prisma.MilestoneUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MilestoneStatus;
        title: string;
        projectId: string;
        dueDate: Date | null;
    }>;
}
