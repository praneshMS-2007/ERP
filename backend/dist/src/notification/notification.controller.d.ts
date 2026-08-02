import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    getNotifications(user: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        message: string;
        type: string;
        isRead: boolean;
    }[]>;
    markAsRead(id: string, user: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(user: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
