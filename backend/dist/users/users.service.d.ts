import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getUsers(): Promise<{
        id: string;
        email: string;
        role: string;
        employee: {
            firstName: string;
            lastName: string;
        } | null;
        createdAt: Date;
    }[]>;
    getUserById(id: string): Promise<{
        id: string;
        email: string;
        role: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        };
        employee: ({
            department: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            designation: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                title: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            firstName: string;
            lastName: string;
            gender: string | null;
            dob: Date | null;
            contact: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            joinDate: Date;
            empType: import(".prisma/client").$Enums.EmpType;
            status: import(".prisma/client").$Enums.EmpStatus;
            departmentId: string;
            designationId: string;
        }) | null;
        createdAt: Date;
    }>;
    createUser(data: Prisma.UserUncheckedCreateInput): Promise<{
        id: string;
        email: string;
        roleId: string;
        createdAt: Date;
    }>;
    updateUser(id: string, email?: string, roleId?: string, password?: string): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    }>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
    getRoles(): Promise<({
        permissions: {
            id: string;
            roleId: string;
            createdAt: Date;
            updatedAt: Date;
            module: import(".prisma/client").$Enums.Module;
            action: import(".prisma/client").$Enums.Action;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
}
