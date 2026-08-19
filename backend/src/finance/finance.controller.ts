import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
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

  @Put('expenses/:id')
  @RequirePermission('FINANCE', 'WRITE')
  async updateExpense(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateExpense(id, data);
  }

  @Delete('expenses/:id')
  @RequirePermission('FINANCE', 'DELETE')
  async deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
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

  @Put('invoices/:id')
  @RequirePermission('FINANCE', 'WRITE')
  async updateInvoice(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateInvoice(id, data);
  }

  @Delete('invoices/:id')
  @RequirePermission('FINANCE', 'DELETE')
  async deleteInvoice(@Param('id') id: string) {
    return this.financeService.deleteInvoice(id);
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

  @Put('incomes/:id')
  @RequirePermission('FINANCE', 'WRITE')
  async updateIncome(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateIncome(id, data);
  }

  @Delete('incomes/:id')
  @RequirePermission('FINANCE', 'DELETE')
  async deleteIncome(@Param('id') id: string) {
    return this.financeService.deleteIncome(id);
  }

  @Get('budgets')
  @RequirePermission('FINANCE', 'READ')
  async getBudgets() {
    return this.financeService.getBudgets();
  }

  @Post('budgets')
  @RequirePermission('FINANCE', 'WRITE')
  async createBudget(@Body() data: any) {
    return this.financeService.createBudget(data);
  }

  @Put('budgets/:id')
  @RequirePermission('FINANCE', 'WRITE')
  async updateBudget(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateBudget(id, data);
  }

  @Delete('budgets/:id')
  @RequirePermission('FINANCE', 'DELETE')
  async deleteBudget(@Param('id') id: string) {
    return this.financeService.deleteBudget(id);
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
