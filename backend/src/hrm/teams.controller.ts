import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, RequireRole } from '../auth/decorators';
import { TeamsService } from './teams.service';
import type { MembershipInput } from './teams.service';
import type { RequestUser } from './hrm.service';

/**
 * Teams and monthly team revenue. Viewing and entering revenue: HR, Finance,
 * admin. Creating teams and changing members: HR and admin (checked again in
 * the service).
 */
@Controller('hrm/teams')
@RequireRole('SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.teams.list(user);
  }

  @Post()
  create(@Body() body: { name?: string; description?: string }, @CurrentUser() user: RequestUser) {
    return this.teams.create(body, user);
  }

  @Get('revenue')
  getRevenue(@Query('period') period: string, @CurrentUser() user: RequestUser) {
    return this.teams.getRevenue(period, user);
  }

  @Put('revenue')
  setRevenue(@Body() body: { period: string; entries: { teamId: string; amount: number | string | null; note?: string }[] }, @CurrentUser() user: RequestUser) {
    return this.teams.setRevenue(body?.period, body?.entries ?? [], user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; isActive?: boolean }, @CurrentUser() user: RequestUser) {
    return this.teams.update(id, body, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.teams.remove(id, user);
  }

  @Put(':id/members')
  setMembers(@Param('id') id: string, @Body('members') members: MembershipInput[], @CurrentUser() user: RequestUser) {
    return this.teams.setTeamMembers(id, members ?? [], user);
  }
}
