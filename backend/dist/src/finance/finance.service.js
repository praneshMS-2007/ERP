"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FinanceService = FinanceService_1 = class FinanceService {
    prisma;
    logger = new common_1.Logger(FinanceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardMetrics() {
        const revenueAgg = await this.prisma.income.aggregate({
            _sum: { amount: true },
        });
        const totalRevenue = revenueAgg._sum.amount || 0;
        const expenseAgg = await this.prisma.expense.aggregate({
            _sum: { amount: true },
        });
        const totalExpenses = expenseAgg._sum.amount || 0;
        const netProfit = totalRevenue - totalExpenses;
        const outstandingAgg = await this.prisma.invoice.aggregate({
            where: { status: { in: ['UNPAID', 'OVERDUE'] } },
            _sum: { amount: true },
        });
        const outstandingInvoices = outstandingAgg._sum.amount || 0;
        const totalInvoices = await this.prisma.invoice.count();
        const paidInvoices = await this.prisma.invoice.count({ where: { status: 'PAID' } });
        const pendingExpenses = await this.prisma.expense.count({ where: { status: 'PENDING' } });
        return {
            totalRevenue,
            totalExpenses,
            netProfit,
            outstandingInvoices,
            totalInvoices,
            paidInvoices,
            pendingExpenses,
        };
    }
    async getExpenses() {
        return this.prisma.expense.findMany({
            orderBy: { date: 'desc' },
        });
    }
    async createExpense(data) {
        return this.prisma.expense.create({ data });
    }
    async getInvoices() {
        return this.prisma.invoice.findMany({
            include: { payments: true },
            orderBy: { dueDate: 'asc' },
        });
    }
    async createInvoice(data) {
        if (!data.invoiceNo) {
            const count = await this.prisma.invoice.count();
            data.invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
        }
        return this.prisma.invoice.create({ data });
    }
    async getIncomes() {
        return this.prisma.income.findMany({
            orderBy: { date: 'desc' },
        });
    }
    async createIncome(data) {
        return this.prisma.income.create({ data });
    }
    async getBudgets() {
        return this.prisma.budget.findMany({
            orderBy: { startDate: 'desc' },
        });
    }
    async getLedgerEntries() {
        return this.prisma.ledgerEntry.findMany({
            orderBy: { date: 'desc' },
        });
    }
    async createLedgerEntry(data) {
        return this.prisma.ledgerEntry.create({ data });
    }
    async getTaxRecords() {
        return this.prisma.taxRecord.findMany({
            orderBy: { dueDate: 'asc' },
        });
    }
    async createTaxRecord(data) {
        return this.prisma.taxRecord.create({ data });
    }
    async updateTaxStatus(id, status) {
        return this.prisma.taxRecord.update({
            where: { id },
            data: { status },
        });
    }
    async getPayments() {
        return this.prisma.payment.findMany({
            include: { invoice: { select: { invoiceNo: true, clientName: true } } },
            orderBy: { date: 'desc' },
        });
    }
    async createPayment(data) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({ data });
            if (data.invoiceId) {
                const invoice = await tx.invoice.findUnique({
                    where: { id: data.invoiceId },
                    include: { payments: true },
                });
                if (invoice) {
                    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + data.amount;
                    let newStatus = invoice.status;
                    if (totalPaid >= invoice.amount) {
                        newStatus = 'PAID';
                    }
                    else if (totalPaid > 0) {
                        newStatus = 'PARTIALLY_PAID';
                    }
                    if (newStatus !== invoice.status) {
                        await tx.invoice.update({
                            where: { id: data.invoiceId },
                            data: { status: newStatus },
                        });
                        this.logger.log(`Invoice ${invoice.invoiceNo} status updated to ${newStatus} (paid: ${totalPaid}/${invoice.amount})`);
                    }
                }
            }
            return payment;
        });
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = FinanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map