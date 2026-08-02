import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    getProjects(status?: string): Promise<({
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            role: string | null;
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
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.Priority;
        progress: number;
        startDate: Date | null;
        endDate: Date | null;
    })[]>;
    getTasks(projectId?: string): Promise<({
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            role: string | null;
            employeeId: string;
            projectId: string | null;
            taskId: string | null;
            assignedAt: Date;
        })[];
        project: {
            name: string;
        };
        assignedEmployee: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import(".prisma/client").$Enums.TaskStatus;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        assignedEmployeeId: string | null;
        dueDate: Date | null;
    })[]>;
    createTask(data: Prisma.TaskUncheckedCreateInput): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import(".prisma/client").$Enums.TaskStatus;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        assignedEmployeeId: string | null;
        dueDate: Date | null;
    }>;
    updateTaskStatus(id: string, status: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import(".prisma/client").$Enums.TaskStatus;
        priority: import(".prisma/client").$Enums.Priority;
        projectId: string;
        assignedEmployeeId: string | null;
        dueDate: Date | null;
    }>;
    getTimeLogs(projectId?: string): Promise<({
        employee: {
            firstName: string;
            lastName: string;
        };
        project: {
            name: string;
        };
    } & {
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        hours: number;
        date: Date;
        employeeId: string;
        projectId: string;
    })[]>;
    createTimeLog(data: Prisma.TimeLogUncheckedCreateInput): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        hours: number;
        date: Date;
        employeeId: string;
        projectId: string;
    }>;
    getProjectById(id: string): Promise<{
        assignments: ({
            employee: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            role: string | null;
            employeeId: string;
            projectId: string | null;
            taskId: string | null;
            assignedAt: Date;
        })[];
        tasks: ({
            assignedEmployee: {
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            status: import(".prisma/client").$Enums.TaskStatus;
            priority: import(".prisma/client").$Enums.Priority;
            projectId: string;
            assignedEmployeeId: string | null;
            dueDate: Date | null;
        })[];
        milestones: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            status: import(".prisma/client").$Enums.MilestoneStatus;
            projectId: string;
            dueDate: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.Priority;
        progress: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    createProject(data: Prisma.ProjectUncheckedCreateInput): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.Priority;
        progress: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    updateProject(id: string, data: Prisma.ProjectUncheckedUpdateInput): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        priority: import(".prisma/client").$Enums.Priority;
        progress: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    deleteProject(id: string): Promise<{
        message: string;
    }>;
    getMilestones(projectId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import(".prisma/client").$Enums.MilestoneStatus;
        projectId: string;
        dueDate: Date | null;
    }[]>;
    createMilestone(data: Prisma.MilestoneUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        status: import(".prisma/client").$Enums.MilestoneStatus;
        projectId: string;
        dueDate: Date | null;
    }>;
}
