import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Turns database errors into the response the caller actually needs. Without
 * this every not-found, duplicate or still-in-use condition surfaced as a raw
 * 500 "Internal server error" — indistinguishable from a real crash, and with
 * nothing the user could act on.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'That record no longer exists.';
          break;
        case 'P2002': {
          const target = (exception.meta?.target as string[] | string | undefined) ?? [];
          const fields = (Array.isArray(target) ? target : [target]).filter(Boolean).join(', ');
          status = HttpStatus.CONFLICT;
          message = fields ? `A record with this ${fields} already exists.` : 'A record with these details already exists.';
          break;
        }
        case 'P2003':
          status = HttpStatus.CONFLICT;
          message = 'This record is linked to other records, so the change was refused. Remove or reassign the linked records first.';
          break;
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'One of the values is too long.';
          break;
        case 'P2023':
          status = HttpStatus.BAD_REQUEST;
          message = 'One of the identifiers sent is not valid.';
          break;
      }
    } else {
      status = HttpStatus.BAD_REQUEST;
      message = 'Some of the details sent are missing or not valid.';
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url}: ${exception.message}`);
    } else {
      this.logger.warn(`${req.method} ${req.url} -> ${status}: ${exception.message.split('\n').pop()}`);
    }

    res.status(status).json({ statusCode: status, message, error: HttpStatus[status] ?? 'Error' });
  }
}
