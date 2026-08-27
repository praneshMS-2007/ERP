import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { formatINR } from '../common/currency';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private prisma: PrismaService) {}

  // None of the money fields this module writes have a real "negative"
  // business meaning in this schema — an expense, income, budget
  // allocation, tax bill, or payment is either a real positive amount or it
  // shouldn't exist as a row at all.
  private assertPositiveAmount(amount: number | undefined, label: string) {
    if (amount === undefined || amount === null || Number.isNaN(amount) || amount <= 0) {
      throw new BadRequestException(`${label} must be a positive amount.`);
    }
  }

  // Prisma's DateTime columns reject a plain "YYYY-MM-DD" string outright
  // (it wants full ISO-8601 with a time component) and surface that as a
  // raw 500 — this parses explicitly so a date-only string (exactly what an
  // HTML <input type="date"> produces) becomes a clean 400 instead.
  private parseRequiredDate(value: unknown, label: string): Date {
    const date = new Date(value as any);
    if (!value || Number.isNaN(date.getTime())) {
      throw new BadRequestException(`A valid ${label} is required.`);
    }
    return date;
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

  async createExpense(data: Prisma.ExpenseUncheckedCreateInput) {
    this.assertPositiveAmount(data.amount, 'Expense amount');
    const date = this.parseRequiredDate(data.date, 'date');
    return this.prisma.expense.create({ data: { ...data, date } });
  }

  async updateExpense(id: string, data: Prisma.ExpenseUncheckedUpdateInput) {
    return this.prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: string) {
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted.' };
  }

  async getInvoices() {
    return this.prisma.invoice.findMany({
      include: { payments: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createInvoice(data: Prisma.InvoiceUncheckedCreateInput) {
    this.assertPositiveAmount(data.amount, 'Invoice amount');
    const dueDate = this.parseRequiredDate(data.dueDate, 'due date');
    if (!data.invoiceNo) {
      const count = await this.prisma.invoice.count();
      data.invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
    return this.prisma.invoice.create({ data: { ...data, dueDate } });
  }

  // Deliberately excludes `status` — that's only ever meant to move via
  // real Payments (see createPayment below), never a direct edit, so this
  // can't be used to fake an invoice into looking paid.
  async updateInvoice(id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    const { status, ...rest } = data;
    return this.prisma.invoice.update({ where: { id }, data: rest });
  }

  async deleteInvoice(id: string) {
    await this.prisma.invoice.delete({ where: { id } });
    return { message: 'Invoice deleted.' };
  }

  async getIncomes() {
    return this.prisma.income.findMany({
      orderBy: { date: 'desc' },
    });
  }

  async createIncome(data: Prisma.IncomeUncheckedCreateInput) {
    this.assertPositiveAmount(data.amount, 'Income amount');
    const date = this.parseRequiredDate(data.date, 'date');
    return this.prisma.income.create({ data: { ...data, date } });
  }

  async updateIncome(id: string, data: Prisma.IncomeUncheckedUpdateInput) {
    return this.prisma.income.update({ where: { id }, data });
  }

  async deleteIncome(id: string) {
    await this.prisma.income.delete({ where: { id } });
    return { message: 'Income deleted.' };
  }

  async getBudgets() {
    return this.prisma.budget.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createBudget(data: Prisma.BudgetUncheckedCreateInput) {
    this.assertPositiveAmount(data.planned, 'Planned budget amount');
    const startDate = this.parseRequiredDate(data.startDate, 'start date');
    const endDate = this.parseRequiredDate(data.endDate, 'end date');
    if (endDate < startDate) throw new BadRequestException('The end date cannot be before the start date.');
    return this.prisma.budget.create({ data: { ...data, startDate, endDate } });
  }

  async updateBudget(id: string, data: Prisma.BudgetUncheckedUpdateInput) {
    return this.prisma.budget.update({ where: { id }, data });
  }

  async deleteBudget(id: string) {
    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Budget deleted.' };
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
      // Checked before the debit/credit balance check below, not instead of
      // it: two negative amounts (e.g. DEBIT -100 / CREDIT -100) sum to
      // equal totals and would otherwise sail through as "balanced," while
      // actually representing the opposite real transaction in disguise.
      data.forEach((entry) => this.assertPositiveAmount(entry.amount, 'Each ledger entry amount'));
      // `date` defaults to now() at the DB level only when the field is
      // absent entirely — a present-but-date-only string ("YYYY-MM-DD")
      // still needs parsing, or Prisma rejects it with a raw 500.
      data.forEach((entry) => { if (entry.date) entry.date = this.parseRequiredDate(entry.date, 'date'); });

      let totalDebits = 0;
      let totalCredits = 0;

      data.forEach(entry => {
        if (entry.type === 'DEBIT') totalDebits += entry.amount;
        if (entry.type === 'CREDIT') totalCredits += entry.amount;
      });

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new BadRequestException(`Double-Entry Violation: Total Debits (${formatINR(totalDebits)}) must equal Total Credits (${formatINR(totalCredits)}). Transaction rejected.`);
      }

      return this.prisma.$transaction(
        data.map(entry => this.prisma.ledgerEntry.create({ data: entry }))
      );
    }

    // Auto-balancing single entry pair if provided as single object
    this.assertPositiveAmount(data.amount, 'Ledger entry amount');
    if (data.date) data.date = this.parseRequiredDate(data.date, 'date');
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
    this.assertPositiveAmount(data.amount, 'Tax amount');
    if (!data.period?.trim()) throw new BadRequestException('A period is required.');
    if (!data.taxType?.trim()) throw new BadRequestException('A tax type is required.');
    const dueDate = this.parseRequiredDate(data.dueDate, 'due date');
    return this.prisma.taxRecord.create({ data: { ...data, dueDate } });
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
    this.assertPositiveAmount(data.amount, 'Payment amount');
    const date = this.parseRequiredDate(data.date, 'date');
    data = { ...data, date };
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
