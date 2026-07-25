import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    login(email: string, passwordPlain: string): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            role: string;
            name: string;
        };
    }>;
    logout(token: string): Promise<{
        message: string;
    }>;
}
