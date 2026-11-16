import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { coverNoteHtml, escapeHtml } from '../common/email-template';
import { formatDateDMY } from '../common/date-format';
import { BRAND_ASSETS_DIR, FONT_ASSETS_DIR } from '../common/brand-assets';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from './hrm.service';
import { EmployeeHistoryService, EMP_TYPE_LABEL } from './employee-history.service';
import { LetterOutboxService } from './letter-outbox.service';

const COMPANY = {
  name: 'Shuroq',
  legalName: 'Shuroq Technologies',
  address: 'Hyderabad, Telangana, India',
  email: 'hr-team@shuroq.com',
  website: 'www.shuroq.com',
};

const BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  white: '#ffffff',
  black: '#000000',
  grey: '#434343',
};

const ASSETS_DIR = BRAND_ASSETS_DIR;
const FONTS_DIR = FONT_ASSETS_DIR;

const EXPERIENCE_ASSETS = {
  logo: path.join(ASSETS_DIR, 'experience-logo.png'),
  signature: path.join(ASSETS_DIR, 'experience-signature.png'),
  seal: path.join(ASSETS_DIR, 'experience-seal.png'),
  msme: path.join(ASSETS_DIR, 'experience-msme.png'),
  watermark: path.join(ASSETS_DIR, 'experience-watermark.png'),
  topRibbon: path.join(ASSETS_DIR, 'experience-top-ribbon.png'),
  bottomRibbon: path.join(ASSETS_DIR, 'experience-bottom-ribbon.png'),
  fallbackLogo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
  fallbackSig: path.join(ASSETS_DIR, 'authorized-signature-clean.png'),
  fallbackSeal: path.join(ASSETS_DIR, 'company-seal-clean.png'),
  fallbackMsme: path.join(ASSETS_DIR, 'msme-logo-clean.png'),
};

const EXPERIENCE_FONTS = {
  montserratMedium: path.join(FONTS_DIR, 'montserrat-medium.ttf'),
  montserratBold: path.join(FONTS_DIR, 'montserrat-bold.ttf'),
  cormorantGaramondBold: path.join(FONTS_DIR, 'cormorant-garamond-bold.ttf'),
  glacialIndifferenceBold: path.join(FONTS_DIR, 'glacial-indifference-bold.ttf'),
};

interface CertMark { w: number; h: number; layers: { color: string; d: string }[] }
let certMarks: Record<string, CertMark> | null | undefined;
function loadCertMarks(): Record<string, CertMark> | null {
  if (certMarks !== undefined) return certMarks;
  try {
    certMarks = JSON.parse(fs.readFileSync(path.join(BRAND_ASSETS_DIR, 'certificate-marks.json'), 'utf8')).marks;
  } catch (e: any) {
    new Logger('ExperienceLetter').warn(`certificate-marks.json could not be read (${e.message}); falling back to raster images`);
    certMarks = null;
  }
  return certMarks ?? null;
}

interface ExperienceLetterData {
  candidateName: string;
  designation: string;
  department: string;
  empType: string;
  joinDate: Date;
  issueDate: Date;
  customContent?: string | null;
  contributions: {
    projectName: string;
    role: string | null;
    description: string | null;
    technologies: string | null;
    startDate: Date | null;
    endDate: Date | null;
  }[];
}

@Injectable()
export class ExperienceLetterService {
  private readonly logger = new Logger(ExperienceLetterService.name);
  private readonly outDir = path.join(process.cwd(), 'private-uploads', 'experience-letters');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private history: EmployeeHistoryService,
    private outbox: LetterOutboxService,
  ) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  // ====================================================================
  // LIST — Active employees eligible for experience letters
  // ====================================================================

  async getEligibleEmployees() {
    const employees = await this.prisma.employee.findMany({
      where: {
        empType: { not: 'INTERN' },
        status: { in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] },
      },
      include: {
        department: true,
        designation: true,
        experienceLetterDocument: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return employees.map((emp) => ({
      id: emp.id,
      empCode: emp.empCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designation?.title ?? '',
      department: emp.department?.name ?? '',
      empType: emp.empType,
      empTypeLabel: EMP_TYPE_LABEL[emp.empType] ?? emp.empType,
      joinDate: emp.joinDate,
      status: emp.status,
      personalEmail: emp.personalEmail,
      avatarUrl: emp.avatarUrl,
      letterStatus: emp.experienceLetterStatus ?? null,
      letterIssuedAt: emp.experienceLetterIssuedAt,
      letterDocumentId: emp.experienceLetterDocumentId,
    }));
  }

  // ====================================================================
  // DETAIL — Full employee detail with auto-fetched + manual contributions
  // ====================================================================

  async getEmployeeDetail(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        user: true,
        experienceContributions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Auto-fetch project assignments from the projects system
    const assignments = await this.prisma.assignment.findMany({
      where: { employeeId, projectId: { not: null } },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    // Also fetch projects where this employee is the project manager
    const managedProjects = await this.prisma.project.findMany({
      where: { projectManagerId: employeeId },
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
      orderBy: { startDate: 'asc' },
    });

    // Merge and deduplicate
    const projectMap = new Map<string, any>();
    for (const a of assignments) {
      if (a.project) {
        projectMap.set(a.project.id, {
          projectId: a.project.id,
          projectName: a.project.name,
          role: a.role ?? 'Team Member',
          status: a.project.status,
          startDate: a.project.startDate,
          endDate: a.project.endDate,
          isManager: false,
        });
      }
    }
    for (const p of managedProjects) {
      if (projectMap.has(p.id)) {
        projectMap.get(p.id)!.role = 'Project Manager';
        projectMap.get(p.id)!.isManager = true;
      } else {
        projectMap.set(p.id, {
          projectId: p.id,
          projectName: p.name,
          role: 'Project Manager',
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          isManager: true,
        });
      }
    }

    // Get tasks assigned to this employee across all projects
    const tasks = await this.prisma.task.findMany({
      where: { assignedEmployeeId: employeeId },
      select: {
        id: true,
        title: true,
        status: true,
        projectId: true,
      },
    });
    const tasksByProject: Record<string, { total: number; done: number; titles: string[] }> = {};
    for (const t of tasks) {
      if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = { total: 0, done: 0, titles: [] };
      tasksByProject[t.projectId].total++;
      if (t.status === 'DONE') tasksByProject[t.projectId].done++;
      tasksByProject[t.projectId].titles.push(t.title);
    }

    const autoProjects = Array.from(projectMap.values()).map((p) => ({
      ...p,
      tasks: tasksByProject[p.projectId] ?? { total: 0, done: 0, titles: [] },
    }));

    return {
      id: employee.id,
      empCode: employee.empCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation?.title ?? '',
      department: employee.department?.name ?? '',
      empType: employee.empType,
      empTypeLabel: EMP_TYPE_LABEL[employee.empType] ?? employee.empType,
      joinDate: employee.joinDate,
      personalEmail: employee.personalEmail,
      avatarUrl: employee.avatarUrl,
      status: employee.status,
      letterStatus: employee.experienceLetterStatus ?? null,
      letterIssuedAt: employee.experienceLetterIssuedAt,
      letterDocumentId: employee.experienceLetterDocumentId,
      customContent: employee.experienceLetterContent ?? null,
      autoProjects,
      contributions: employee.experienceContributions.map((c) => ({
        id: c.id,
        projectName: c.projectName,
        role: c.role,
        description: c.description,
        technologies: c.technologies,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
    };
  }

  // ====================================================================
  // SAVE CUSTOM LETTER CONTENT
  // ====================================================================

  async saveCustomContent(employeeId: string, content: string | null) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { experienceLetterContent: content ? content.trim() : null },
    });

    return { success: true, customContent: content ? content.trim() : null };
  }

  // ====================================================================
  // CONTRIBUTIONS CRUD
  // ====================================================================

  async addContribution(employeeId: string, data: {
    projectName: string;
    role?: string;
    description?: string;
    technologies?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.experienceContribution.create({
      data: {
        employeeId,
        projectName: data.projectName,
        role: data.role || null,
        description: data.description || null,
        technologies: data.technologies || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  async updateContribution(id: string, data: {
    projectName?: string;
    role?: string;
    description?: string;
    technologies?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const existing = await this.prisma.experienceContribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contribution not found');

    return this.prisma.experienceContribution.update({
      where: { id },
      data: {
        ...(data.projectName !== undefined && { projectName: data.projectName }),
        ...(data.role !== undefined && { role: data.role || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.technologies !== undefined && { technologies: data.technologies || null }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      },
    });
  }

  async deleteContribution(id: string) {
    const existing = await this.prisma.experienceContribution.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contribution not found');
    await this.prisma.experienceContribution.delete({ where: { id } });
    return { success: true };
  }

  // ====================================================================
  // AUTO-FETCH FROM PROJECTS
  // ====================================================================

  async autoFetchContributions(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.experienceContribution.findMany({
      where: { employeeId },
      select: { projectName: true },
    });
    const existingNames = new Set(existing.map((c) => c.projectName.toLowerCase()));

    const assignments = await this.prisma.assignment.findMany({
      where: { employeeId, projectId: { not: null } },
      include: {
        project: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });

    const managed = await this.prisma.project.findMany({
      where: { projectManagerId: employeeId },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    const projectMap = new Map<string, { name: string; role: string; start: Date | null; end: Date | null }>();
    for (const a of assignments) {
      if (a.project && !existingNames.has(a.project.name.toLowerCase())) {
        projectMap.set(a.project.id, {
          name: a.project.name,
          role: a.role ?? 'Team Member',
          start: a.project.startDate,
          end: a.project.endDate,
        });
      }
    }
    for (const p of managed) {
      if (!existingNames.has(p.name.toLowerCase())) {
        if (projectMap.has(p.id)) {
          projectMap.get(p.id)!.role = 'Project Manager';
        } else {
          projectMap.set(p.id, { name: p.name, role: 'Project Manager', start: p.startDate, end: p.endDate });
        }
      }
    }

    const created: any[] = [];
    for (const [, proj] of projectMap) {
      const contrib = await this.prisma.experienceContribution.create({
        data: {
          employeeId,
          projectName: proj.name,
          role: proj.role,
          startDate: proj.start,
          endDate: proj.end,
        },
      });
      created.push(contrib);
    }

    return { imported: created.length, contributions: created };
  }

  // ====================================================================
  // GENERATE — Render PDF Experience Certificate
  // ====================================================================

  async generate(employeeId: string, actor?: RequestUser, customContent?: string): Promise<{
    documentId: string | null;
    fileUrl: string | null;
    emailed: boolean;
    pending?: boolean;
    letterId?: string;
    error?: string;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        user: true,
        experienceContributions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.empType === 'INTERN') throw new BadRequestException('Experience letters are not issued to interns. Use Internship Certificates instead.');

    let effectiveContent = employee.experienceLetterContent;
    if (customContent !== undefined) {
      effectiveContent = customContent ? customContent.trim() : null;
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { experienceLetterContent: effectiveContent },
      });
    }

    const contributions = employee.experienceContributions.map((c) => ({
      projectName: c.projectName,
      role: c.role,
      description: c.description,
      technologies: c.technologies,
      startDate: c.startDate,
      endDate: c.endDate,
    }));

    const data: ExperienceLetterData = {
      candidateName: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation?.title ?? '',
      department: employee.department?.name ?? '',
      empType: EMP_TYPE_LABEL[employee.empType] ?? employee.empType,
      joinDate: employee.joinDate,
      issueDate: new Date(),
      customContent: effectiveContent,
      contributions,
    };

    // Generate the PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.renderExperienceLetter(data);
    } catch (err: any) {
      this.logger.error(`PDF generation failed for ${employeeId}: ${err.message}`);
      return { documentId: null, fileUrl: null, emailed: false, error: `Could not generate the experience letter: ${err.message}` };
    }

    // Save to disk
    const safeName = data.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${safeName}-experience-letter-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const fullPath = path.join(this.outDir, fileName);
    fs.writeFileSync(fullPath, pdfBuffer);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const previousDocId = employee.experienceLetterDocumentId;

    const document = await this.prisma.document.create({
      data: {
        kind: 'EXPERIENCE_LETTER',
        ownerUserId: employee.userId,
        storagePath: `experience-letters/${fileName}`,
        fileName,
        sha256,
        ...(previousDocId ? { supersedesId: previousDocId } : {}),
      },
    });

    const fileUrl = `/api/hrm/documents/${document.id}/download`;

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        experienceLetterDocumentId: document.id,
        experienceLetterStatus: 'ISSUED',
        experienceLetterIssuedAt: new Date(),
      },
    });

    await this.audit.log({
      userId: actor?.id,
      role: actor?.role,
      action: 'ISSUE_EXPERIENCE_LETTER',
      actionType: 'UPDATE',
      module: 'HR',
      entityType: 'Employee',
      entityId: employeeId,
      targetLabel: data.candidateName,
      description: `${previousDocId ? 'Re-generated' : 'Issued'} Experience Letter for ${data.candidateName} (${data.designation})`,
      details: { employeeId, name: data.candidateName, documentId: document.id, fileUrl },
    });

    await this.history.record({
      employeeId,
      type: 'EXPERIENCE_LETTER_ISSUED',
      title: `Experience letter ${previousDocId ? 're-generated' : 'issued'}`,
      documentId: document.id,
      actor,
    });

    let emailed = false;
    let pending: boolean | undefined;
    let letterId: string | undefined;
    let error: string | undefined;

    if (employee.personalEmail) {
      const contact = await this.getSupportContactLine();
      const queued = await this.outbox.queue({
        kind: 'EXPERIENCE_LETTER',
        employeeId,
        documentId: document.id,
        to: employee.personalEmail,
        subject: `Experience Letter — ${data.candidateName} | Shuroq`,
        html: this.buildEmailHtml(employee.firstName, contact),
        attachmentName: `${data.candidateName} - Experience Letter.pdf`,
        actor,
      });
      emailed = queued.emailed;
      pending = queued.pending;
      letterId = queued.letterId;
      error = queued.error;
    }

    return { documentId: document.id, fileUrl, emailed, pending, letterId, error };
  }

  // ====================================================================
  // DOWNLOAD
  // ====================================================================

  async resolveLetterForDownload(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, experienceLetterDocumentId: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.experienceLetterDocumentId) {
      throw new NotFoundException('No experience letter has been generated for this employee.');
    }
    return employee.experienceLetterDocumentId;
  }

  // =====================================================================
  // PDF GENERATION — Exact Design Template
  // =====================================================================

  private async renderExperienceLetter(d: ExperienceLetterData): Promise<Buffer> {
    const PAGE_W = 595.5;
    const PAGE_H = 842.25;

    return this.renderPdf((doc: any) => {
      const has = (p: string) => fs.existsSync(p);
      const reg = (name: string, p: string) => { if (has(p)) doc.registerFont(name, p); };

      reg('Montserrat-Medium', EXPERIENCE_FONTS.montserratMedium);
      reg('Montserrat-Bold', EXPERIENCE_FONTS.montserratBold);
      reg('CormorantGaramond-Bold', EXPERIENCE_FONTS.cormorantGaramondBold);
      reg('GlacialIndifference-Bold', EXPERIENCE_FONTS.glacialIndifferenceBold);

      const fontTitle = has(EXPERIENCE_FONTS.cormorantGaramondBold) ? 'CormorantGaramond-Bold' : 'Times-Bold';
      const fontMedium = has(EXPERIENCE_FONTS.montserratMedium) ? 'Montserrat-Medium' : 'Helvetica';
      const fontBold = has(EXPERIENCE_FONTS.montserratBold) ? 'Montserrat-Bold' : 'Helvetica-Bold';
      const fontSignatory = has(EXPERIENCE_FONTS.glacialIndifferenceBold)
        ? 'GlacialIndifference-Bold'
        : (has(EXPERIENCE_FONTS.montserratBold) ? 'Montserrat-Bold' : 'Helvetica-Bold');

      // 1. Decorative Ribbons (Top & Bottom curved waves)
      if (has(EXPERIENCE_ASSETS.topRibbon)) {
        doc.image(EXPERIENCE_ASSETS.topRibbon, 0, 0, { width: PAGE_W, height: 35 });
      }
      if (has(EXPERIENCE_ASSETS.bottomRibbon)) {
        doc.image(EXPERIENCE_ASSETS.bottomRibbon, 0, PAGE_H - 35, { width: PAGE_W, height: 35 });
      }

      // 2. Faint Background Watermark (opacity 0.06 centered behind body text)
      const watermarkPath = has(EXPERIENCE_ASSETS.watermark) ? EXPERIENCE_ASSETS.watermark : EXPERIENCE_ASSETS.fallbackLogo;
      if (has(watermarkPath)) {
        doc.save();
        doc.opacity(0.06);
        doc.image(watermarkPath, 187.35, 300.58, { width: 192.08 });
        doc.restore();
      }

      // 3. Header Shuroq Logo (calibrated in-between size: ~188pt, centered horizontally & vertically)
      const logoPath = has(EXPERIENCE_ASSETS.logo) ? EXPERIENCE_ASSETS.logo : EXPERIENCE_ASSETS.fallbackLogo;
      if (has(logoPath)) {
        const logoWidth = 188;
        const logoHeight = logoWidth * (360 / 1136); // ~59.58 pt
        const logoX = (PAGE_W - logoWidth) / 2; // ~203.75 pt
        const logoY = 68.5; // balanced 33.5pt below top ribbon (y=35) and 33.8pt above title (y=161.91)
        doc.image(logoPath, logoX, logoY, { width: logoWidth, height: logoHeight });
      }

      const COLOR_NAVY = '#0d0538';
      const COLOR_GREY = '#545454';

      // 4. Title: EXPERIENCE CERTIFICATE (exact bbox y=161.91, CormorantGaramond-Bold, 25.33pt)
      doc.fillColor(COLOR_NAVY)
         .font(fontTitle)
         .fontSize(25.33)
         .text('EXPERIENCE CERTIFICATE', 0, 161.91, {
           width: PAGE_W,
           align: 'center',
           characterSpacing: 0.8,
         });

      // 5. Subheading: TO WHOMSOEVER IT MAY CONCERN (exact bbox y=222.99, Montserrat-Bold, 16.30pt)
      doc.fillColor(COLOR_NAVY)
         .font(fontBold)
         .fontSize(16.30)
         .text('TO WHOMSOEVER IT MAY CONCERN', 0, 222.99, {
           width: PAGE_W,
           align: 'center',
         });

      // Helper to draw a centered line of styled spans
      const drawCenteredSpans = (spans: { text: string; font: string; color?: string }[], y: number, fontSize: number) => {
        let totalWidth = 0;
        for (const span of spans) {
          doc.font(span.font).fontSize(fontSize);
          totalWidth += doc.widthOfString(span.text);
        }
        let currentX = (PAGE_W - totalWidth) / 2;
        for (const span of spans) {
          doc.font(span.font).fontSize(fontSize).fillColor(span.color || COLOR_NAVY);
          doc.text(span.text, currentX, y, { lineBreak: false });
          currentX += doc.widthOfString(span.text);
        }
      };

      const BODY_X = 20;
      const BODY_W = PAGE_W - 40;
      const LINE_GAP = 5.69;

      if (d.customContent && d.customContent.trim().length > 0) {
        // HR typed / pasted exact custom text
        const raw = d.customContent.trim();
        const len = raw.length;

        let fontSize = 15.31;
        let lineGap = 5.69;
        if (len > 900) {
          fontSize = 10.5;
          lineGap = 3.5;
        } else if (len > 600) {
          fontSize = 12.0;
          lineGap = 4.2;
        } else if (len > 400) {
          fontSize = 13.5;
          lineGap = 4.8;
        }

        const paragraphs = raw.split(/\n\s*\n|\r\n\s*\r\n/);
        let curY = 261.47;

        for (const para of paragraphs) {
          const trimmed = para.trim();
          if (!trimmed) continue;
          doc.fillColor(COLOR_NAVY)
             .font(fontMedium)
             .fontSize(fontSize);
          doc.text(trimmed, BODY_X, curY, {
            width: BODY_W,
            align: 'center',
            lineGap,
          });
          const paraH = doc.heightOfString(trimmed, { width: BODY_W, lineGap });
          curY += paraH + 16.0;
        }
      } else {
        // Standard template matching the reference experience letter
        const startStr = fmtDate(d.joinDate);
        const endStr = fmtDate(d.issueDate);

        // Paragraph 1: Certification & Tenure
        drawCenteredSpans([
          { text: 'This is to certify that ', font: fontMedium },
          { text: d.candidateName, font: fontBold },
          { text: ' worked with', font: fontMedium },
        ], 261.47, 15.31);

        drawCenteredSpans([
          { text: 'Shuroq as an ', font: fontMedium },
          { text: d.designation || 'Engineer', font: fontBold },
          { text: ' from ', font: fontMedium },
          { text: startStr, font: fontBold },
          { text: ' to ', font: fontMedium },
          { text: endStr, font: fontBold },
          { text: '.', font: fontMedium },
        ], 282.48, 15.31);

        // Paragraph 2: Contributions
        let contribText =
          'During his tenure, he contributed to the design and development of AI/NLP solutions, including NLP pipelines, intent classification, entity extraction, query understanding, clarification engines, confidence and safety mechanisms, and speech-to-text integration.';
        if (d.contributions && d.contributions.length > 0) {
          const projNames = d.contributions.map((c) => c.projectName).filter(Boolean);
          const techList = d.contributions.map((c) => c.technologies).filter(Boolean).join(', ');
          const workDesc = d.contributions.map((c) => c.description).filter(Boolean).join('; ');

          if (workDesc) {
            contribText = `During his tenure, he contributed to ${projNames.join(', ')}. ${workDesc}`;
          } else if (techList) {
            contribText = `During his tenure, he contributed to ${projNames.join(', ')} utilizing technologies including ${techList}.`;
          } else if (projNames.length > 0) {
            contribText = `During his tenure, he contributed significantly to key enterprise projects including ${projNames.join(', ')}, demonstrating exemplary technical proficiency and diligence.`;
          }
        }

        doc.fillColor(COLOR_NAVY)
           .font(fontMedium)
           .fontSize(15.31)
           .text(contribText, BODY_X, 324.50, { width: BODY_W, align: 'center', lineGap: LINE_GAP });

        // Paragraph 3: Secondary scope
        doc.font(fontMedium)
           .fontSize(15.31)
           .text(
             'He also worked on backend integration, AWS-based engineering, production deployment, and support for an AI-powered service marketplace.',
             BODY_X,
             450.54,
             { width: BODY_W, align: 'center', lineGap: LINE_GAP },
           );

        // Paragraph 4: Appreciation
        doc.font(fontMedium)
           .fontSize(15.31)
           .text(
             'We appreciate his contributions and wish him all the best in his future career and endeavors.',
             BODY_X,
             534.58,
             { width: BODY_W, align: 'center', lineGap: LINE_GAP },
           );

        // Paragraph 5: "For Shuroq"
        doc.font(fontMedium)
           .fontSize(15.31)
           .text('For Shuroq', BODY_X, 576.59, { width: BODY_W, align: 'center' });
      }

      // 7. Footer:
      // Signature image: exact template coordinates [72.67, 632.91, 107.25, 96.16] (clean ~4.7pt gap above rule)
      const sigPath = has(EXPERIENCE_ASSETS.signature) ? EXPERIENCE_ASSETS.signature : EXPERIENCE_ASSETS.fallbackSig;
      if (has(sigPath)) {
        const sigWidth = 107.25;
        const sigHeight = 96.16;
        const sigX = 72.67;
        const sigY = 632.91;
        doc.image(sigPath, sigX, sigY, { width: sigWidth, height: sigHeight });
      }

      // Rule: [29.82, 732.20] to [189.01, 732.20], width 0.75
      const RULE_START = 29.82;
      const RULE_END = 189.01;
      const RULE_W = RULE_END - RULE_START; // 159.19

      doc.lineWidth(0.75)
         .strokeColor('#000000')
         .moveTo(RULE_START, 732.20)
         .lineTo(RULE_END, 732.20)
         .stroke();

      // "AUTHORIZED SIGNATORY": exact bbox [35.84, 732.51, 182.97, 747.65]
      doc.fillColor(COLOR_GREY)
         .font(fontSignatory)
         .fontSize(12.61);
      const authW = doc.widthOfString('AUTHORIZED SIGNATORY');
      const authX = RULE_START + (RULE_W - authW) / 2;
      doc.text('AUTHORIZED SIGNATORY', authX, 732.51, { lineBreak: false });

      // "shuroq": exact bbox [78.19, 746.64, 129.16, 765.81]
      doc.fillColor(COLOR_GREY)
         .font(fontSignatory)
         .fontSize(15.97);
      const shuroqW = doc.widthOfString('shuroq');
      const shuroqX = RULE_START + (RULE_W - shuroqW) / 2;
      doc.text('shuroq', shuroqX, 746.64, { lineBreak: false });

      // Seal: exact bbox [322.93, 635.62, 493.24, 748.91]
      const sealPath = has(EXPERIENCE_ASSETS.seal) ? EXPERIENCE_ASSETS.seal : EXPERIENCE_ASSETS.fallbackSeal;
      if (has(sealPath)) {
        doc.image(sealPath, 322.93, 635.62, { width: 170.31, height: 113.29 });
      }

      // MSME: exact bbox [465.88, 635.62, 606.18, 746.66]
      const msmePath = has(EXPERIENCE_ASSETS.msme) ? EXPERIENCE_ASSETS.msme : EXPERIENCE_ASSETS.fallbackMsme;
      if (has(msmePath)) {
        doc.image(msmePath, 465.88, 635.62, { width: 140.30, height: 111.04 });
      }
    }, { size: [PAGE_W, PAGE_H], margin: 0 });
  }

  // ====================================================================
  // EMAIL
  // ====================================================================

  private buildEmailHtml(firstName: string, contact: string): string {
    return coverNoteHtml([
      `Hi ${escapeHtml(firstName)},`,
      'Please find attached your Experience Letter from Shuroq Technologies. '
        + 'This certificate acknowledges your contributions and service during your tenure with us.',
      escapeHtml(contact),
      'Warm regards,<br />HR Team, Shuroq',
    ]);
  }

  // ====================================================================
  // HELPERS
  // ====================================================================

  private renderPdf(build: (doc: any) => void, options?: { size?: [number, number]; margin?: number }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: options?.margin ?? 50, size: options?.size ?? 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try {
        build(doc);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private placeAsset(doc: any, assetPath: string, x: number, y: number, width: number) {
    if (fs.existsSync(assetPath)) {
      doc.image(assetPath, x, y, { width });
    }
  }

  private drawMark(doc: any, mark: CertMark, box: { x: number; y: number; w: number }) {
    const s = box.w / mark.w;
    doc.save();
    doc.translate(box.x, box.y).scale(s);
    for (const layer of mark.layers) doc.path(layer.d).fill(layer.color, 'even-odd');
    doc.restore();
  }

  private async getSupportContactLine(): Promise<string> {
    const phone = await this.prisma.companyPolicy.findUnique({ where: { key: 'support_contact_phone' } });
    if (phone?.value) {
      return `If you have any questions, you can reach us at ${phone.value} or ${COMPANY.email}.`;
    }
    return `If you have any questions, you can reach us at ${COMPANY.email}.`;
  }
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${dt.getFullYear()}`;
}
