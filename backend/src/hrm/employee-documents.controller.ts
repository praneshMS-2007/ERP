import { Controller, Get, Post, Delete, Param, Body, UploadedFile, UseInterceptors, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { EmployeeDocumentsService } from './employee-documents.service';
import { RequirePermission, CurrentUser } from '../auth/decorators';
import type { RequestUser } from './hrm.service';

@Controller('hrm/employees/:employeeId/documents')
export class EmployeeDocumentsController {
  constructor(private readonly docs: EmployeeDocumentsService) {}

  // memoryStorage, not diskStorage: the file is validated (type, size) inside
  // the service BEFORE anything touches disk, rather than writing first and
  // checking after.
  @Post()
  @RequirePermission('HR', 'WRITE')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Param('employeeId') employeeId: string,
    @Body('kind') kind: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (!kind) throw new BadRequestException('A document type is required.');
    return this.docs.upload(employeeId, kind, file, user);
  }

  @Get()
  @RequirePermission('HR', 'READ')
  list(@Param('employeeId') employeeId: string, @CurrentUser() user: RequestUser) {
    return this.docs.list(employeeId, user);
  }

  @Get(':documentId/download')
  @RequirePermission('HR', 'READ')
  async download(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const { fullPath, fileName } = await this.docs.resolveForDownload(employeeId, documentId, user);
    res.download(fullPath, fileName);
  }

  @Delete(':documentId')
  @RequirePermission('HR', 'WRITE')
  remove(
    @Param('employeeId') employeeId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.docs.remove(employeeId, documentId, user);
  }
}
