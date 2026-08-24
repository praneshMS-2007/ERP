import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
const PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mailer.service';
import { coverNoteHtml, escapeHtml } from '../common/email-template';

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

const ASSETS_DIR = path.join(process.cwd(), 'assets', 'brand');
const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');
// The original company-seal.png / msme-logo.png / authorized-signature.png in
// assets/brand are unusable crops: the first two run their artwork off the
// right edge (the seal off the bottom too) and carry a blue diagonal wedge
// bled in from whatever page they were captured from, and the signature bakes
// in its own rule line + "Authorized Signature" caption, which double-printed
// against the caption this template draws itself.
//
// The `*-clean.png` files used here were cut from the approved certificate
// design instead, so each mark is complete: the full circular seal including
// its registration arc, the MSME mark with an uncropped Ashoka emblem, and the
// signature's full stroke including the ascending loops the old file lost.
// They are cut at the design's own resolution (~172px for the seal), which is
// fine on screen but soft in print — replace them with vector or high-DPI
// originals if these are ever sent to a commercial printer.
const ASSET_PATHS = {
  logo: path.join(ASSETS_DIR, 'shuroq-logo.png'),
  seal: path.join(ASSETS_DIR, 'company-seal-clean.png'),
  signature: path.join(ASSETS_DIR, 'authorized-signature-clean.png'),
  msme: path.join(ASSETS_DIR, 'msme-logo-clean.png'),
  serifFont: path.join(FONTS_DIR, 'certificate-serif.ttf'),
  serifFontBold: path.join(FONTS_DIR, 'certificate-serif-bold.ttf'),
  bodyFont: path.join(FONTS_DIR, 'certificate-body.ttf'),
  bodyFontBold: path.join(FONTS_DIR, 'certificate-body-bold.ttf'),
};

/**
 * Border geometry sampled from the reference design (1280x904), converted to
 * points at 841.89/1280. `topGold`/`bottomGold` are the depth of the gold
 * layer measured down from each band's outer edge, at 41 evenly spaced columns.
 */
const RIBBON = {
  topDepth: 38.15,
  bottomTop: 545.91,
  topGold: [
    0.00, 0.00, 2.63, 5.26, 6.58, 8.55, 9.87, 11.18, 11.84, 13.15, 13.81,
    14.47, 15.13, 15.79, 16.44, 16.44, 17.10, 17.10, 17.10, 17.10, 17.10,
    17.10, 17.10, 17.10, 17.10, 16.44, 15.79, 15.79, 15.13, 14.47, 13.15,
    12.50, 11.84, 10.52, 9.21, 7.89, 5.92, 3.95, 1.32, 0.00, 0.00,
  ],
  bottomGold: [
    5.26, 10.52, 13.81, 16.44, 18.42, 19.73, 21.05, 22.36, 23.68, 24.34,
    25.65, 26.31, 26.31, 27.62, 27.62, 28.28, 28.28, 28.94, 28.94, 28.94,
    28.94, 28.94, 28.94, 28.94, 28.28, 28.28, 27.62, 27.62, 26.97, 26.31,
    25.65, 24.34, 23.68, 22.36, 21.05, 19.73, 18.42, 16.44, 13.81, 10.52,
    5.26,
  ],
};

interface CertificateData {
  candidateName: string;
  roleTitle: string;
  department: string;
  startDate: Date;
  endDate: Date;
  mode: string;
}

/**
 * Generates and emails Internship Completion Certificates.
 *
 * Workflow:
 * 1. HR navigates to the Internship Certificates page
 * 2. System shows all interns whose engagementEndDate has passed
 * 3. HR clicks Approve → PDF certificate is generated, stored as a Document,
 *    and emailed to the intern's personal email with the PDF attached
 * 4. HR clicks Reject → intern is marked as rejected (no certificate sent)
 *
 * The PDF layout matches the existing branded Shuroq template:
 * blue diagonal stripes, company seal, authorized signature, MSME logo.
 */
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from './hrm.service';

@Injectable()
export class InternshipCertificateService {
  private readonly logger = new Logger(InternshipCertificateService.name);
  private readonly outDir = path.join(process.cwd(), 'uploads', 'internship-certificates');

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private audit: AuditService,
  ) {
    fs.mkdirSync(this.outDir, { recursive: true });
  }

  /**
   * Returns every INTERN employee — not just the ones whose internship has
   * already ended. HR needs to see the whole roster (who's currently
   * interning, when each one wraps up) here, not just a list that's empty
   * until someone happens to finish; `isDurationComplete` is what actually
   * gates the Approve action, both here (via `certStatus`) and for real in
   * approveAndSend below.
   */
  async getCompletedInterns() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const interns = await this.prisma.employee.findMany({
      where: {
        empType: 'INTERN',
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      include: {
        department: true,
        designation: true,
        user: true,
        internshipCertDocument: true,
      },
      orderBy: { engagementEndDate: 'desc' },
    });

    return interns.map((emp) => {
      const isDurationComplete = !!emp.engagementEndDate && emp.engagementEndDate <= today;
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: `${emp.firstName} ${emp.lastName}`,
        personalEmail: emp.personalEmail,
        designation: emp.designation?.title ?? 'Intern',
        department: emp.department?.name ?? '',
        joinDate: emp.joinDate,
        engagementEndDate: emp.engagementEndDate,
        workMode: (emp as any).workMode ?? 'Remote',
        isDurationComplete,
        // PENDING | APPROVED | REJECTED — meaningless until the duration
        // actually completes, but kept as-is (usually PENDING/null) so it's
        // ready the moment isDurationComplete flips true.
        certStatus: emp.internshipCertStatus ?? 'PENDING',
        certSentAt: emp.internshipCertSentAt,
        certDocumentId: emp.internshipCertDocumentId,
        hasEmail: !!emp.personalEmail,
      };
    });
  }

  /**
   * Approve: generate the PDF completion certificate, save it, email it.
   */
  async approveAndSend(employeeId: string, actor?: RequestUser): Promise<{
    documentId: string | null;
    fileUrl: string | null;
    emailed: boolean;
    error?: string;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true, user: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.empType !== 'INTERN') throw new BadRequestException('Only interns can receive completion certificates');
    if (!employee.engagementEndDate) throw new BadRequestException('Intern has no engagement end date set');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (employee.engagementEndDate > today) {
      throw new BadRequestException(
        `This internship hasn't finished yet — it runs through ${employee.engagementEndDate.toLocaleDateString('en-GB')}.`,
      );
    }
    if (employee.internshipCertStatus === 'APPROVED') throw new BadRequestException('Certificate has already been issued');
    if (!employee.personalEmail) {
      return { documentId: null, fileUrl: null, emailed: false, error: 'No personal email address on file for this intern' };
    }

    const data: CertificateData = {
      candidateName: `${employee.firstName} ${employee.lastName}`,
      roleTitle: employee.designation?.title ?? 'Intern',
      department: employee.department?.name ?? '',
      startDate: employee.joinDate,
      endDate: employee.engagementEndDate,
      mode: (employee as any).workMode ?? 'Remote',
    };

    // Generate the PDF certificate
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await this.renderCompletionCertificate(data);
    } catch (err: any) {
      this.logger.error(`PDF generation failed for ${employeeId}: ${err.message}`);
      return { documentId: null, fileUrl: null, emailed: false, error: `Could not generate the certificate: ${err.message}` };
    }

    // Save to disk
    const safeName = data.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${safeName}-completion-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const fullPath = path.join(this.outDir, fileName);
    fs.writeFileSync(fullPath, pdfBuffer);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const fileUrl = `/uploads/internship-certificates/${fileName}`;

    // Create Document record
    const document = await this.prisma.document.create({
      data: {
        kind: 'COMPLETION_CERTIFICATE',
        ownerUserId: employee.userId,
        storagePath: fileUrl,
        fileName,
        sha256,
      },
    });

    // Link to employee
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        internshipCertDocumentId: document.id,
        internshipCertStatus: 'APPROVED',
        internshipCertSentAt: new Date(),
      },
    });

    // Audit log
    await this.audit.log({
      userId: actor?.id,
      role: actor?.role,
      action: 'APPROVE_INTERNSHIP_CERTIFICATE',
      actionType: 'UPDATE',
      module: 'HR',
      entityType: 'Employee',
      entityId: employeeId,
      targetLabel: `${employee.firstName} ${employee.lastName}`,
      description: `Approved and issued Internship Completion Certificate for ${employee.firstName} ${employee.lastName} (${employee.designation?.title ?? 'Intern'})`,
      details: {
        employeeId,
        internName: `${employee.firstName} ${employee.lastName}`,
        documentId: document.id,
        fileUrl,
      },
    });

    // Build and send the email.
    //
    // The certificate travels as the PDF and nothing else: the mail carries a
    // single attachment and a short plain covering note. It deliberately does
    // NOT use the shared branded shell (emailShell) or any inline cid: images
    // — the body used to re-render the whole certificate in HTML alongside the
    // attachment, which meant the recipient got the same document twice.
    const contact = await this.getSupportContactLine();
    const result = await this.mailer.send({
      to: employee.personalEmail,
      subject: `Internship Completion Certificate — ${data.candidateName} | Shuroq`,
      html: this.buildCertificateEmailHtml(employee.firstName, contact),
      attachments: [
        { filename: `${data.candidateName} - Internship Completion Certificate.pdf`, path: fullPath },
      ],
    });

    if (!result.sent) {
      this.logger.warn(`Certificate generated but not emailed for ${employeeId}: ${result.error}`);
    }

    return {
      documentId: document.id,
      fileUrl,
      emailed: result.sent,
      error: result.sent ? undefined : result.error,
    };
  }

  /**
   * Reject: mark the intern as rejected (no certificate generated).
   */
  async reject(employeeId: string, reason?: string, actor?: RequestUser) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.empType !== 'INTERN') throw new BadRequestException('Only interns can be processed here');
    if (employee.internshipCertStatus === 'APPROVED') throw new BadRequestException('Certificate has already been issued — cannot reject');

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { internshipCertStatus: 'REJECTED' },
    });

    // Audit log
    await this.audit.log({
      userId: actor?.id,
      role: actor?.role,
      action: 'REJECT_INTERNSHIP_CERTIFICATE',
      actionType: 'UPDATE',
      module: 'HR',
      entityType: 'Employee',
      entityId: employeeId,
      targetLabel: `${employee.firstName} ${employee.lastName}`,
      description: `Rejected Internship Completion Certificate for ${employee.firstName} ${employee.lastName}${reason ? `. Reason: ${reason}` : ''}`,
      details: { employeeId, internName: `${employee.firstName} ${employee.lastName}`, reason },
    });

    return { success: true, status: 'REJECTED' };
  }

  // =====================================================================
  // PDF GENERATION — Internship Completion Certificate
  //
  // Matches the redesigned certificate image exactly: landscape page,
  // orange-to-navy gradient ribbon top and bottom, centered logo, a serif
  // two-line title, "THIS IS CERTIFIED THAT" + the candidate's name set in
  // an embedded script font with an underline beneath it, one completion
  // sentence, one description paragraph, and a footer with the authorized
  // signature on the left and the company seal + MSME mark on the right.
  // No greeting, no field list, no bullets — just the certificate itself.
  // =====================================================================

  private async renderCompletionCertificate(d: CertificateData): Promise<Buffer> {
    const W = 841.89; // A4 landscape — matches the reference image's 1.416 aspect
    const H = 595.28;

    // Every constant below is the reference image's own pixel position scaled
    // to points (reference is 1280x904, so x_pt = x_px * 841.89/1280 = x_px * 0.6577).
    // Positions are baselines, not cap-tops: the bundled Windows faces used
    // here have no usable capHeight in their OS/2 table (fontkit reports NaN),
    // so anything derived from cap height would silently produce NaN offsets.
    // Ascender is present and valid, which is all baseline placement needs.
    const L = {
      logoW: 142.1, logoBottom: 140.8,
      title1Baseline: 186.8, title1W: 346.6, titleSpacing: 2.2,
      title2Baseline: 222.3,
      labelX: 116.4, labelBaseline: 282.8, labelW: 186.8, labelSpacing: 1.4,
      nameBaseline: 276.2, nameW: 304.5,
      ruleY: 281.5, ruleX: 326.9, ruleRight: 681.4, ruleMaxRight: 762,
      // The sample's own two blocks disagree on implied size (the sentence
      // solves to ~15.0pt, the description to ~15.6pt), so its body face is
      // not Century Gothic. 15.3 splits the difference: both land within 3%.
      bodySize: 15.3,
      sentBaseline: 315.7, sentBoxW: 660, sentLineSpacing: 17.1,
      descBaseline: 362.4, descBoxW: 660, descLineSpacing: 19.7,
      sigRuleY: 488, sigRuleX: 109.8, sigRuleW: 188.8,
      authX: 117.1, authBaseline: 507.1, authW: 174.3,
      shuroqBaseline: 527.5, shuroqW: 59.2, shuroqCx: 197,
      // Image placements: source crop origin x width, all in reference space.
      sigImg: { x: 164.43, y: 401.21, w: 106.55 },
      sealImg: { x: 509.74, y: 409.76, w: 115.1 },
      msmeImg: { x: 642.6, y: 404.5, w: 112.47 },
    };

    return this.renderPdf((doc: any) => {
      const has = (p: string) => fs.existsSync(p);
      const reg = (name: string, p: string) => { if (has(p)) doc.registerFont(name, p); };
      reg('CertSerif', ASSET_PATHS.serifFont);
      reg('CertSerif-Bold', ASSET_PATHS.serifFontBold);
      reg('CertBody', ASSET_PATHS.bodyFont);
      reg('CertBody-Bold', ASSET_PATHS.bodyFontBold);
      const serif = has(ASSET_PATHS.serifFont) ? 'CertSerif' : 'Times-Roman';
      const serifBold = has(ASSET_PATHS.serifFontBold) ? 'CertSerif-Bold' : 'Times-Bold';
      const body = has(ASSET_PATHS.bodyFont) ? 'CertBody' : 'Helvetica';
      const bodyBold = has(ASSET_PATHS.bodyFontBold) ? 'CertBody-Bold' : 'Helvetica-Bold';

      /** Font size at which `text` measures exactly `targetW` points. */
      const fitSize = (text: string, targetW: number, font: string, cs = 0) => {
        doc.font(font).fontSize(100);
        const w100 = doc.widthOfString(text);
        return (100 * (targetW - cs * text.length)) / w100;
      };
      /** PDFKit places text by line-box top; convert a desired baseline to that. */
      const topFor = (baseline: number, size: number) =>
        baseline - (doc._font.ascender / 1000) * size;
      /** Draw `text` so its first baseline lands exactly on `baseline`. */
      const atBaseline = (text: string, baseline: number, size: number, opts: any = {}) =>
        doc.text(text, opts.x ?? 0, topFor(baseline, size), opts);
      /** lineGap needed to make consecutive baselines sit `target` apart. */
      const gapFor = (target: number) => target - doc.currentLineHeight(false);

      // --- Ribbons: an orange band with a navy→blue band riding on top of it,
      //     both wavy. The orange only shows where the navy curve sits higher. ---
      this.drawRibbon(doc, W, H, 'top');
      this.drawRibbon(doc, W, H, 'bottom');

      // --- Faint centred logo watermark ---
      if (has(ASSET_PATHS.logo)) {
        doc.save().opacity(0.02);
        doc.image(ASSET_PATHS.logo, (W - 250) / 2, 352, { width: 250 });
        doc.restore();
      }

      // --- Centred Shuroq logo (sized to the reference, sitting on its baseline) ---
      if (has(ASSET_PATHS.logo)) {
        const li = doc.openImage(ASSET_PATHS.logo);
        const lh = L.logoW * (li.height / li.width);
        doc.image(ASSET_PATHS.logo, (W - L.logoW) / 2, L.logoBottom - lh, { width: L.logoW });
      }

      // --- Title (two lines, sized to the reference's measured width).
      //     Both reference lines centre on x=664px of 1280 rather than 640,
      //     i.e. the sample's own title box sits ~16pt right of centre. That
      //     is reproduced as true centring here, not copied. ---
      const titleSize = fitSize('INTERNSHIP COMPLETION', L.title1W, serifBold, L.titleSpacing);
      doc.font(serifBold).fontSize(titleSize).fillColor(BRAND.darkBlue);
      const titleOpts = { align: 'center', width: W, characterSpacing: L.titleSpacing, lineBreak: false };
      atBaseline('INTERNSHIP COMPLETION', L.title1Baseline, titleSize, titleOpts);
      atBaseline('CERTIFICATE', L.title2Baseline, titleSize, titleOpts);

      // --- "THIS IS CERTIFIED THAT" + name on one line, rule under the name
      //     only. Label and rule sit at fixed x (as in the reference); the
      //     rule stretches to fit longer names, and the name shrinks if it
      //     would otherwise overrun the right edge. ---
      const labelText = 'THIS IS CERTIFIED THAT';
      const labelSize = fitSize(labelText, L.labelW, body, L.labelSpacing);
      doc.font(body).fontSize(labelSize).fillColor('#1f2530');
      doc.text(labelText, L.labelX, topFor(L.labelBaseline, labelSize), {
        characterSpacing: L.labelSpacing, lineBreak: false,
      });

      // Sized so the sample's own 21-character name reproduces its measured
      // 304.5pt width; longer names shrink rather than overrun the rule.
      const refName = 'Sakshi Kailash Bhabad';
      let nameSize = fitSize(refName, L.nameW, serif);
      const ruleW0 = L.ruleRight - L.ruleX;
      const maxNameW = L.ruleMaxRight - L.ruleX - 24;
      doc.font(serif).fontSize(nameSize);
      if (doc.widthOfString(d.candidateName) > maxNameW) {
        nameSize *= maxNameW / doc.widthOfString(d.candidateName);
        doc.fontSize(nameSize);
      }
      const nameW = doc.widthOfString(d.candidateName);
      const ruleW = Math.min(Math.max(ruleW0, nameW + 24), L.ruleMaxRight - L.ruleX);
      doc.fillColor(BRAND.darkBlue)
        .text(d.candidateName, L.ruleX + (ruleW - nameW) / 2, topFor(L.nameBaseline, nameSize), { lineBreak: false });
      doc.save().moveTo(L.ruleX, L.ruleY).lineTo(L.ruleX + ruleW, L.ruleY)
        .lineWidth(1.6).strokeColor('#2b5ca8').stroke().restore();

      // --- Completion sentence. The reference breaks after the role title,
      //     so the break is explicit rather than left to the wrap point. ---
      doc.font(body).fontSize(L.bodySize).fillColor('#262b33');
      atBaseline(
        `has successfully completed the internship as a ${d.roleTitle}\nat Shuroq from ${fmtDateLong(d.startDate)} to ${fmtDateLong(d.endDate)}`,
        L.sentBaseline, L.bodySize,
        { x: (W - L.sentBoxW) / 2, align: 'center', width: L.sentBoxW, lineGap: gapFor(L.sentLineSpacing) },
      );

      // --- Description paragraph. Fixed copy, so the reference's own three-line
      //     break is reproduced literally rather than left to the wrap point. ---
      doc.font(body).fontSize(L.bodySize).fillColor('#262b33');
      atBaseline(
        'During this period, the intern was involved in assigned tasks and activities related\n'
        + 'to the role and demonstrated professional conduct throughout the internship\n'
        + 'duration.',
        L.descBaseline, L.bodySize,
        { x: (W - L.descBoxW) / 2, align: 'center', width: L.descBoxW, lineGap: gapFor(L.descLineSpacing) },
      );

      // --- Footer left: signature over its rule + captions ---
      this.placeAsset(doc, ASSET_PATHS.signature, L.sigImg.x, L.sigImg.y, L.sigImg.w);
      doc.save().moveTo(L.sigRuleX, L.sigRuleY).lineTo(L.sigRuleX + L.sigRuleW, L.sigRuleY)
        .lineWidth(1.4).strokeColor('#1f2530').stroke().restore();

      const authSize = fitSize('AUTHORIZED SIGNATORY', L.authW, bodyBold);
      doc.font(bodyBold).fontSize(authSize).fillColor('#1f2530');
      atBaseline('AUTHORIZED SIGNATORY', L.authBaseline, authSize, { x: L.authX, lineBreak: false });
      // "shuroq" is set slightly larger than the caption above it in the sample
      const shuroqSize = fitSize('shuroq', L.shuroqW, bodyBold);
      doc.font(bodyBold).fontSize(shuroqSize).fillColor('#1f2530');
      atBaseline('shuroq', L.shuroqBaseline, shuroqSize, {
        x: L.shuroqCx - L.shuroqW / 2, lineBreak: false,
      });

      // --- Footer right: company seal, then MSME mark ---
      this.placeAsset(doc, ASSET_PATHS.seal, L.sealImg.x, L.sealImg.y, L.sealImg.w);
      this.placeAsset(doc, ASSET_PATHS.msme, L.msmeImg.x, L.msmeImg.y, L.msmeImg.w);
    }, { size: [W, H], margin: 0 });
  }

  /**
   * Top and bottom borders.
   *
   * Measured off the reference rather than eyeballed, because the shape is not
   * what it looks like: each border is a **constant-height band with straight
   * edges** (top 0→38.15pt, bottom 545.91pt→page foot). Nothing about the
   * band's outline is curved. The wave everyone sees is the boundary *inside*
   * the band between two colours — gold on the outside, navy→blue underneath —
   * and gold sits on top of navy, not below it.
   *
   * Both colours run as horizontal gradients (measured linear end to end), and
   * the gold/navy boundary is sampled from the reference at 41 points across
   * the width, then drawn as a smoothed curve through those samples.
   */
  private drawRibbon(doc: any, W: number, H: number, side: 'top' | 'bottom') {
    const gold = doc.linearGradient(0, 0, W, 0);
    gold.stop(0, '#ff9a02').stop(1, '#fbc880');
    const navy = doc.linearGradient(0, 0, W, 0);
    navy.stop(0, '#0d063a').stop(1, '#0043aa');

    const top = side === 'top';
    const bandTop = top ? 0 : RIBBON.bottomTop;
    const bandBottom = top ? RIBBON.topDepth : H;
    const wedge = top ? RIBBON.topGold : RIBBON.bottomGold;

    doc.save();
    // Navy base fills the whole band; gold is then laid over its outer edge.
    doc.rect(0, bandTop, W, bandBottom - bandTop).fill(navy);

    const pts: [number, number][] = wedge.map((d, i) => [
      (i * W) / (wedge.length - 1),
      bandTop + d,
    ]);
    doc.moveTo(0, bandTop).lineTo(W, bandTop).lineTo(W, pts[pts.length - 1][1]);
    // Smooth back through the samples: each sample is a control point, with
    // segment midpoints as anchors, so a 41-point table reads as a curve.
    for (let i = pts.length - 1; i > 0; i--) {
      const [cx, cy] = pts[i];
      const mx = (cx + pts[i - 1][0]) / 2;
      const my = (cy + pts[i - 1][1]) / 2;
      doc.quadraticCurveTo(cx, cy, mx, my);
    }
    doc.quadraticCurveTo(pts[0][0], pts[0][1], 0, pts[0][1]);
    doc.closePath().fill(gold);
    doc.restore();
  }

  // =====================================================================
  // EMAIL BODY — Completion certificate notification
  // =====================================================================

  /**
   * Covering note only.
   *
   * The certificate itself is the attached PDF; this body must not reproduce
   * it. An earlier version rendered the full certificate inline in HTML as
   * well, so recipients received the same document twice — once as a picture
   * they could not use and once as the real file. Keep this plain: no inline
   * images, no cid: attachments, no branded shell.
   */
  private buildCertificateEmailHtml(firstName: string, contact: string): string {
    return coverNoteHtml([
      `Hi ${escapeHtml(firstName)},`,
      'Congratulations on completing your internship at Shuroq. Your Internship '
        + 'Completion Certificate is attached to this email as a PDF.',
      escapeHtml(contact),
      'Warm regards,<br />HR Team, Shuroq',
    ]);
  }

  // =====================================================================
  // SHARED BUILDING BLOCKS (same pattern as OfferLetterService)
  // =====================================================================

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

  /** Place a brand asset image at a specific position, with fallback */
  private placeAsset(doc: any, assetPath: string, x: number, y: number, width: number) {
    if (fs.existsSync(assetPath)) {
      doc.image(assetPath, x, y, { width });
    }
  }

  private async getSupportContactLine(): Promise<string> {
    const phone = await this.prisma.companyPolicy.findUnique({ where: { key: 'support_contact_phone' } });
    if (phone?.value) {
      return `If you have any questions, you can reach us at ${phone.value} or ${COMPANY.email}.`;
    }
    return `If you have any questions, you can reach us at ${COMPANY.email}.`;
  }
}

/** DD-MM-YYYY format matching the completion certificate reference image (e.g., "09-05-2026") */
function fmtDateLong(d: Date | null): string {
  if (!d) return '\u2014';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${dt.getFullYear()}`;
}
