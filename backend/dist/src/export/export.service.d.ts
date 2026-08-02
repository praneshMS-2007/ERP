import { PrismaService } from '../prisma/prisma.service';
export declare class ExportService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    exportEmployeesExcel(): Promise<Buffer>;
    exportProductsExcel(): Promise<Buffer>;
    exportCustomersExcel(): Promise<Buffer>;
    exportProjectsExcel(): Promise<Buffer>;
    exportLedgerExcel(): Promise<Buffer>;
    exportExpensesExcel(): Promise<Buffer>;
    exportEmployeesPdf(): Promise<Buffer>;
    exportLeavesExcel(): Promise<Buffer>;
    exportLeavesPdf(): Promise<Buffer>;
    exportAttendanceExcel(month: number, year: number): Promise<Buffer>;
    exportAttendancePdf(month: number, year: number): Promise<Buffer>;
}
