import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService, AuditLogFilterDto } from './analytics.service';
import { RequirePermission, RequireRole } from '../auth/decorators';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ==========================================
  // SUPER ADMIN AUDIT TRAIL ENDPOINTS (STRICTLY LOCKED DOWN)
  // ==========================================

  @Get('audit-logs')
  @RequireRole('SUPER_ADMIN')
  getAuditLogs(@Query() query: AuditLogFilterDto) {
    return this.analyticsService.getAuditLogs(query);
  }

  @Get('managers')
  @RequireRole('SUPER_ADMIN')
  getManagers() {
    return this.analyticsService.getManagers();
  }

  @Get('departments')
  @RequireRole('SUPER_ADMIN')
  getDepartments() {
    return this.analyticsService.getDepartments();
  }

  @Get('stats')
  @RequireRole('SUPER_ADMIN')
  getAuditStats(@Query() query: AuditLogFilterDto) {
    return this.analyticsService.getAuditStats(query);
  }

  @Get('export')
  @RequireRole('SUPER_ADMIN')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-trail-export.csv"')
  async exportAuditLogs(@Query() query: AuditLogFilterDto, @Res() res: Response) {
    const csv = await this.analyticsService.exportAuditLogs(query);
    res.send(csv);
  }

  // ==========================================
  // GENERAL OPERATIONAL METRICS
  // ==========================================

  @Get('dashboard')
  @RequirePermission('ANALYTICS', 'READ')
  getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }

  @Get('revenue-trend')
  @RequirePermission('ANALYTICS', 'READ')
  getRevenueTrend() {
    return this.analyticsService.getRevenueTrend();
  }

  @Get('retention')
  @RequirePermission('ANALYTICS', 'READ')
  getRetention() {
    return this.analyticsService.getRetention();
  }
}
