import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HrmService } from './hrm.service';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { RequestUser } from './hrm.service';

/**
 * Self-service routes — every one derives the employee from the caller's
 * JWT, never from a request parameter. This is the entire point of the
 * SELF module: an employee can manage their own leave/attendance/profile
 * without holding any broader HR permission, and there is no way to steer
 * these routes at anyone else's record.
 */
@Controller('self')
export class SelfController {
  constructor(private readonly hrmService: HrmService) {}

  @Get('profile')
  @RequirePermission('SELF', 'READ')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfProfile(user);
  }

  @Get('leaves')
  @RequirePermission('SELF', 'READ')
  getLeaves(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfLeaves(user);
  }

  @Post('leaves')
  @RequirePermission('SELF', 'WRITE')
  requestLeave(
    @Body() body: { leaveType: string; startDate: string; endDate: string; reason: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.hrmService.requestSelfLeave(user, body);
  }

  @Get('attendance')
  @RequirePermission('SELF', 'READ')
  getAttendance(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfAttendance(user);
  }

  @Post('attendance/clock-in')
  @RequirePermission('SELF', 'WRITE')
  clockIn(@CurrentUser() user: RequestUser) {
    return this.hrmService.clockInSelf(user);
  }

  @Get('attendance/calendar')
  @RequirePermission('SELF', 'READ')
  getAttendanceCalendar(@Query('year') year: string, @Query('month') month: string, @CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfAttendanceCalendar(user, parseInt(year, 10), parseInt(month, 10));
  }

  @Get('leaves/balance')
  @RequirePermission('SELF', 'READ')
  getLeaveBalance(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfLeaveBalance(user);
  }

  @Get('payroll')
  @RequirePermission('SELF', 'READ')
  getPayroll(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfPayroll(user);
  }

  @Get('projects')
  @RequirePermission('SELF', 'READ')
  getProjects(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfProjects(user);
  }

  @Get('tasks')
  @RequirePermission('SELF', 'READ')
  getTasks(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfTasks(user);
  }

  @Get('announcements')
  @RequirePermission('SELF', 'READ')
  getAnnouncements(@CurrentUser() user: RequestUser) {
    return this.hrmService.getSelfAnnouncements(user);
  }
}
