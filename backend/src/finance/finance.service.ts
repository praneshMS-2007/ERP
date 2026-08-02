import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * BUSINESS LOGIC: Real dashboard metrics from actual database records.
   * No more mock data — all values are calculated from live tables.
   */
  async getDashboardMetrics() {
    // Total Revenue = sum of all Income records
    const revenueAgg = await this.prisma.income.aggregate({
      _sum: { amount: true },
    });
    const totalRevenue = revenueAgg._sum.amount || 0;

    // Total Expenses = sum of all Expense records
    const expenseAgg = await this.prisma.expense.aggregate({
      _sum: { amount: true },
    });
    const totalExpenses = expenseAgg._sum.amount || 0;

    // Net Profit
    const netProfit = totalRevenue - totalExpenses;

    // Outstanding Invoices = sum of invoices that are UNPAID or OVERDUE
    const outstandingAgg = await this.prisma.invoice.aggregate({
      where: { status: { in: ['UNPAID', 'OVERDUE'] } },
      _sum: { amount: true },
    });
    const outstandingInvoices = outstandingAgg._sum.amount || 0;

    // Additional useful metrics
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

  async createExpense(data: Prisma.ExpenseUncheckedCreateInput) {
    return this.prisma.expense.create({ data });
  }

  async getInvoices() {
    return this.prisma.invoice.findMany({
      include: { payments: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createInvoice(data: Prisma.InvoiceUncheckedCreateInput) {
    // Auto-generate invoice number if not provided
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

  async createIncome(data: Prisma.IncomeUncheckedCreateInput) {
    return this.prisma.income.create({ data });
  }

  async getBudgets() {
    return this.prisma.budget.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  // ========== LEDGER ==========
  async getLedgerEntries() {
    return this.prisma.ledgerEntry.findMany({
      orderBy: { date: 'desc' },
    });
  }

  async createLedgerEntry(data: Prisma.LedgerEntryUncheckedCreateInput) {
    return this.prisma.ledgerEntry.create({ data });
  }

  // ========== TAX ==========
  async getTaxRecords() {
    return this.prisma.taxRecord.findMany({
      orderBy: { dueDate: 'asc' },
    });
  }

  async createTaxRecord(data: Prisma.TaxRecordUncheckedCreateInput) {
    return this.prisma.taxRecord.create({ data });
  }

  async updateTaxStatus(id: string, status: any) {
    return this.prisma.taxRecord.update({
      where: { id },
      data: { status },
    });
  }

  // ========== PAYMENTS ==========
  async getPayments() {
    return this.prisma.payment.findMany({
      include: { invoice: { select: { invoiceNo: true, clientName: true } } },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * BUSINESS LOGIC: When a payment is recorded against an invoice,
   * auto-update the invoice status based on total payments received.
   */
  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the payment
      const payment = await tx.payment.create({ data });

      // 2. If linked to an invoice, check if fully paid
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
          } else if (totalPaid > 0) {
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
}
