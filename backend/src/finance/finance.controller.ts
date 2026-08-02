import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RequirePermission } from '../auth/decorators';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('dashboard')
  @RequirePermission('FINANCE', 'READ')
  async getDashboardMetrics() {
    return this.financeService.getDashboardMetrics();
  }

  @Get('expenses')
  @RequirePermission('FINANCE', 'READ')
  async getExpenses() {
    return this.financeService.getExpenses();
  }

  @Post('expenses')
  @RequirePermission('FINANCE', 'WRITE')
  async createExpense(@Body() data: any) {
    return this.financeService.createExpense(data);
  }

  @Get('invoices')
  @RequirePermission('FINANCE', 'READ')
  async getInvoices() {
    return this.financeService.getInvoices();
  }

  @Post('invoices')
  @RequirePermission('FINANCE', 'WRITE')
  async createInvoice(@Body() data: any) {
    return this.financeService.createInvoice(data);
  }

  @Get('incomes')
  @RequirePermission('FINANCE', 'READ')
  async getIncomes() {
    return this.financeService.getIncomes();
  }

  @Post('incomes')
  @RequirePermission('FINANCE', 'WRITE')
  async createIncome(@Body() data: any) {
    return this.financeService.createIncome(data);
  }

  @Get('budgets')
  @RequirePermission('FINANCE', 'READ')
  async getBudgets() {
    return this.financeService.getBudgets();
  }

  @Get('payments')
  @RequirePermission('FINANCE', 'READ')
  async getPayments() {
    return this.financeService.getPayments();
  }

  @Post('payments')
  @RequirePermission('FINANCE', 'WRITE')
  async createPayment(@Body() data: any) {
    return this.financeService.createPayment(data);
  }

  // ========== LEDGER ==========
  @Get('ledger')
  @RequirePermission('FINANCE', 'READ')
  async getLedgerEntries() {
    return this.financeService.getLedgerEntries();
  }

  @Post('ledger')
  @RequirePermission('FINANCE', 'WRITE')
  async createLedgerEntry(@Body() data: any) {
    return this.financeService.createLedgerEntry(data);
  }

  // ========== TAX ==========
  @Get('taxes')
  @RequirePermission('FINANCE', 'READ')
  async getTaxRecords() {
    return this.financeService.getTaxRecords();
  }

  @Post('taxes')
  @RequirePermission('FINANCE', 'WRITE')
  async createTaxRecord(@Body() data: any) {
    return this.financeService.createTaxRecord(data);
  }

  @Put('taxes/:id/status')
  @RequirePermission('FINANCE', 'WRITE')
  async updateTaxStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.financeService.updateTaxStatus(id, status);
  }
}
