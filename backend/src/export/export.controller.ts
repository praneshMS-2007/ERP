import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { RequestUser } from '../hrm/hrm.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('employees')
  @RequirePermission('HR', 'READ')
  async exportEmployees(@Query('format') format: string, @Res() res: Response) {
    if (format === 'pdf') {
      const buffer = await this.exportService.exportEmployeesPdf();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=employees.pdf',
      });
      return res.send(buffer);
    }

    // Default to xlsx
    const buffer = await this.exportService.exportEmployeesExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=employees.xlsx',
    });
    return res.send(buffer);
  }

  // HR:WRITE, not READ — matches /hrm/leaves. Every employee's leave
  // reasons in one download is the same leak that endpoint had before it
  // was tightened; the export route bypassed that fix entirely.
  @Get('hrm/leaves')
  @RequirePermission('HR', 'WRITE')
  async exportLeaves(@Query('format') format: string, @Res() res: Response) {
    if (format === 'pdf') {
      const buffer = await this.exportService.exportLeavesPdf();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=leave_history.pdf',
      });
      return res.send(buffer);
    }

    const buffer = await this.exportService.exportLeavesExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=leave_history.xlsx',
    });
    return res.send(buffer);
  }

  @Get('inventory/products')
  @RequirePermission('INVENTORY', 'READ')
  async exportProducts(@Query('format') format: string, @Res() res: Response) {
    const buffer = await this.exportService.exportProductsExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=products.xlsx',
    });
    return res.send(buffer);
  }

  @Get('crm/customers')
  @RequirePermission('CRM', 'READ')
  async exportCustomers(@Query('format') format: string, @Res() res: Response) {
    const buffer = await this.exportService.exportCustomersExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=customers.xlsx',
    });
    return res.send(buffer);
  }

  @Get('projects')
  @RequirePermission('PROJECTS', 'READ')
  async exportProjects(@Query('format') format: string, @Res() res: Response) {
    const buffer = await this.exportService.exportProjectsExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=projects.xlsx',
    });
    return res.send(buffer);
  }

  @Get('finance/ledger')
  @RequirePermission('FINANCE', 'READ')
  async exportLedger(@Query('format') format: string, @Res() res: Response) {
    const buffer = await this.exportService.exportLedgerExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=ledger.xlsx',
    });
    return res.send(buffer);
  }

  @Get('finance/expenses')
  @RequirePermission('FINANCE', 'READ')
  async exportExpenses(@Query('format') format: string, @Res() res: Response) {
    const buffer = await this.exportService.exportExpensesExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=expenses.xlsx',
    });
    return res.send(buffer);
  }

  @Get('hrm/attendance')
  @RequirePermission('HR', 'READ')
  async exportAttendance(
    @Query('format') format: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    if (format === 'pdf') {
      const buffer = await this.exportService.exportAttendancePdf(m, y);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=attendance_${m}_${y}.pdf`,
      });
      return res.send(buffer);
    }

    const buffer = await this.exportService.exportAttendanceExcel(m, y);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=attendance_${m}_${y}.xlsx`,
    });
    return res.send(buffer);
  }

  // Date-range history for one employee — HR/Admin looking at someone
  // else's record. Same HR:WRITE gate as the calendar route this reads
  // from (GET /hrm/employees/:id/attendance/calendar).
  @Get('hrm/employees/:id/attendance')
  @RequirePermission('HR', 'WRITE')
  async exportEmployeeAttendanceRange(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportEmployeeAttendanceRangeExcel(id, from, to);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=attendance_${from}_to_${to}.xlsx`,
    });
    return res.send(buffer);
  }

  // Date-range history for the caller's own record.
  @Get('self/attendance')
  @RequirePermission('SELF', 'READ')
  async exportSelfAttendanceRange(
    @CurrentUser() user: RequestUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportSelfAttendanceRangeExcel(user, from, to);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=my_attendance_${from}_to_${to}.xlsx`,
    });
    return res.send(buffer);
  }
}
