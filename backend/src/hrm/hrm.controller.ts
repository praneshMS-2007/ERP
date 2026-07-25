import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { HrmService } from './hrm.service';
import { Prisma } from '@prisma/client';

@Controller('hrm')
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  @Get('employees')
  getEmployees(@Query('departmentId') departmentId?: string, @Query('status') status?: string) {
    return this.hrmService.getEmployees(departmentId, status);
  }

  @Get('employees/:id')
  getEmployeeById(@Param('id') id: string) {
    return this.hrmService.getEmployeeById(id);
  }

  @Post('employees')
  createEmployee(@Body() data: Prisma.EmployeeUncheckedCreateInput) {
    return this.hrmService.createEmployee(data);
  }

  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() data: Prisma.EmployeeUncheckedUpdateInput) {
    return this.hrmService.updateEmployee(id, data);
  }

  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string) {
    return this.hrmService.deleteEmployee(id);
  }

  @Get('attendance')
  getAttendance(@Query('employeeId') employeeId?: string, @Query('date') date?: string) {
    return this.hrmService.getAttendance(employeeId, date);
  }

  @Post('attendance')
  markAttendance(@Body() data: Prisma.AttendanceUncheckedCreateInput) {
    return this.hrmService.markAttendance(data);
  }

  @Get('leaves')
  getLeaves(@Query('status') status?: string) {
    return this.hrmService.getLeaves(status);
  }

  @Post('leaves')
  requestLeave(@Body() data: Prisma.LeaveUncheckedCreateInput) {
    return this.hrmService.requestLeave(data);
  }

  @Put('leaves/:id/status')
  updateLeaveStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.hrmService.updateLeaveStatus(id, status);
  }
}
