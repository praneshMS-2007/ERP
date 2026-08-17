import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { HrmModule } from '../hrm/hrm.module';

@Module({
  imports: [HrmModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
