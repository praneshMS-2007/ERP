import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HrmModule } from './hrm/hrm.module';
import { CrmModule } from './crm/crm.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProjectsModule } from './projects/projects.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, HrmModule, CrmModule, InventoryModule, ProjectsModule, AnalyticsModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
