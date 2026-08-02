import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';
import { RequirePermission } from '../auth/decorators';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermission('PROJECTS', 'READ')
  getProjects(@Query('status') status?: string) {
    return this.projectsService.getProjects(status);
  }

  @Get('tasks')
  @RequirePermission('PROJECTS', 'READ')
  getTasks(@Query('projectId') projectId?: string) {
    return this.projectsService.getTasks(projectId);
  }

  @Post('tasks')
  @RequirePermission('PROJECTS', 'WRITE')
  createTask(@Body() data: Prisma.TaskUncheckedCreateInput) {
    return this.projectsService.createTask(data);
  }

  @Put('tasks/:id/status')
  @RequirePermission('PROJECTS', 'WRITE')
  updateTaskStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.projectsService.updateTaskStatus(id, status);
  }

  // ========== TIMESHEETS (TimeLog) ==========
  @Get('timesheets')
  @RequirePermission('PROJECTS', 'READ')
  getTimeLogs(@Query('projectId') projectId?: string) {
    return this.projectsService.getTimeLogs(projectId);
  }

  @Post('timesheets')
  @RequirePermission('PROJECTS', 'WRITE')
  createTimeLog(@Body() data: Prisma.TimeLogUncheckedCreateInput) {
    return this.projectsService.createTimeLog(data);
  }

  // ========== DYNAMIC / :ID ROUTES ==========
  @Get(':id')
  @RequirePermission('PROJECTS', 'READ')
  getProjectById(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  @RequirePermission('PROJECTS', 'WRITE')
  createProject(@Body() data: Prisma.ProjectUncheckedCreateInput) {
    return this.projectsService.createProject(data);
  }

  @Put(':id')
  @RequirePermission('PROJECTS', 'WRITE')
  updateProject(@Param('id') id: string, @Body() data: Prisma.ProjectUncheckedUpdateInput) {
    return this.projectsService.updateProject(id, data);
  }

  @Delete(':id')
  @RequirePermission('PROJECTS', 'DELETE')
  deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }

  @Get(':id/milestones')
  @RequirePermission('PROJECTS', 'READ')
  getMilestones(@Param('id') projectId: string) {
    return this.projectsService.getMilestones(projectId);
  }

  @Post('milestones')
  @RequirePermission('PROJECTS', 'WRITE')
  createMilestone(@Body() data: Prisma.MilestoneUncheckedCreateInput) {
    return this.projectsService.createMilestone(data);
  }
}
