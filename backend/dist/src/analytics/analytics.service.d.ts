import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardMetrics(): Promise<{
        employees: number;
        activeProjects: number;
        totalCustomers: number;
        revenueYTD: number;
        inventoryValue: number;
    }>;
    getRevenueTrend(): Promise<{
        labels: string[];
        data: any[];
    }>;
}
