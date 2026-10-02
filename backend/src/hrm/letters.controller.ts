import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LetterKind, LetterStatus } from '@prisma/client';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { RequestUser } from './hrm.service';
import { LetterOutboxService } from './letter-outbox.service';
import { OfferLetterService } from './offer-letter.service';
import { InternshipCertificateService } from './internship-certificate.service';
import { PayslipService } from './payslip.service';

const STATUSES = new Set(['DRAFT', 'SENT', 'FAILED', 'DISCARDED']);

/**
 * The letter outbox. The controller gate is the broad HR:READ so that Finance
 * (who releases payslips) can reach it; the service narrows every call to the
 * kinds of letter the caller's role may handle.
 */
@Controller('letters')
export class LettersController {
  constructor(
    private readonly outbox: LetterOutboxService,
    private readonly offerLetters: OfferLetterService,
    private readonly certificates: InternshipCertificateService,
    private readonly payslips: PayslipService,
  ) {}

  @Get()
  @RequirePermission('HR', 'READ')
  list(@Query('status') status: string | undefined, @CurrentUser() user: RequestUser) {
    if (status && !STATUSES.has(status)) throw new BadRequestException('Unknown status filter.');
    return this.outbox.list(status as LetterStatus | undefined, user);
  }

  @Get('counts')
  @RequirePermission('HR', 'READ')
  counts(@CurrentUser() user: RequestUser) {
    return this.outbox.counts(user);
  }

  @Get('settings')
  @RequirePermission('HR', 'READ')
  settings() {
    return this.outbox.getSettings();
  }

  @Put('settings/:kind')
  @RequirePermission('HR', 'WRITE')
  setPreview(@Param('kind') kind: string, @Body('preview') preview: boolean, @CurrentUser() user: RequestUser) {
    return this.outbox.setPreview(kind as LetterKind, preview === true, user);
  }

  @Post('send-batch')
  @RequirePermission('HR', 'READ')
  sendBatch(@Body('ids') ids: string[], @CurrentUser() user: RequestUser) {
    if (!Array.isArray(ids) || ids.length === 0) throw new BadRequestException('Choose at least one letter.');
    return this.outbox.sendMany(ids, user);
  }

  @Get(':id')
  @RequirePermission('HR', 'READ')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.outbox.get(id, user);
  }

  @Get(':id/pdf')
  @RequirePermission('HR', 'READ')
  async pdf(@Param('id') id: string, @CurrentUser() user: RequestUser, @Res() res: Response) {
    const { fullPath, fileName } = await this.outbox.resolvePdf(id, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.sendFile(fullPath);
  }

  @Put(':id')
  @RequirePermission('HR', 'READ')
  update(@Param('id') id: string, @Body() body: { toEmail?: string; subject?: string }, @CurrentUser() user: RequestUser) {
    return this.outbox.update(id, body, user);
  }

  @Post(':id/send')
  @RequirePermission('HR', 'READ')
  send(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.outbox.send(id, user);
  }

  @Post(':id/discard')
  @RequirePermission('HR', 'READ')
  discard(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.outbox.discard(id, user);
  }

  /**
   * Re-renders the letter from the record as it is now (after HR fixed a
   * name, date or amount) and replaces the old draft with the new one. The old
   * draft is only discarded once the new one exists, so a failure never loses
   * the letter.
   */
  @Post(':id/regenerate')
  @RequirePermission('HR', 'READ')
  async regenerate(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const letter = await this.outbox.get(id, user);
    if (letter.status === 'SENT' || letter.status === 'DISCARDED') {
      throw new BadRequestException('Only an unsent letter can be re-generated.');
    }

    let result: { documentId: string | null; letterId?: string; error?: string };
    if (letter.kind === 'OFFER_LETTER' && letter.employeeId) {
      result = await this.offerLetters.issueAndSend(letter.employeeId, { actor: user, forceDraft: true });
    } else if (letter.kind === 'COMPLETION_CERTIFICATE' && letter.employeeId) {
      result = await this.certificates.regenerate(letter.employeeId, user);
    } else if (letter.kind === 'PAYSLIP' && letter.payrollId) {
      result = await this.payslips.issueAndSend(letter.payrollId, { actor: user, forceDraft: true });
    } else {
      throw new BadRequestException('This letter cannot be re-generated.');
    }
    if (!result.letterId) throw new BadRequestException(result.error || 'The letter could not be re-generated.');

    await this.outbox.supersede(id);
    return { newLetterId: result.letterId };
  }
}
