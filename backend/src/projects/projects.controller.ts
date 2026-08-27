import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/permission.util';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission('PROJECTS', 'READ')
  getProjects(@Query('status') status: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjects(status, user);
  }

  @Get('tasks')
  @RequirePermission('PROJECTS', 'READ')
  getTasks(@Query('projectId') projectId?: string) {
    return this.projectsService.getTasks(projectId);
  }

  // Gate loosened to READ — the real check (project manager, or HR/Admin)
  // lives in the service, the same shape as the SELF module, since a
  // project-scoped manager may hold no PROJECTS:WRITE at all.
  @Post('tasks')
  @RequirePermission('PROJECTS', 'READ')
  createTask(@Body() data: Prisma.TaskUncheckedCreateInput, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createTask(data, user);
  }

  @Put('tasks/:id')
  @RequirePermission('PROJECTS', 'READ')
  updateTask(
    @Param('id') id: string,
    @Body() data: { title?: string; description?: string; assignedEmployeeId?: string | null; dueDate?: string; priority?: any },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateTask(id, data, user);
  }

  @Put('tasks/:id/status')
  @RequirePermission('PROJECTS', 'READ')
  updateTaskStatus(@Param('id') id: string, @Body('status') status: any, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateTaskStatus(id, status, user);
  }

  @Delete('tasks/:id')
  @RequirePermission('PROJECTS', 'READ')
  deleteTask(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteTask(id, user);
  }

  // ========== DYNAMIC / :ID ROUTES ==========
  @Get(':id')
  @RequirePermission('PROJECTS', 'READ')
  getProjectById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjectById(id, user);
  }

  // Gate loosened to READ — creation itself is HR/Admin-only, enforced
  // inside the service (canStaffProjects), not by the module permission.
  @Post()
  @RequirePermission('PROJECTS', 'READ')
  createProject(
    @Body()
    data: {
      name: string;
      description?: string;
      status: any;
      priority: any;
      startDate?: string;
      endDate?: string;
      projectManagerId: string;
      teamEmployeeIds?: string[];
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.createProject(data, user);
  }

  @Put(':id')
  @RequirePermission('PROJECTS', 'READ')
  updateProject(@Param('id') id: string, @Body() data: Prisma.ProjectUncheckedUpdateInput, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateProject(id, data, user);
  }

  @Delete(':id')
  @RequirePermission('PROJECTS', 'READ')
  deleteProject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteProject(id, user);
  }

  // ========== STAFFING (HR/Admin only, enforced in the service) ==========
  @Put(':id/staffing')
  @RequirePermission('PROJECTS', 'READ')
  updateProjectStaffing(
    @Param('id') id: string,
    @Body() body: { projectManagerId?: string; teamEmployeeIds?: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateProjectStaffing(id, body, user);
  }

  @Get(':id/staff')
  @RequirePermission('PROJECTS', 'READ')
  getProjectStaff(@Param('id') id: string) {
    return this.projectsService.getProjectStaff(id);
  }

  // Relabels an existing team member's role on this project (e.g.
  // "Frontend"). PM (or HR/Admin) only — never adds/removes anyone, that's
  // updateProjectStaffing above, HR/Admin-exclusive.
  @Put(':id/staff/:employeeId/role')
  @RequirePermission('PROJECTS', 'READ')
  updateMemberRole(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Body('role') role: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateMemberRole(id, employeeId, role, user);
  }

  // ========== OVERVIEW (brief: project manager or HR/Admin; dates: HR/Admin only) ==========
  @Put(':id/overview')
  @RequirePermission('PROJECTS', 'READ')
  updateProjectOverview(
    @Param('id') id: string,
    @Body() data: { description?: string; startDate?: string | null; endDate?: string | null },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateProjectOverview(id, data, user);
  }

  // Manual status override — HR/Admin only, ON_HOLD or RESUME. Every other
  // status is computed automatically from the project's dates.
  @Put(':id/status')
  @RequirePermission('PROJECTS', 'READ')
  updateProjectStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateProjectStatus(id, status, user);
  }

  // ========== DOCUMENTS (readable by anyone staffed; write is manager/HR/Admin) ==========
  @Post(':id/documents')
  @RequirePermission('PROJECTS', 'READ')
  uploadDocument(
    @Param('id') id: string,
    @Body() body: { kind: string; fileUrl: string; fileName: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.uploadDocument(id, body, user);
  }

  @Get(':id/documents')
  @RequirePermission('PROJECTS', 'READ')
  getDocuments(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getDocuments(id, user);
  }

  @Delete(':id/documents/:documentId')
  @RequirePermission('PROJECTS', 'READ')
  deleteDocument(@Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteDocument(documentId, user);
  }

  // ========== ANNOUNCEMENTS (readable by anyone staffed; write is manager/HR/Admin) ==========
  @Post(':id/announcements')
  @RequirePermission('PROJECTS', 'READ')
  createAnnouncement(
    @Param('id') id: string,
    @Body() body: { title: string; body: string; fileUrl?: string; fileName?: string; audienceEmployeeId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.createAnnouncement(id, body, user);
  }

  @Get(':id/announcements')
  @RequirePermission('PROJECTS', 'READ')
  getAnnouncements(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getAnnouncements(id, user);
  }

  @Delete(':id/announcements/:announcementId')
  @RequirePermission('PROJECTS', 'READ')
  deleteAnnouncement(@Param('announcementId') announcementId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteAnnouncement(announcementId, user);
  }

  // ========== TIMESHEET (a member's own; HR/Admin/PM view-only) ==========
  @Get(':id/timesheet/me')
  @RequirePermission('PROJECTS', 'READ')
  getMyTimesheet(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getMyTimesheet(id, user);
  }

  @Put(':id/timesheet/me')
  @RequirePermission('PROJECTS', 'READ')
  upsertMyTimesheet(@Param('id') id: string, @Body() body: { hours: number; description?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.upsertMyTimesheet(id, body, user);
  }

  @Get(':id/timesheet/:employeeId')
  @RequirePermission('PROJECTS', 'READ')
  getMemberTimesheet(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @Query('date') date: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getMemberTimesheetForDate(id, employeeId, date, user);
  }

  // ========== HOLIDAYS (project-scoped; manager/HR/Admin only to write) ==========
  @Post(':id/holidays')
  @RequirePermission('PROJECTS', 'READ')
  createHoliday(@Param('id') id: string, @Body() body: { date: string; title: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createHoliday(id, body, user);
  }

  @Get(':id/holidays')
  @RequirePermission('PROJECTS', 'READ')
  getHolidays(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getHolidays(id, user);
  }

  @Delete(':id/holidays/:holidayId')
  @RequirePermission('PROJECTS', 'READ')
  deleteHoliday(@Param('holidayId') holidayId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteHoliday(holidayId, user);
  }

  @Get(':id/milestones')
  @RequirePermission('PROJECTS', 'READ')
  getMilestones(@Param('id') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getMilestones(projectId, user);
  }

  @Post('milestones')
  @RequirePermission('PROJECTS', 'READ')
  createMilestone(@Body() data: Prisma.MilestoneUncheckedCreateInput, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createMilestone(data, user);
  }

  @Put('milestones/:id/status')
  @RequirePermission('PROJECTS', 'READ')
  updateMilestoneStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateMilestoneStatus(id, status, user);
  }

  @Delete('milestones/:id')
  @RequirePermission('PROJECTS', 'READ')
  deleteMilestone(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.deleteMilestone(id, user);
  }
}
