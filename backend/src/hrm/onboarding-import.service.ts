import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { encryptField, decryptField } from '../common/field-encryption';
import { normaliseAadhaar, normaliseBankAccount, normaliseEmail, normaliseIfsc, normalisePan } from '../common/validators';
import { formatDateDMY } from '../common/date-format';
import { GoogleSheetsService, SheetTable } from './google-sheets.service';
import { HrmService, RequestUser } from './hrm.service';
import { EmployeeDocumentsService } from './employee-documents.service';

/** Identity documents and Aadhaar/PAN numbers: the same narrow gate as the Employee Documents tab. */
const ONBOARDING_ROLES = new Set(['SUPER_ADMIN', 'HR_MANAGER']);

const UPLOAD_DIR = path.join(process.cwd(), 'private-uploads', 'onboarding');
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

// ---------------------------------------------------------------------------
// What the form's columns are called. Matching is by trimmed, lower-cased title,
// so stray spaces (Google adds them) and small wording changes are tolerated.
// ---------------------------------------------------------------------------
const FIELD_ALIASES: Record<string, string[]> = {
  timestamp: ['timestamp'],
  email: ['email address', 'email', 'personal email', 'email id'],
  fullName: ['full name', 'name', 'candidate name'],
  dob: ['date of birth', 'dob', 'birth date'],
  mobile: ['mobile number', 'mobile', 'phone number', 'phone', 'contact number', 'mobile no'],
  aadhaar: ['aadhaar number', 'aadhar number', 'aadhaar no', 'aadhaar'],
  pan: ['pan number', 'pan card number', 'pan no', 'pan'],
  bankAccount: ['bank account number', 'account number', 'bank account no'],
  ifsc: ['ifsc code', 'ifsc'],
  currentAddress: ['current address', 'address', 'present address'],
  permanentAddress: ['permanent address'],
  qualification: ['highest qualification', 'qualification'],
  institution: ['institution name', 'institution', 'college', 'university'],
  yearOfPassing: ['year of passing', 'passing year'],
  emergencyName: ['emergency contact name'],
  emergencyPhone: ['emergency contact number', 'emergency contact phone'],
  emergencyRelation: ['emergency contact relationship', 'emergency contact relation'],
  joiningDate: ['expected date of joining', 'date of joining', 'joining date'],
  consent: ['consent'],
};

const FILE_FIELDS: Record<string, { label: string; kind: string; aliases: string[]; expected: boolean }> = {
  aadhaarCard: { label: 'Aadhaar card', kind: 'AADHAAR_CARD', aliases: ['aadhaar card', 'aadhar card', 'aadhaar photo', 'aadhaar copy'], expected: true },
  panCard: { label: 'PAN card', kind: 'PAN_CARD', aliases: ['pan card', 'pan card photo', 'pan copy'], expected: true },
  qualificationCertificate: { label: 'Qualification certificate', kind: 'EDUCATION_CERTIFICATE', aliases: ['highest qualification certificate', 'qualification certificate'], expected: true },
  photo: { label: 'Passport-size photo', kind: 'PROFILE_PHOTO', aliases: ['passport-size photo', 'passport size photo', 'photo'], expected: true },
  cancelledCheque: { label: 'Cancelled cheque / passbook', kind: 'CANCELLED_CHEQUE', aliases: ['cancelled cheque', 'cancelled cheque or passbook', 'passbook'], expected: false },
  relievingLetter: { label: 'Relieving letter', kind: 'RELIEVING_LETTER', aliases: ['relieving letter'], expected: false },
};

export interface Payload {
  fullName: string; firstName: string; lastName: string; email: string; mobile: string; dob: string;
  aadhaar: string; pan: string; bankAccount: string; ifsc: string;
  currentAddress: string; permanentAddress: string; qualification: string; institution: string; yearOfPassing: string;
  emergencyName: string; emergencyPhone: string; emergencyRelation: string;
  joiningDate: string; consent: boolean; timestamp: string;
  hr: {
    empType: string; designation: string; department: string; workMode: string; reportingManagerId: string;
    joinDate: string; engagementEndDate: string; isPaid: boolean; basic: string; hra: string; specialAllowance: string; username: string;
  };
}

const EDITABLE_PAYLOAD = [
  'firstName', 'lastName', 'email', 'mobile', 'dob', 'aadhaar', 'pan', 'bankAccount', 'ifsc', 'currentAddress', 'permanentAddress',
  'qualification', 'institution', 'yearOfPassing', 'emergencyName', 'emergencyPhone', 'emergencyRelation', 'joiningDate', 'consent',
] as const;
const EDITABLE_HR = [
  'empType', 'designation', 'department', 'workMode', 'reportingManagerId', 'joinDate', 'engagementEndDate', 'isPaid', 'basic', 'hra', 'specialAllowance', 'username',
] as const;

export interface Issue { field: string; message: string; severity: 'error' | 'warning' }
export interface FileEntry {
  field: string; label: string; kind: string; driveId?: string; fileName?: string; mime?: string; size?: number; storedName?: string; error?: string;
}

const norm = (h: string) => String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/** Google Sheets/Excel serial day number -> yyyy-mm-dd. */
function serialToIso(n: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
}

/** Accepts yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, or a sheet serial; returns yyyy-mm-dd or ''. */
function toIsoDate(text: string, raw?: unknown): string {
  if (typeof raw === 'number' && raw > 10000 && raw < 80000) return serialToIso(raw);
  const t = s(text);
  if (!t) return '';
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; } // Indian order: day first
  else return '';
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return dt.toISOString().slice(0, 10);
}

function normMobile(v: string): string {
  let digits = v.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function driveId(value: string): string | null {
  const first = s(value).split(/[,\n ]+/).find((x) => x);
  if (!first) return null;
  const m = first.match(/[?&]id=([-\w]{15,})/) || first.match(/\/d\/([-\w]{15,})/) || first.match(/\/folders\/([-\w]{15,})/);
  if (m) return m[1];
  return /^[-\w]{20,}$/.test(first) ? first : null;
}

function slug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tempPassword(): string {
  // No look-alike characters (0/O, 1/l/I) — it is read off a printed list.
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

@Injectable()
export class OnboardingImportService {
  private readonly logger = new Logger(OnboardingImportService.name);

  constructor(
    private prisma: PrismaService,
    private google: GoogleSheetsService,
    private hrm: HrmService,
    private docs: EmployeeDocumentsService,
    private audit: AuditService,
  ) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  private assertAccess(viewer?: RequestUser) {
    if (!viewer || !ONBOARDING_ROLES.has(viewer.role)) {
      throw new ForbiddenException('Only HR and administrators can import new joiners.');
    }
  }

  // ===================== config =====================

  async getConfig(viewer?: RequestUser) {
    this.assertAccess(viewer);
    const [departments, designations, managers, pending] = await Promise.all([
      this.prisma.department.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
      this.prisma.designation.findMany({ select: { title: true }, orderBy: { title: 'asc' } }),
      this.prisma.employee.findMany({ where: { status: { not: 'INACTIVE' } }, select: { id: true, firstName: true, lastName: true, empCode: true }, orderBy: { firstName: 'asc' } }),
      this.prisma.onboardingSubmission.count({ where: { status: 'PENDING' } }),
    ]);
    return {
      google: this.google.describe(),
      departments: departments.map((d) => d.name),
      designations: designations.map((d) => d.title),
      managers: managers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`.trim(), empCode: m.empCode })),
      pending,
    };
  }

  // ===================== getting rows in =====================

  async fetchFromGoogle(viewer?: RequestUser) {
    this.assertAccess(viewer);
    if (!this.google.isConfigured) {
      throw new BadRequestException('Google import is not set up on this server. Upload the exported CSV or Excel file instead.');
    }
    const table = await this.google.readSheet();
    return this.ingest(table, 'GOOGLE_SHEET', viewer);
  }

  async uploadFile(file: { buffer: Buffer; originalname: string; size: number } | undefined, viewer?: RequestUser) {
    this.assertAccess(viewer);
    if (!file) throw new BadRequestException('No file was uploaded.');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('The file is larger than 5MB.');
    const name = file.originalname.toLowerCase();
    let grid: { text: string[]; raw: (string | number | boolean | null)[] }[] = [];
    let header: string[] = [];

    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      const rows = parseCsv(file.buffer.toString('utf8'));
      header = rows[0] ?? [];
      grid = rows.slice(1).map((r) => ({ text: header.map((_, i) => r[i] ?? ''), raw: header.map((_, i) => r[i] ?? '') }));
    } else if (name.endsWith('.xlsx')) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(file.buffer as any);
      const ws = wb.worksheets[0];
      if (!ws) throw new BadRequestException('The Excel file has no sheets.');
      const cellText = (v: any): string => {
        if (v === null || v === undefined) return '';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'object') return s(v.text ?? v.hyperlink ?? v.result ?? (v.richText ? v.richText.map((t: any) => t.text).join('') : ''));
        return s(v);
      };
      const all: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const vals = (row.values as any[]).slice(1).map(cellText);
        if (vals.some((c) => c !== '')) all.push(vals);
      });
      header = all[0] ?? [];
      grid = all.slice(1).map((r) => ({ text: header.map((_, i) => r[i] ?? ''), raw: header.map((_, i) => r[i] ?? '') }));
    } else {
      throw new BadRequestException('Upload a .csv or .xlsx file (in Google Sheets: File → Download).');
    }
    if (header.length === 0) throw new BadRequestException('The file is empty.');
    return this.ingest({ header, rows: grid }, 'UPLOAD', viewer);
  }

  private columnMap(header: string[]) {
    const idx: Record<string, number> = {};
    const fileIdx: Record<string, number> = {};
    header.forEach((h, i) => {
      const n = norm(h);
      for (const [k, aliases] of Object.entries(FIELD_ALIASES)) if (idx[k] === undefined && aliases.includes(n)) idx[k] = i;
      for (const [k, f] of Object.entries(FILE_FIELDS)) if (fileIdx[k] === undefined && f.aliases.includes(n)) fileIdx[k] = i;
    });
    return { idx, fileIdx };
  }

  private async ingest(table: SheetTable, source: 'GOOGLE_SHEET' | 'UPLOAD', viewer?: RequestUser) {
    const { idx, fileIdx } = this.columnMap(table.header);
    if (idx.fullName === undefined || idx.email === undefined) {
      throw new BadRequestException(
        'The columns "Full name" and "Email address" were not found. Check that this is the onboarding form\'s response sheet.',
      );
    }
    const result = { rowsRead: table.rows.length, added: 0, alreadyReceived: 0, skippedBlank: 0, problems: [] as { row: number; message: string }[] };
    const googleReady = this.google.isConfigured;

    for (let n = 0; n < table.rows.length; n++) {
      const row = table.rows[n];
      const cell = (k: string) => (idx[k] === undefined ? '' : s(row.text[idx[k]]));
      const raw = (k: string) => (idx[k] === undefined ? null : row.raw[idx[k]]);
      const fullName = cell('fullName');
      const email = cell('email').toLowerCase();
      if (!fullName && !email) { result.skippedBlank++; continue; }

      try {
        const timestamp = idx.timestamp === undefined ? '' : String(row.raw[idx.timestamp] ?? row.text[idx.timestamp] ?? '');
        const sourceKey = timestamp
          ? `form:${timestamp}|${email}`
          : `row:${crypto.createHash('sha1').update(`${email}|${fullName}|${cell('dob')}|${cell('pan')}`).digest('hex')}`;

        const dup = await this.prisma.onboardingSubmission.findFirst({
          where: { OR: [{ sourceKey }, { email, status: { in: ['PENDING', 'IMPORTED'] } }] },
          select: { id: true },
        });
        if (dup) { result.alreadyReceived++; continue; }

        const names = splitName(fullName);
        const sameWords = /^(same|as above|same as current)/i;
        const permanent = cell('permanentAddress');
        const joining = toIsoDate(cell('joiningDate'), raw('joiningDate'));
        const payload: Payload = {
          fullName, firstName: names.firstName, lastName: names.lastName, email,
          mobile: normMobile(cell('mobile')), dob: toIsoDate(cell('dob'), raw('dob')),
          aadhaar: cell('aadhaar').replace(/[\s-]/g, ''), pan: cell('pan').toUpperCase().replace(/\s/g, ''),
          bankAccount: cell('bankAccount').replace(/[\s-]/g, ''), ifsc: cell('ifsc').toUpperCase().replace(/\s/g, ''),
          currentAddress: cell('currentAddress'), permanentAddress: sameWords.test(permanent) ? '' : permanent,
          qualification: cell('qualification'), institution: cell('institution'), yearOfPassing: cell('yearOfPassing'),
          emergencyName: cell('emergencyName'), emergencyPhone: normMobile(cell('emergencyPhone')), emergencyRelation: cell('emergencyRelation'),
          joiningDate: joining, consent: cell('consent').length > 0 && !/^(no|false|0)$/i.test(cell('consent')),
          timestamp: idx.timestamp === undefined ? '' : toIsoDate(row.text[idx.timestamp], row.raw[idx.timestamp]) || s(row.text[idx.timestamp]),
          hr: {
            empType: '', designation: '', department: '', workMode: '', reportingManagerId: '', joinDate: joining, engagementEndDate: '',
            isPaid: false, basic: '', hra: '', specialAllowance: '', username: '',
          },
        };

        const id = crypto.randomUUID();
        const files: FileEntry[] = [];
        for (const [field, def] of Object.entries(FILE_FIELDS)) {
          if (fileIdx[field] === undefined) continue;
          const link = s(row.text[fileIdx[field]]);
          if (!link) continue;
          const driveFileId = driveId(link);
          const entry: FileEntry = { field, label: def.label, kind: def.kind, driveId: driveFileId ?? undefined };
          if (!driveFileId) entry.error = 'The upload link could not be understood.';
          else if (!googleReady) entry.error = 'Google access is not set up, so the file could not be fetched — attach it from the employee profile after importing.';
          else await this.fetchFile(id, entry, driveFileId);
          files.push(entry);
        }

        await this.prisma.onboardingSubmission.create({
          data: {
            id, sourceKey, source, fullName, email: email || null,
            submittedAt: payload.timestamp && /^\d{4}-\d{2}-\d{2}$/.test(payload.timestamp) ? new Date(payload.timestamp) : null,
            payloadEnc: encryptField(JSON.stringify(payload)),
            files: files as any,
          },
        });
        result.added++;
      } catch (e: any) {
        this.logger.warn(`Row ${n + 2} could not be read: ${e.message}`);
        result.problems.push({ row: n + 2, message: e.message ?? 'Could not be read' });
      }
    }

    await this.audit.log({
      userId: viewer?.id, role: viewer?.role, action: 'FETCH_ONBOARDING_RESPONSES', actionType: 'CREATE', module: 'HR',
      entityType: 'OnboardingSubmission', description: `Received ${result.added} new onboarding response(s) from ${source === 'GOOGLE_SHEET' ? 'Google Forms' : 'an uploaded file'} (${result.alreadyReceived} already received)`,
    });
    return result;
  }

  private async fetchFile(submissionId: string, entry: FileEntry, fileId: string) {
    try {
      const f = await this.google.downloadFile(fileId);
      if (!ALLOWED_MIME.has(f.mime)) throw new Error(`"${f.name}" is a ${f.mime.split('/').pop()} file — only PDF, JPG and PNG are accepted.`);
      const dir = path.join(UPLOAD_DIR, submissionId);
      fs.mkdirSync(dir, { recursive: true });
      const ext = f.mime === 'application/pdf' ? '.pdf' : f.mime === 'image/png' ? '.png' : '.jpg';
      const storedName = `${entry.field}${ext}`;
      fs.writeFileSync(path.join(dir, storedName), f.buffer);
      Object.assign(entry, { fileName: f.name, mime: f.mime, size: f.size, storedName });
    } catch (e: any) {
      entry.error = e?.response?.message ?? e?.message ?? 'The file could not be downloaded.';
    }
  }

  // ===================== validating =====================

  private validate(p: Payload, files: FileEntry[], dupes: { field: string; label: string; employee: string }[]): Issue[] {
    const out: Issue[] = [];
    const err = (field: string, message: string) => out.push({ field, message, severity: 'error' });
    const warn = (field: string, message: string) => out.push({ field, message, severity: 'warning' });
    const check = (field: string, value: string, fn: (v: string) => string, label: string) => {
      if (!value) return;
      try { fn(value); } catch (e: any) { err(field, `${label}: ${e.response?.message ?? e.message}`); }
    };

    if (!p.firstName.trim()) err('firstName', 'A first name is required.');
    if (!p.email) err('email', 'An email address is required — the offer letter is sent there.');
    else check('email', p.email, normaliseEmail, 'Email');
    if (!p.consent) err('consent', 'Consent to store these details was not given on the form.');

    if (!p.dob) warn('dob', 'Date of birth is missing.');
    else {
      const age = (Date.now() - new Date(p.dob).getTime()) / (365.25 * 86400000);
      if (age < 15 || age > 80) warn('dob', `Date of birth (${formatDateDMY(new Date(p.dob))}) looks unusual — please check it.`);
    }
    if (!p.mobile) warn('mobile', 'Mobile number is missing.');
    else if (!/^\d{10}$/.test(p.mobile)) err('mobile', 'Mobile number must be 10 digits.');
    if (!p.aadhaar) warn('aadhaar', 'Aadhaar number is missing.'); else check('aadhaar', p.aadhaar, normaliseAadhaar, 'Aadhaar');
    if (!p.pan) warn('pan', 'PAN is missing — a payslip cannot be generated without it.'); else check('pan', p.pan, normalisePan, 'PAN');
    if (!p.bankAccount) warn('bankAccount', 'Bank account number is missing — needed for payslips.'); else check('bankAccount', p.bankAccount, normaliseBankAccount, 'Bank account');
    check('ifsc', p.ifsc, normaliseIfsc, 'IFSC');
    if (!p.currentAddress) warn('currentAddress', 'Current address is missing.');
    if (!p.qualification) warn('qualification', 'Highest qualification is missing.');
    if (p.yearOfPassing) {
      const y = Number(p.yearOfPassing);
      if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear() + 1) err('yearOfPassing', 'Year of passing is not a valid year.');
    }
    if (!p.emergencyName || !p.emergencyPhone) warn('emergencyName', 'Emergency contact is incomplete.');
    if (p.emergencyPhone && !/^\d{10}$/.test(p.emergencyPhone)) err('emergencyPhone', 'Emergency contact number must be 10 digits.');
    if (!p.joiningDate) warn('joiningDate', 'The joiner gave no expected joining date — set it below.');

    for (const [field, def] of Object.entries(FILE_FIELDS)) {
      const f = files.find((x) => x.field === field);
      if (!f) { if (def.expected) warn(`file:${field}`, `${def.label} was not uploaded.`); }
      else if (f.error) warn(`file:${field}`, `${def.label}: ${f.error}`);
    }

    // HR's own decisions — never asked of the joiner.
    const h = p.hr;
    if (!['FULL_TIME', 'PART_TIME', 'INTERN', 'CONTRACT'].includes(h.empType)) err('hr.empType', 'Choose the employment type (Intern, Part Time, Full Time…).');
    if (!h.designation.trim()) err('hr.designation', 'Enter the designation.');
    if (!h.department.trim()) err('hr.department', 'Enter the department.');
    if (!['ONSITE', 'REMOTE', 'HYBRID'].includes(h.workMode)) err('hr.workMode', 'Choose the work mode.');
    if (!h.joinDate || !toIsoDate(h.joinDate)) err('hr.joinDate', 'Set the date of joining.');
    if (h.engagementEndDate) {
      if (!toIsoDate(h.engagementEndDate)) err('hr.engagementEndDate', 'The end date is not a valid date.');
      else if (h.joinDate && h.engagementEndDate <= h.joinDate) err('hr.engagementEndDate', 'The end date must be after the joining date.');
    }
    if (h.empType === 'INTERN' && !h.engagementEndDate) warn('hr.engagementEndDate', 'No internship end date — the completion certificate cannot be issued without one.');
    if (h.isPaid) {
      const nums = [h.basic, h.hra, h.specialAllowance].filter((v) => v !== '');
      if (nums.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)) err('hr.basic', 'Pay amounts must be numbers of zero or more.');
      else if (!(Number(h.basic) > 0)) err('hr.basic', 'Enter a basic pay above zero, or mark the role as unpaid.');
    }
    if (h.username && !/^[a-zA-Z0-9._-]+$/.test(h.username)) err('hr.username', 'Username can only contain letters, numbers, dots, hyphens and underscores.');

    for (const d of dupes) err(`dup:${d.field}`, `${d.label} already belongs to ${d.employee}.`);
    return out;
  }

  private async existingIndex() {
    const emps = await this.prisma.employee.findMany({
      select: { id: true, firstName: true, lastName: true, empCode: true, personalEmail: true, contact: true, pan: true, aadhaarNumber: true },
    });
    const safeDecrypt = (v: string | null) => { try { return v ? decryptField(v) : ''; } catch { return ''; } };
    return emps.map((e) => ({
      label: `${`${e.firstName} ${e.lastName}`.trim()} (${e.empCode})`,
      email: (e.personalEmail ?? '').toLowerCase(),
      mobile: normMobile(e.contact ?? ''),
      pan: safeDecrypt(e.pan).toUpperCase(),
      aadhaar: safeDecrypt(e.aadhaarNumber).replace(/\D/g, ''),
    }));
  }

  private duplicates(p: Payload, index: Awaited<ReturnType<OnboardingImportService['existingIndex']>>) {
    const out: { field: string; label: string; employee: string }[] = [];
    for (const e of index) {
      if (p.email && e.email === p.email.toLowerCase()) out.push({ field: 'email', label: 'This email address', employee: e.label });
      if (p.pan && e.pan && e.pan === p.pan) out.push({ field: 'pan', label: 'This PAN', employee: e.label });
      if (p.aadhaar && e.aadhaar && e.aadhaar === p.aadhaar) out.push({ field: 'aadhaar', label: 'This Aadhaar number', employee: e.label });
    }
    return out;
  }

  private suggestUsername(p: Payload): string {
    const first = slug(p.firstName);
    const lastWord = slug(p.lastName.split(/\s+/).filter(Boolean).pop() ?? '');
    return [first, lastWord].filter(Boolean).join('.') || 'employee';
  }

  private async uniqueUsername(base: string, taken: Set<string>): Promise<string> {
    let candidate = base;
    for (let n = 2; n < 500; n++) {
      if (!taken.has(candidate) && !(await this.prisma.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
      candidate = `${base}${n}`;
    }
    return `${base}${crypto.randomInt(1000, 9999)}`;
  }

  // ===================== reading =====================

  private open(sub: { payloadEnc: string }): Payload {
    const p = JSON.parse(decryptField(sub.payloadEnc)) as Payload;
    const blankHr: Payload['hr'] = { empType: '', designation: '', department: '', workMode: '', reportingManagerId: '', joinDate: '', engagementEndDate: '', isPaid: false, basic: '', hra: '', specialAllowance: '', username: '' };
    p.hr = Object.assign({}, blankHr, p.hr);
    return p;
  }

  private publicFiles(files: any): Omit<FileEntry, 'storedName' | 'driveId'>[] {
    return (Array.isArray(files) ? (files as FileEntry[]) : []).map(({ storedName, driveId: _d, ...rest }) => ({ ...rest, ...(storedName ? { available: true } : {}) } as any));
  }

  async list(status: 'PENDING' | 'IMPORTED' | 'DISMISSED' | undefined, viewer?: RequestUser) {
    this.assertAccess(viewer);
    const subs = await this.prisma.onboardingSubmission.findMany({ where: { status: status ?? 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 500 });
    const index = status && status !== 'PENDING' ? [] : await this.existingIndex();
    return subs.map((sub) => {
      const p = this.open(sub);
      const files = (sub.files as unknown as FileEntry[]) ?? [];
      const issues = sub.status === 'PENDING' ? this.validate(p, files, this.duplicates(p, index)) : [];
      return {
        id: sub.id, status: sub.status, source: sub.source, fullName: sub.fullName, email: sub.email, submittedAt: sub.submittedAt, createdAt: sub.createdAt,
        employeeId: sub.employeeId, importedAt: sub.importedAt, dismissedReason: sub.dismissedReason,
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        files: files.filter((f) => f.storedName).length,
        hr: p.hr, joiningDate: p.joiningDate,
      };
    });
  }

  async get(id: string, viewer?: RequestUser) {
    this.assertAccess(viewer);
    const sub = await this.prisma.onboardingSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Submission not found');
    const p = this.open(sub);
    const files = (sub.files as unknown as FileEntry[]) ?? [];
    const issues = this.validate(p, files, sub.status === 'PENDING' ? this.duplicates(p, await this.existingIndex()) : []);
    return {
      id: sub.id, status: sub.status, source: sub.source, createdAt: sub.createdAt, employeeId: sub.employeeId,
      payload: p, files: this.publicFiles(sub.files), issues, suggestedUsername: this.suggestUsername(p),
    };
  }

  async resolveFile(id: string, field: string, viewer?: RequestUser) {
    this.assertAccess(viewer);
    const sub = await this.prisma.onboardingSubmission.findUnique({ where: { id } });
    const f = ((sub?.files as unknown as FileEntry[]) ?? []).find((x) => x.field === field);
    if (!sub || !f?.storedName) throw new NotFoundException('That file is not available.');
    const fullPath = path.join(UPLOAD_DIR, id, f.storedName);
    if (!fs.existsSync(fullPath)) throw new NotFoundException('The stored file is missing on disk.');
    return { fullPath, mime: f.mime ?? 'application/octet-stream', fileName: f.fileName ?? f.storedName };
  }

  // ===================== editing =====================

  async update(id: string, body: { payload?: Record<string, any>; hr?: Record<string, any> }, viewer?: RequestUser) {
    this.assertAccess(viewer);
    const sub = await this.prisma.onboardingSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.status !== 'PENDING') throw new BadRequestException('This submission has already been dealt with.');
    const p = this.open(sub);

    for (const k of EDITABLE_PAYLOAD) {
      if (!body.payload || !(k in body.payload)) continue;
      const v = body.payload[k];
      (p as any)[k] = k === 'consent' ? v === true : typeof v === 'string' ? v.trim() : s(v);
    }
    for (const k of EDITABLE_HR) {
      if (!body.hr || !(k in body.hr)) continue;
      const v = body.hr[k];
      (p.hr as any)[k] = k === 'isPaid' ? v === true : typeof v === 'string' ? v.trim() : s(v);
    }
    // Normalise the formats the form would have produced, so editing "12 34…" or "abcde1234f" still validates.
    p.aadhaar = p.aadhaar.replace(/[\s-]/g, '');
    p.pan = p.pan.toUpperCase().replace(/\s/g, '');
    p.bankAccount = p.bankAccount.replace(/[\s-]/g, '');
    p.ifsc = p.ifsc.toUpperCase().replace(/\s/g, '');
    p.mobile = normMobile(p.mobile);
    p.emergencyPhone = normMobile(p.emergencyPhone);
    p.email = p.email.toLowerCase();
    p.fullName = `${p.firstName} ${p.lastName}`.trim();

    await this.prisma.onboardingSubmission.update({
      where: { id },
      data: { payloadEnc: encryptField(JSON.stringify(p)), fullName: p.fullName || sub.fullName, email: p.email || null },
    });
    return this.get(id, viewer);
  }

  async dismiss(id: string, reason: string | undefined, viewer?: RequestUser) {
    this.assertAccess(viewer);
    const sub = await this.prisma.onboardingSubmission.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.status !== 'PENDING') throw new BadRequestException('This submission has already been dealt with.');
    await this.prisma.onboardingSubmission.update({ where: { id }, data: { status: 'DISMISSED', dismissedReason: reason?.trim() || null } });
    fs.rmSync(path.join(UPLOAD_DIR, id), { recursive: true, force: true });
    await this.audit.log({
      userId: viewer?.id, role: viewer?.role, action: 'DISMISS_ONBOARDING', actionType: 'UPDATE', module: 'HR',
      entityType: 'OnboardingSubmission', entityId: id, targetLabel: sub.fullName,
      description: `Dismissed the onboarding response from ${sub.fullName}${reason ? `. Reason: ${reason}` : ''}`,
    });
    return { id, status: 'DISMISSED' };
  }

  // ===================== creating the employees =====================

  /**
   * Creates one employee per selected submission. Each is independent: a row
   * that fails validation (or collides with someone) is reported and skipped,
   * and never stops the others.
   */
  async importMany(ids: string[], viewer?: RequestUser) {
    this.assertAccess(viewer);
    if (!Array.isArray(ids) || ids.length === 0) throw new BadRequestException('Choose at least one person to add.');

    const index = await this.existingIndex();
    const takenUsernames = new Set<string>();
    const results: any[] = [];

    for (const id of Array.from(new Set(ids))) {
      const sub = await this.prisma.onboardingSubmission.findUnique({ where: { id } });
      if (!sub) { results.push({ id, ok: false, name: '(unknown)', error: 'Submission not found.' }); continue; }
      const name = sub.fullName;
      if (sub.status !== 'PENDING') { results.push({ id, ok: false, name, error: 'Already dealt with.' }); continue; }

      const p = this.open(sub);
      const files = (sub.files as unknown as FileEntry[]) ?? [];
      // Problems with the person's own details (duplicates, bad numbers) are the ones worth reading first;
      // HR's own to-do items (type, designation…) go last.
      const errors = this.validate(p, files, this.duplicates(p, index))
        .filter((i) => i.severity === 'error')
        .sort((a, b) => Number(a.field.startsWith('hr.')) - Number(b.field.startsWith('hr.')));
      if (errors.length > 0) {
        results.push({ id, ok: false, name, error: errors.slice(0, 3).map((e) => e.message).join(' ') + (errors.length > 3 ? ` (+${errors.length - 3} more)` : '') });
        continue;
      }

      // Claim the submission first, atomically, so two clicks (or two HR users) can never both create this person.
      const claimed = await this.prisma.onboardingSubmission.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'IMPORTED', importedAt: new Date(), importedByName: viewer?.email ?? null },
      });
      if (claimed.count === 0) { results.push({ id, ok: false, name, error: 'Already being added by someone else.' }); continue; }

      try {
        const username = p.hr.username
          ? p.hr.username
          : await this.uniqueUsername(this.suggestUsername(p), takenUsernames);
        takenUsernames.add(username);
        const password = tempPassword();

        const pay = p.hr.isPaid ? Number(p.hr.basic) + Number(p.hr.hra || 0) + Number(p.hr.specialAllowance || 0) : null;
        const perm = p.permanentAddress.trim();
        const created: any = await this.hrm.createEmployee(
          {
            firstName: p.firstName, lastName: p.lastName, personalEmail: p.email, contact: p.mobile || undefined, dob: p.dob || undefined,
            pan: p.pan || undefined, aadhaarNumber: p.aadhaar || undefined, bankAccountNo: p.bankAccount || undefined, bankIfsc: p.ifsc || undefined,
            address: p.currentAddress || undefined,
            sameAsCurrentAddress: !perm, permanentAddress: perm || undefined,
            highestQualification: p.qualification || undefined, institutionName: p.institution || undefined, yearOfPassing: p.yearOfPassing || undefined,
            emergencyContactName: p.emergencyName || undefined, emergencyContactPhone: p.emergencyPhone || undefined, emergencyContactRelation: p.emergencyRelation || undefined,
            empType: p.hr.empType, department: p.hr.department, designation: p.hr.designation, workMode: p.hr.workMode,
            reportingManagerId: p.hr.reportingManagerId || undefined, joinDate: p.hr.joinDate, engagementEndDate: p.hr.engagementEndDate || undefined,
            hasStipend: p.hr.isPaid, stipendAmount: pay,
            username, password, roleName: 'EMPLOYEE',
          },
          viewer,
        );

        // Record who this became straight away, so a later hiccup can never put a created person back in the queue.
        await this.prisma.onboardingSubmission.update({ where: { id }, data: { employeeId: created.id } });

        // A generated password is only ever temporary.
        await this.prisma.user.update({ where: { id: created.userId }, data: { mustChangePassword: true } });
        const attachNotes = await this.attachFiles(sub.id, created.id, files, viewer);

        fs.rmSync(path.join(UPLOAD_DIR, id), { recursive: true, force: true });

        results.push({
          id, ok: true, name, employeeId: created.id, empCode: created.empCode, username, tempPassword: password,
          email: p.email, empType: p.hr.empType, designation: p.hr.designation, joinDate: p.hr.joinDate,
          letter: { pending: !!created.offerLetter?.pending, emailed: !!created.offerLetter?.emailed, error: created.offerLetter?.error ?? null },
          notes: attachNotes,
        });
      } catch (e: any) {
        this.logger.warn(`Could not add ${name}: ${e.message}`);
        // Nothing was created, so put the submission back where HR can fix it.
        await this.prisma.onboardingSubmission.updateMany({ where: { id, employeeId: null }, data: { status: 'PENDING', importedAt: null, importedByName: null } });
        results.push({ id, ok: false, name, error: e?.response?.message ?? e?.message ?? 'Could not be added.' });
      }
    }

    const created = results.filter((r) => r.ok).length;
    await this.audit.log({
      userId: viewer?.id, role: viewer?.role, action: 'BULK_ONBOARD', actionType: 'CREATE', module: 'HR',
      entityType: 'Employee', description: `Added ${created} of ${results.length} new joiner(s) through bulk onboarding`,
      details: { created, failed: results.length - created, names: results.filter((r) => r.ok).map((r) => r.name) },
    });
    return { created, failed: results.length - created, results };
  }

  private async attachFiles(submissionId: string, employeeId: string, files: FileEntry[], viewer?: RequestUser): Promise<string[]> {
    const notes: string[] = [];
    for (const f of files) {
      if (!f.storedName || f.error) continue;
      try {
        const buffer = fs.readFileSync(path.join(UPLOAD_DIR, submissionId, f.storedName));
        const file = { buffer, originalname: f.fileName ?? f.storedName, mimetype: f.mime ?? 'application/pdf', size: buffer.length };
        await this.docs.upload(employeeId, f.kind, file, viewer);
        if (f.kind === 'PROFILE_PHOTO' && (f.mime === 'image/jpeg' || f.mime === 'image/png')) {
          await this.hrm.setAvatar(employeeId, { buffer, mimetype: f.mime, size: buffer.length });
        }
      } catch (e: any) {
        notes.push(`${f.label} could not be attached: ${e?.response?.message ?? e.message}`);
      }
    }
    return notes;
  }
}
