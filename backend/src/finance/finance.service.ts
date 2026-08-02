import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private prisma: PrismaService) {}

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

  // ========== LEDGER & DOUBLE-ENTRY ACCOUNTING ==========
  async getLedgerEntries() {
    return this.prisma.ledgerEntry.findMany({
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Enterprise Double-Entry Accounting Enforcement:
   * Supports creating balanced transaction pairs (Array of entries where sum(DEBITS) === sum(CREDITS))
   * or a single entry that auto-balances with cash/revenue account.
   */
  async createLedgerEntry(data: any) {
    if (Array.isArray(data)) {
      let totalDebits = 0;
      let totalCredits = 0;

      data.forEach(entry => {
        if (entry.type === 'DEBIT') totalDebits += entry.amount;
        if (entry.type === 'CREDIT') totalCredits += entry.amount;
      });

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new BadRequestException(`Double-Entry Violation: Total Debits ($${totalDebits}) must equal Total Credits ($${totalCredits}). Transaction rejected.`);
      }

      return this.prisma.$transaction(
        data.map(entry => this.prisma.ledgerEntry.create({ data: entry }))
      );
    }

    // Auto-balancing single entry pair if provided as single object
    const counterType = data.type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
    const counterAccount = data.type === 'DEBIT' ? '1010-CASH' : '4000-REVENUE';

    return this.prisma.$transaction(async (tx) => {
      const entry1 = await tx.ledgerEntry.create({ data });
      const entry2 = await tx.ledgerEntry.create({
        data: {
          account: counterAccount,
          type: counterType,
          amount: data.amount,
          description: `Auto-balanced contra entry for ${data.account}`,
          date: data.date || new Date(),
        },
      });
      return [entry1, entry2];
    });
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

  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
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
