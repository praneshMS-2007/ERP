import { Module } from '@nestjs/common';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { OfferLetterService } from './offer-letter.service';
import { MailerService } from '../common/mailer.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  controllers: [HrmController, EmployeeDocumentsController],
  providers: [HrmService, OfferLetterService, MailerService, EmployeeDocumentsService]
})
export class HrmModule {}
