import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { OfferLetterService } from './offer-letter.service';
import { PayslipService } from './payslip.service';
import { InternshipCertificateService } from './internship-certificate.service';
import { MailerService } from '../common/mailer.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { SelfController } from './self.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AnnouncementsModule, AuditModule],
  controllers: [HrmController, EmployeeDocumentsController, SelfController],
  providers: [HrmService, OfferLetterService, PayslipService, InternshipCertificateService, MailerService, EmployeeDocumentsService],
  exports: [HrmService],
})
export class HrmModule {}
