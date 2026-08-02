import type { Response } from 'express';
import { ExportService } from './export.service';
export declare class ExportController {
    private readonly exportService;
    constructor(exportService: ExportService);
    exportEmployees(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportLeaves(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportProducts(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportCustomers(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportProjects(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportLedger(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportExpenses(format: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportAttendance(format: string, month: string, year: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
