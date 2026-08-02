import { FinanceService } from './finance.service';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    getDashboardMetrics(): Promise<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        outstandingInvoices: number;
        totalInvoices: number;
        paidInvoices: number;
        pendingExpenses: number;
    }>;
    getExpenses(): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ExpenseStatus;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        date: Date;
        amount: number;
    }[]>;
    createExpense(data: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ExpenseStatus;
        category: import(".prisma/client").$Enums.ExpenseCategory;
        date: Date;
        amount: number;
    }>;
    getInvoices(): Promise<({
        payments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            date: Date;
            amount: number;
            method: import(".prisma/client").$Enums.PaymentMethod;
            invoiceId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        amount: number;
        dueDate: Date;
        invoiceNo: string;
        clientId: string | null;
        clientName: string;
    })[]>;
    createInvoice(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        amount: number;
        dueDate: Date;
        invoiceNo: string;
        clientId: string | null;
        clientName: string;
    }>;
    getIncomes(): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        amount: number;
        source: string;
    }[]>;
    createIncome(data: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        amount: number;
        source: string;
    }>;
    getBudgets(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        department: string;
        startDate: Date;
        endDate: Date;
        planned: number;
        actual: number;
    }[]>;
    getPayments(): Promise<({
        invoice: {
            invoiceNo: string;
            clientName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        date: Date;
        amount: number;
        method: import(".prisma/client").$Enums.PaymentMethod;
        invoiceId: string | null;
    })[]>;
    createPayment(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        date: Date;
        amount: number;
        method: import(".prisma/client").$Enums.PaymentMethod;
        invoiceId: string | null;
    }>;
    getLedgerEntries(): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        amount: number;
        account: string;
        type: import(".prisma/client").$Enums.LedgerType;
    }[]>;
    createLedgerEntry(data: any): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        amount: number;
        account: string;
        type: import(".prisma/client").$Enums.LedgerType;
    }[]>;
    getTaxRecords(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaxStatus;
        amount: number;
        dueDate: Date;
        period: string;
        taxType: string;
    }[]>;
    createTaxRecord(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaxStatus;
        amount: number;
        dueDate: Date;
        period: string;
        taxType: string;
    }>;
    updateTaxStatus(id: string, status: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TaxStatus;
        amount: number;
        dueDate: Date;
        period: string;
        taxType: string;
    }>;
}
