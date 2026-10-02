import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { RequestUser } from './hrm.service';
import { OnboardingImportService } from './onboarding-import.service';

/**
 * Bulk onboarding. HR:WRITE at the gate; the service narrows it again to
 * Super Admin / HR Manager, because these submissions carry Aadhaar and PAN
 * numbers and scans.
 */
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingImportService) {}

  @Get('config')
  @RequirePermission('HR', 'WRITE')
  config(@CurrentUser() user: RequestUser) {
    return this.onboarding.getConfig(user);
  }

  @Post('fetch')
  @RequirePermission('HR', 'WRITE')
  fetch(@CurrentUser() user: RequestUser) {
    return this.onboarding.fetchFromGoogle(user);
  }

  @Post('upload')
  @RequirePermission('HR', 'WRITE')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: RequestUser) {
    return this.onboarding.uploadFile(file, user);
  }

  @Get('submissions')
  @RequirePermission('HR', 'WRITE')
  list(@Query('status') status: string | undefined, @CurrentUser() user: RequestUser) {
    if (status && !['PENDING', 'IMPORTED', 'DISMISSED'].includes(status)) throw new BadRequestException('Unknown status.');
    return this.onboarding.list(status as any, user);
  }

  @Post('import')
  @RequirePermission('HR', 'WRITE')
  importMany(@Body('ids') ids: string[], @CurrentUser() user: RequestUser) {
    return this.onboarding.importMany(ids, user);
  }

  @Get('submissions/:id')
  @RequirePermission('HR', 'WRITE')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.onboarding.get(id, user);
  }

  @Put('submissions/:id')
  @RequirePermission('HR', 'WRITE')
  update(@Param('id') id: string, @Body() body: { payload?: Record<string, any>; hr?: Record<string, any> }, @CurrentUser() user: RequestUser) {
    return this.onboarding.update(id, body, user);
  }

  @Post('submissions/:id/dismiss')
  @RequirePermission('HR', 'WRITE')
  dismiss(@Param('id') id: string, @Body('reason') reason: string | undefined, @CurrentUser() user: RequestUser) {
    return this.onboarding.dismiss(id, reason, user);
  }

  @Get('submissions/:id/files/:field')
  @RequirePermission('HR', 'WRITE')
  async file(@Param('id') id: string, @Param('field') field: string, @CurrentUser() user: RequestUser, @Res() res: Response) {
    const { fullPath, mime, fileName } = await this.onboarding.resolveFile(id, field, user);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(fullPath);
  }
}
