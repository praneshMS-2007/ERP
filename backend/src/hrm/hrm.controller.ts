import { Controller, Get, Post, Body, Param, Put, Delete, Query, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HrmService } from './hrm.service';
import type { RequestUser } from './hrm.service';
import { Prisma } from '@prisma/client';
import { RequirePermission, CurrentUser } from '../auth/decorators';

@Controller('hrm')
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

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
  createEmployee(@Body() data: Record<string, any>) {
    return this.hrmService.createEmployee(data);
  }

  @Put('employees/:id')
  @RequirePermission('HR', 'WRITE')
  updateEmployee(@Param('id') id: string, @Body() data: Record<string, any>) {
    return this.hrmService.updateEmployee(id, data);
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
  resetUserPassword(@Param('id') id: string) {
    return this.hrmService.resetUserPassword(id);
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

  @Get('leaves')
  @RequirePermission('HR', 'READ')
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
  @Get('payrolls')
  @RequirePermission('HR', 'READ')
  getPayrolls() {
    return this.hrmService.getPayrolls();
  }

  @Post('payrolls')
  @RequirePermission('HR', 'WRITE')
  createPayroll(@Body() data: Prisma.PayrollUncheckedCreateInput) {
    return this.hrmService.createPayroll(data);
  }

  @Put('payrolls/:id/status')
  @RequirePermission('HR', 'WRITE')
  updatePayrollStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.hrmService.updatePayrollStatus(id, status);
  }

  // ========== RECRUITMENT ==========
  @Get('jobs')
  @RequirePermission('HR', 'READ')
  getJobPostings() {
    return this.hrmService.getJobPostings();
  }

  @Post('jobs')
  @RequirePermission('HR', 'WRITE')
  createJobPosting(@Body() data: Prisma.JobPostingUncheckedCreateInput) {
    return this.hrmService.createJobPosting(data);
  }

  @Get('applicants')
  @RequirePermission('HR', 'READ')
  getApplicants() {
    return this.hrmService.getApplicants();
  }

  @Post('applicants')
  @RequirePermission('HR', 'WRITE')
  createApplicant(@Body() data: Prisma.ApplicantUncheckedCreateInput) {
    return this.hrmService.createApplicant(data);
  }

  @Put('applicants/:id/status')
  @RequirePermission('HR', 'WRITE')
  updateApplicantStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.hrmService.updateApplicantStatus(id, status);
  }

  // ========== PERFORMANCE REVIEWS ==========
  @Get('performance-reviews')
  @RequirePermission('HR', 'READ')
  getPerformanceReviews() {
    return this.hrmService.getPerformanceReviews();
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
}
