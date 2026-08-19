import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { OfferLetterService } from './offer-letter.service';
import { PayslipService } from './payslip.service';
import { MailerService } from '../common/mailer.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { SelfController } from './self.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [AnnouncementsModule],
  controllers: [HrmController, EmployeeDocumentsController, SelfController],
  providers: [HrmService, OfferLetterService, PayslipService, MailerService, EmployeeDocumentsService],
  exports: [HrmService],
})
export class HrmModule {}
