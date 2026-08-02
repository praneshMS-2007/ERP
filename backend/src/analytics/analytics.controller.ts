import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RequirePermission } from '../auth/decorators';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
}
