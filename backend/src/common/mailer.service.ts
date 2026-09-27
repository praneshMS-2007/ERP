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
      pool: true,
      maxConnections: 1,
      maxMessages: 20,
      rateDelta: 1000,
      rateLimit: 5,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
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
    attachments?: { filename: string; path: string; cid?: string }[];
  }): Promise<{ sent: true } | { sent: false; error: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return { sent: false, error: 'Outbound email is not configured on this server.' };
    }

    const maxAttempts = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await transporter.sendMail({
          from: `"Shuroq HR" <${process.env.SMTP_USER}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          attachments: params.attachments,
        });
        this.logger.log(
          `Email successfully dispatched to ${params.to} | Subject: "${params.subject}" | Message-ID: ${info.messageId}`,
        );
        return { sent: true };
      } catch (err: any) {
        lastError = err.message || 'Unknown mail error';
        this.logger.warn(`Mail send attempt ${attempt}/${maxAttempts} to ${params.to} failed: ${lastError}`);

        // If it's a transient error (421 rate limit, timeout, connection reset) and we have attempts left, wait and retry
        const isTransient = /421|450|451|452|ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|temporary/i.test(lastError);
        if (attempt < maxAttempts && isTransient) {
          const delayMs = attempt * 2000;
          this.logger.log(`Retrying email to ${params.to} in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else if (!isTransient) {
          // Hard error (e.g. invalid recipient syntax, auth failure) — stop immediately
          break;
        }
      }
    }

    this.logger.error(`Failed to send email to ${params.to} after ${maxAttempts} attempts: ${lastError}`);
    return { sent: false, error: lastError };
  }
}
