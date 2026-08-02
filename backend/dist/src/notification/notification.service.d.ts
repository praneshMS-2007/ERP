import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserNotifications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        message: string;
        type: string;
        isRead: boolean;
    }[]>;
    markAsRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    createNotification(data: {
        userId: string;
        title: string;
        message: string;
        type?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        message: string;
        type: string;
        isRead: boolean;
    }>;
}
