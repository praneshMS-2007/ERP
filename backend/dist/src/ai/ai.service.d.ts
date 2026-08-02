import { PrismaService } from '../prisma/prisma.service';
export declare class AiService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    chatCompletion(messages: any[]): Promise<any>;
    getSalesInsights(): Promise<{
        bestPerformingMonth: string;
        highestConvertingSalesRep: string;
        leadConversionRate: string;
        revenueGrowthInsights: string;
        outputs: string[];
    }>;
    getHrInsights(): Promise<{
        employeeAttendance: string;
        leaveRequestsTrend: string;
        topPerformers: string;
        outputs: string[];
    }>;
    getInventoryInsights(): Promise<{
        productsBelowReorderLevel: number;
        inventoryValue: string;
        outputs: string[];
    }>;
    getExecutiveSummary(): Promise<{
        summary: string;
    }>;
}
