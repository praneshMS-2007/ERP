import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './hrm.service';

/** Same narrow gate as PAN/Aadhaar — these files carry the same PII. */
const DOC_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const ONBOARDING_DOCUMENT_KINDS = new Set([
  'AADHAAR_CARD', 'PAN_CARD', 'PASSPORT', 'DRIVING_LICENCE', 'ADDRESS_PROOF',
  'PROFILE_PHOTO', 'CANCELLED_CHEQUE', 'EDUCATION_CERTIFICATE', 'EXPERIENCE_LETTER',
  'RELIEVING_LETTER', 'PREVIOUS_PAYSLIP', 'NDA_SIGNED', 'POLICY_ACKNOWLEDGEMENT', 'OTHER',
]);

/**
 * Onboarding identity documents (Aadhaar scan, PAN card, cancelled cheque,
 * certificates, previous employment letters). Stored under
 * backend/private-uploads/, which is NOT mounted by the static file server
 * in main.ts — unlike offer letters, an Aadhaar scan's confidentiality
 * cannot rely on an unguessable filename. Every read goes through this
 * service's role check.
 *
 * Linked via Document.employeeId directly, not through the employee's User
 * account — several employees (including all but one of the original
 * seeded records) have no ERP login at all, and a document tied to "who can
 * log in" would silently vanish for them. An employee has an Aadhaar card
 * whether or not they have ERP credentials.
 */
@Injectable()
export class EmployeeDocumentsService {
  private readonly baseDir = path.join(process.cwd(), 'private-uploads', 'employee-documents');

  constructor(private prisma: PrismaService) {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  private assertAccess(viewer?: RequestUser) {
    if (!viewer || !DOC_ACCESS_ROLES.has(viewer.role)) {
      throw new ForbiddenException('Only HR and administrators can access identity documents.');
    }
  }

  private async assertEmployeeExists(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundException('Employee not found');
  }

  async upload(
    employeeId: string,
    kind: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    viewer?: RequestUser,
  ) {
    this.assertAccess(viewer);

    if (!ONBOARDING_DOCUMENT_KINDS.has(kind)) {
      throw new BadRequestException(`"${kind}" is not a recognised document type.`);
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG and PNG files are accepted.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File is larger than the 10MB limit.');
    }
    await this.assertEmployeeExists(employeeId);

    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const diskName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(this.baseDir, diskName), file.buffer);
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    return this.prisma.document.create({
      data: {
        kind: kind as any,
        employeeId,
        storagePath: diskName, // relative to baseDir — deliberately not a public URL
        fileName: file.originalname,
        sha256,
      },
    });
  }

  async list(employeeId: string, viewer?: RequestUser) {
    this.assertAccess(viewer);
    await this.assertEmployeeExists(employeeId);

    return this.prisma.document.findMany({
      where: { employeeId, kind: { in: Array.from(ONBOARDING_DOCUMENT_KINDS) as any } },
      orderBy: { issuedAt: 'desc' },
      select: { id: true, kind: true, fileName: true, issuedAt: true, sha256: true },
    });
  }

  /** Returns the absolute path and metadata; the controller streams it. */
  async resolveForDownload(employeeId: string, documentId: string, viewer?: RequestUser) {
    this.assertAccess(viewer);

    const doc = await this.prisma.document.findFirst({ where: { id: documentId, employeeId } });
    if (!doc) throw new NotFoundException('Document not found');

    const fullPath = path.join(this.baseDir, doc.storagePath);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('The stored file is missing on disk.');

    return { fullPath, fileName: doc.fileName };
  }

  async remove(employeeId: string, documentId: string, viewer?: RequestUser) {
    this.assertAccess(viewer);

    const doc = await this.prisma.document.findFirst({ where: { id: documentId, employeeId } });
    if (!doc) throw new NotFoundException('Document not found');

    const fullPath = path.join(this.baseDir, doc.storagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await this.prisma.document.delete({ where: { id: doc.id } });
    return { message: 'Document removed.' };
  }
}
