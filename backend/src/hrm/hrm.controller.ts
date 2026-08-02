import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { HrmService } from './hrm.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('hrm')
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  @Get('employees')
  @RequirePermission('HR', 'READ')
  getEmployees(@Query('departmentId') departmentId?: string, @Query('status') status?: string) {
    return this.hrmService.getEmployees(departmentId, status);
  }

  @Get('employees/:id')
  @RequirePermission('HR', 'READ')
  getEmployeeById(@Param('id') id: string) {
    return this.hrmService.getEmployeeById(id);
  }

  @Post('employees')
  @RequirePermission('HR', 'WRITE')
  createEmployee(@Body() data: Prisma.EmployeeUncheckedCreateInput) {
    return this.hrmService.createEmployee(data);
  }

  @Put('employees/:id')
  @RequirePermission('HR', 'WRITE')
  updateEmployee(@Param('id') id: string, @Body() data: Prisma.EmployeeUncheckedUpdateInput) {
    return this.hrmService.updateEmployee(id, data);
  }

  @Delete('employees/:id')
  @RequirePermission('HR', 'DELETE')
  deleteEmployee(@Param('id') id: string) {
    return this.hrmService.deleteEmployee(id);
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
}
