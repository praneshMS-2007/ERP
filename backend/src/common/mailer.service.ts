import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Thin wrapper around a single Gmail SMTP transport, used for sending offer
 * and confirmation letters (see hrm's OfferLetterService).
 *
 * Deliberately not used for login credentials — per team decision, passwords
 * are shown once in the UI and handed over manually, never emailed.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_APP_PASSWORD;
    if (!user || !pass) {
      this.logger.warn('SMTP_USER / SMTP_APP_PASSWORD not set — outbound email is disabled.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    return this.transporter;
  }

  get isConfigured(): boolean {
    return !!(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: { filename: string; path: string }[];
  }): Promise<{ sent: true } | { sent: false; error: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return { sent: false, error: 'Outbound email is not configured on this server.' };
    }

    try {
      await transporter.sendMail({
        from: `"Shuroq HR" <${process.env.SMTP_USER}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${params.to}: ${err.message}`);
      return { sent: false, error: err.message || 'Unknown mail error' };
    }
  }
}
