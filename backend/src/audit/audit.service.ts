import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  module: string;
  entityId?: string | null;
  ipAddress?: string | null;
  details?: string | null;
}

/**
 * The single write path for AuditLog. Before this existed, every mutation
 * this project ever built — employee edits, payroll, leave approvals,
 * document uploads, agreement sign-offs, logins — left no trail at all;
 * the only rows in the table were two hand-seeded demo entries. Never
 * throws: a failed audit write must not take down the request that
 * triggered it, so failures are logged and swallowed, not propagated.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          module: entry.module,
          entityId: entry.entityId ?? null,
          ipAddress: entry.ipAddress ?? null,
          details: entry.details ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log entry: ${err}`);
    }
  }
}
