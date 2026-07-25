import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  getProjects(@Query('status') status?: string) {
    return this.projectsService.getProjects(status);
  }

  @Get(':id')
  getProjectById(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  createProject(@Body() data: Prisma.ProjectUncheckedCreateInput) {
    return this.projectsService.createProject(data);
  }

  @Put(':id')
  updateProject(@Param('id') id: string, @Body() data: Prisma.ProjectUncheckedUpdateInput) {
    return this.projectsService.updateProject(id, data);
  }

  @Delete(':id')
  deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }

  @Get('tasks')
  getTasks(@Query('projectId') projectId?: string) {
    return this.projectsService.getTasks(projectId);
  }

  @Post('tasks')
  createTask(@Body() data: Prisma.TaskUncheckedCreateInput) {
    return this.projectsService.createTask(data);
  }

  @Put('tasks/:id/status')
  updateTaskStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.projectsService.updateTaskStatus(id, status);
  }

  @Get(':id/milestones')
  getMilestones(@Param('id') projectId: string) {
    return this.projectsService.getMilestones(projectId);
  }

  @Post('milestones')
  createMilestone(@Body() data: Prisma.MilestoneUncheckedCreateInput) {
    return this.projectsService.createMilestone(data);
  }
}
