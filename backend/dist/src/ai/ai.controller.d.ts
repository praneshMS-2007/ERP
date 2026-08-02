import { AiService } from './ai.service';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    chat(body: {
        messages: any[];
    }): Promise<any>;
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
