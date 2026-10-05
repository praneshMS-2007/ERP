import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { OfferLetterService } from './offer-letter.service';
import { PayslipService } from './payslip.service';
import { InternshipCertificateService } from './internship-certificate.service';
import { EmployeeHistoryService } from './employee-history.service';
import { InternConversionService } from './intern-conversion.service';
import { LetterOutboxService } from './letter-outbox.service';
import { EmployeeEraseService } from './employee-erase.service';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { LettersController } from './letters.controller';
import { GoogleSheetsService } from './google-sheets.service';
import { OnboardingImportService } from './onboarding-import.service';
import { OnboardingController } from './onboarding.controller';
import { MailerService } from '../common/mailer.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { SelfController } from './self.controller';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AnnouncementsModule, AuditModule],
  controllers: [HrmController, EmployeeDocumentsController, SelfController, LettersController, OnboardingController, TeamsController],
  providers: [HrmService, OfferLetterService, PayslipService, InternshipCertificateService, MailerService, EmployeeDocumentsService, EmployeeHistoryService, InternConversionService, LetterOutboxService, GoogleSheetsService, OnboardingImportService, EmployeeEraseService, TeamsService],
  exports: [HrmService],
})
export class HrmModule {}
