import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
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
