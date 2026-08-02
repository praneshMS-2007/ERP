import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            role: string;
            permissions: {
                module: import(".prisma/client").$Enums.Module;
                action: import(".prisma/client").$Enums.Action;
            }[];
            name: string;
        };
    }>;
    logout(authHeader: string): Promise<{
        message: string;
    }> | {
        message: string;
    };
    getProfile(req: any): Promise<{
        role: {
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
        };
        employee: {
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        roleId: string;
        email: string;
        passwordHash: string;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
        theme: string;
        language: string;
        twoFactorEnabled: boolean;
        emailNotifications: boolean;
    }>;
    updateProfile(req: any, body: any): Promise<{
        message: string;
    }>;
    changePassword(req: any, body: any): Promise<{
        message: string;
    }>;
    getSessions(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        token: string;
        deviceInfo: string | null;
        ipAddress: string | null;
        isActive: boolean;
        expiresAt: Date;
    }[]>;
    revokeSession(req: any, id: string): Promise<{
        message: string;
    }>;
}
