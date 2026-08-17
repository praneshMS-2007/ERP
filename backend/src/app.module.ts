import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HrmModule } from './hrm/hrm.module';
import { CrmModule } from './crm/crm.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProjectsModule } from './projects/projects.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { FinanceModule } from './finance/finance.module';
import { ExportModule } from './export/export.module';
import { NotificationModule } from './notification/notification.module';
import { SearchModule } from './search/search.module';
import { UploadModule } from './upload/upload.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HrmModule,
    CrmModule,
    InventoryModule,
    ProjectsModule,
    AnalyticsModule,
    AiModule,
    FinanceModule,
    ExportModule,
    NotificationModule,
    SearchModule,
    UploadModule,
    AuditModule,
    AnnouncementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard — ALL routes require authentication unless @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Roles guard — checks @RequirePermission() on protected routes
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global audit trail — every successful authenticated mutation gets a
    // row, app-wide, without each controller having to remember to add one.
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
