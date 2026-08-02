import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    getRoles(): Promise<({
        permissions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            roleId: string;
            module: import(".prisma/client").$Enums.Module;
            action: import(".prisma/client").$Enums.Action;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getUserById(id: string): Promise<{
        id: string;
        email: string;
        role: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        employee: ({
            department: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            designation: {
                id: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                title: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            empCode: string | null;
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
        createdAt: Date;
        roleId: string;
        email: string;
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
}
