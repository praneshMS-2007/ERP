import { Controller, Get, Post, Body, Param, Put, Delete, Query, Res, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { HrmService } from './hrm.service';
import type { RequestUser, PayrollManualInput } from './hrm.service';
import { InternshipCertificateService } from './internship-certificate.service';
import { Prisma } from '@prisma/client';
import { RequirePermission, CurrentUser } from '../auth/decorators';

@Controller('hrm')
export class HrmController {
  constructor(
    private readonly hrmService: HrmService,
    private readonly internshipCertService: InternshipCertificateService,
  ) {}

  // Gated at HR:READ so every role can reach it (including EMPLOYEE, who
  // needs their own payslip/offer letter/certificate) — the real check is
  // inside resolveGeneratedDocumentForDownload: owner, or HR/Admin only.
  @Get('documents/:id/download')
  @RequirePermission('HR', 'READ')
  async downloadGeneratedDocument(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { fullPath, fileName } = await this.hrmService.resolveGeneratedDocumentForDownload(id, user);
    res.download(fullPath, fileName);
  }

  @Get('employees')
  @RequirePermission('HR', 'READ')
  getEmployees(
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.hrmService.getEmployees(departmentId, status, user);
  }

  @Get('employees/:id')
  @RequirePermission('HR', 'READ')
  getEmployeeById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.hrmService.getEmployeeById(id, user);
  }

  @Post('employees')
  @RequirePermission('HR', 'WRITE')
  createEmployee(@Body() data: Record<string, any>, @CurrentUser() user: RequestUser) {
    return this.hrmService.createEmployee(data, user);
  }

  @Put('employees/:id')
  @RequirePermission('HR', 'WRITE')
  updateEmployee(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.hrmService.updateEmployee(id, data);
  }

  @Post('employees/:id/offer-letter')
  @RequirePermission('HR', 'WRITE')
  sendOfferLetter(@Param('id') id: string) {
    return this.hrmService.sendOfferLetter(id);
  }

  /**
   * Salary is a separate route from the rest of the profile so it can carry a
   * stricter permission — HR may edit a phone number without being able to
   * change pay.
   */
  @Put('employees/:id/salary')
  @RequirePermission('HR', 'WRITE')
  setSalaryStructure(
    @Param('id') id: string,
    @Body() body: { basic: number; hra?: number; specialAllowance?: number; effectiveFrom?: string; note?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.hrmService.setSalaryStructure(id, body, user?.id);
  }

  @Delete('employees/:id')
  @RequirePermission('HR', 'DELETE')
  deleteEmployee(@Param('id') id: string) {
    return this.hrmService.deleteEmployee(id);
  }

  /**
   * The button HR actually uses day to day: moves the employee to Former
   * Employees and revokes their ERP login. Not a delete — the record and
   * every history table (payroll, leave, attendance) stays intact.
   */
  @Put('employees/:id/remove')
  @RequirePermission('HR', 'WRITE')
  removeEmployee(@Param('id') id: string, @Body('lastWorkingDay') lastWorkingDay?: string) {
    return this.hrmService.removeEmployee(id, lastWorkingDay);
  }

  @Post('employees/:id/avatar')
  @RequirePermission('HR', 'WRITE')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  setAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image was uploaded.');
    return this.hrmService.setAvatar(id, file);
  }

  // HR/Admin's per-employee history drill-down — same calendar engine as
  // the employee's own /self/attendance/calendar, just for someone else.
  @Get('employees/:id/attendance/calendar')
  @RequirePermission('HR', 'WRITE')
  getEmployeeAttendanceCalendar(@Param('id') id: string, @Query('year') year: string, @Query('month') month: string) {
    return this.hrmService.getEmployeeAttendanceCalendar(id, parseInt(year, 10), parseInt(month, 10));
  }

  // ========== USER MANAGEMENT ==========
  // Gated on HR:WRITE, same as payroll and salary — only SUPER_ADMIN and
  // HR_MANAGER hold that permission, matching "admin or HR only" exactly.

  @Get('users')
  @RequirePermission('HR', 'WRITE')
  getUsers() {
    return this.hrmService.getUsers();
  }

  @Put('users/:id/reset-password')
  @RequirePermission('HR', 'WRITE')
  resetUserPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.hrmService.resetUserPassword(id, body.newPassword);
  }

  @Get('password-reset-requests')
  @RequirePermission('HR', 'WRITE')
  getPasswordResetRequests() {
    return this.hrmService.getPasswordResetRequests();
  }

  @Put('password-reset-requests/:id/resolve')
  @RequirePermission('HR', 'WRITE')
  resolvePasswordResetRequest(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.hrmService.resolvePasswordResetRequest(id, user);
  }

  // ========== ATTENDANCE STATS & TREND (Subpaths placed first for NestJS router precedence) ==========
  @Get('attendance/stats')
  @RequirePermission('HR', 'READ')
  getAttendanceStats(@Query('date') date: string) {
    return this.hrmService.getAttendanceStats(date || new Date().toISOString().split('T')[0]);
  }

  @Get('attendance/trend')
  @RequirePermission('HR', 'READ')
  getAttendanceTrend(@Query('year') year: string) {
    return this.hrmService.getMonthlyAttendanceTrend(parseInt(year) || new Date().getFullYear());
  }

  @Get('attendance')
  @RequirePermission('HR', 'READ')
  getAttendance(@Query('employeeId') employeeId?: string, @Query('date') date?: string) {
    return this.hrmService.getAttendance(employeeId, date);
  }

  @Post('attendance')
  @RequirePermission('HR', 'WRITE')
  markAttendance(@Body() data: Prisma.AttendanceUncheckedCreateInput) {
    return this.hrmService.markAttendance(data);
  }

  // ========== COMPANY HOLIDAYS ==========
  @Get('holidays')
  @RequirePermission('HR', 'READ')
  getHolidays() {
    return this.hrmService.getHolidays();
  }

  @Post('holidays')
  @RequirePermission('HR', 'WRITE')
  createHoliday(@Body() body: { date: string; name: string; description?: string }, @CurrentUser() user: RequestUser) {
    return this.hrmService.createHoliday(body, user);
  }

  @Delete('holidays/:id')
  @RequirePermission('HR', 'WRITE')
  deleteHoliday(@Param('id') id: string) {
    return this.hrmService.deleteHoliday(id);
  }

  // HR:WRITE, not READ — deliberately narrower than /hrm/attendance above.
  // Presence/absence today is normal directory-level visibility (used by
  // the Employee Directory's "Today" badge for every viewer). A leave
  // record's *reason* and history is a different kind of information —
  // this endpoint returned every employee's leave requests, reasons
  // included, to any plain EMPLOYEE account before this change. An
  // employee's own leave history is available via /self/leaves instead.
  @Get('leaves')
  @RequirePermission('HR', 'WRITE')
  getLeaves(@Query('status') status?: string) {
    return this.hrmService.getLeaves(status);
  }

  @Post('leaves')
  @RequirePermission('HR', 'WRITE')
  requestLeave(@Body() data: Prisma.LeaveUncheckedCreateInput) {
    return this.hrmService.requestLeave(data);
  }

  @Put('leaves/:id/status')
  @RequirePermission('HR', 'WRITE')
  updateLeaveStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.hrmService.updateLeaveStatus(id, status);
  }

  // ========== PAYROLL ==========
  // Controller gate is deliberately broad (HR:READ) — the narrower
  // "HR, Finance or admin only" check lives in the service, since Finance
  // needs read access here (approves payroll) without holding HR:WRITE.
  @Get('payrolls')
  @RequirePermission('HR', 'READ')
  getPayrolls(@CurrentUser() user: RequestUser) {
    return this.hrmService.getPayrolls(user);
  }

  // HR:WRITE-gated — only SUPER_ADMIN/HR_MANAGER hold it, which is exactly
  // "HR prepares" from the locked segregation-of-duties decision. Finance
  // never holds HR:WRITE, so this alone already keeps Finance from creating
  // records — see updatePayrollStatus for the other half.
  @Post('payrolls')
  @RequirePermission('HR', 'WRITE')
  createPayroll(
    @Body() data: { employeeId: string; payPeriod: string; periodStart: string; periodEnd: string } & Partial<PayrollManualInput>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hrmService.createPayroll(data, user);
  }

  // Lets the Add Payroll modal show the computed Gross/Deductions/Net Pay
  // and real attendance before HR commits to creating the record — same
  // HR:WRITE gate as createPayroll since it's part of that same flow, just
  // non-persisting. Every money figure below is what HR just typed into
  // the modal, echoed back through the same math createPayroll will use.
  @Get('payrolls/preview')
  @RequirePermission('HR', 'WRITE')
  previewPayroll(
    @Query('employeeId') employeeId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('baseSalary') baseSalary?: string,
    @Query('hra') hra?: string,
    @Query('specialAllowance') specialAllowance?: string,
    @Query('bonus') bonus?: string,
    @Query('tds') tds?: string,
    @Query('providentFund') providentFund?: string,
    @Query('professionalTax') professionalTax?: string,
    @Query('lossOfPay') lossOfPay?: string,
  ) {
    const num = (v?: string) => (v !== undefined ? Number(v) : 0);
    return this.hrmService.previewPayroll(employeeId, periodStart, periodEnd, {
      baseSalary: num(baseSalary), hra: num(hra), specialAllowance: num(specialAllowance), bonus: num(bonus),
      tds: num(tds), providentFund: num(providentFund), professionalTax: num(professionalTax), lossOfPay: num(lossOfPay),
    });
  }

  // Gate deliberately broad (HR:READ) — the real "Finance/Admin only, never
  // HR" check lives in the service (canApprovePayroll), same pattern as
  // getPayrolls just above.
  @Put('payrolls/:id/status')
  @RequirePermission('HR', 'READ')
  updatePayrollStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Body('reason') reason: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hrmService.updatePayrollStatus(id, status, reason, user);
  }

  @Post('payrolls/:id/payslip')
  @RequirePermission('HR', 'READ')
  sendPayslip(@Param('id') id: string) {
    return this.hrmService.sendPayslip(id);
  }

  // HR-only — the "resubmit" half of the Return to HR loop, and general
  // record upkeep before Finance has acted on it.
  @Put('payrolls/:id')
  @RequirePermission('HR', 'WRITE')
  updatePayroll(
    @Param('id') id: string,
    @Body() data: { payPeriod?: string } & Partial<PayrollManualInput>,
  ) {
    return this.hrmService.updatePayroll(id, data);
  }

  // HR-only — matches createPayroll's gate; deleting is just undoing a
  // create HR hasn't finished with, never available once Finance paid it.
  @Delete('payrolls/:id')
  @RequirePermission('HR', 'WRITE')
  deletePayroll(@Param('id') id: string) {
    return this.hrmService.deletePayroll(id);
  }

  // ========== PERFORMANCE REVIEWS ==========
  // Controller gate is broad (HR:READ); the HR-only narrowing (ratings,
  // written reviews, goals) lives in the service.
  @Get('performance-reviews')
  @RequirePermission('HR', 'READ')
  getPerformanceReviews(@CurrentUser() user: RequestUser) {
    return this.hrmService.getPerformanceReviews(user);
  }

  // ========== IT ACCESS ==========
  @Get('employees/:id/it-access')
  @RequirePermission('HR', 'READ')
  getItAccessProfile(@Param('id') id: string) {
    return this.hrmService.getItAccessProfile(id);
  }

  @Put('employees/:id/it-access')
  @RequirePermission('HR', 'WRITE')
  upsertItAccessProfile(@Param('id') id: string, @Body() data: Record<string, any>, @CurrentUser() user: RequestUser) {
    return this.hrmService.upsertItAccessProfile(id, data, user?.id);
  }

  // ========== AGREEMENTS & POLICIES ==========
  @Put('employees/:id/agreements/:field')
  @RequirePermission('HR', 'WRITE')
  setAgreementStatus(
    @Param('id') id: string,
    @Param('field') field: string,
    @Body('value') value: boolean,
  ) {
    if (field !== 'ndaSigned' && field !== 'policyAcknowledged') {
      throw new BadRequestException(`"${field}" is not a recognised agreement.`);
    }
    return this.hrmService.setAgreementStatus(id, field, !!value);
  }

  // ========== INTERNSHIP COMPLETION CERTIFICATES ==========
  // HR_MANAGER or SUPER_ADMIN only — gated via HR:WRITE.
  // Lists interns whose engagementEndDate has passed, and lets HR
  // approve (generate PDF + send email) or reject the certificate.

  @Get('internship-certificates')
  @RequirePermission('HR', 'WRITE')
  getInternshipCertificates() {
    return this.internshipCertService.getCompletedInterns();
  }

  @Post('internship-certificates/:id/approve')
  @RequirePermission('HR', 'WRITE')
  approveInternshipCertificate(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.internshipCertService.approveAndSend(id, user);
  }

  @Post('internship-certificates/:id/reject')
  @RequirePermission('HR', 'WRITE')
  rejectInternshipCertificate(@Param('id') id: string, @Body('reason') reason?: string, @CurrentUser() user?: RequestUser) {
    return this.internshipCertService.reject(id, reason, user);
  }
}

