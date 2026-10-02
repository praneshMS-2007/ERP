import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export interface SheetTable {
  header: string[];
  /** One entry per response row. `text` is what Sheets displays; `raw` is the underlying value (dates as serial numbers). */
  rows: { text: string[]; raw: (string | number | boolean | null)[] }[];
  /** The spreadsheet's own time zone (e.g. "Asia/Kolkata"); form timestamps are wall-clock times in it. */
  timeZone?: string;
}

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

/**
 * Reads the onboarding Google Form's response sheet, and the files joiners
 * uploaded to it, through a Google *service account* — a robot login the
 * sheet and Drive folder have been shared with. It works from any host (local,
 * GCP, anywhere) because all it needs is internet access and the key.
 *
 * Configuration, all optional so a server without Google simply hides the
 * "Fetch new responses" button and keeps the CSV/Excel upload:
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE   path to the downloaded JSON key, or
 *   GOOGLE_SERVICE_ACCOUNT_JSON       the key itself (raw JSON or base64) — for
 *                                     hosts that inject secrets as env vars
 *   GOOGLE_ONBOARDING_SHEET_ID        the id in the response sheet's URL
 *   GOOGLE_ONBOARDING_SHEET_TAB       tab name (default: the first tab)
 *
 * Deliberately no `googleapis` dependency: signing one JWT and calling two REST
 * endpoints needs only Node's own crypto and fetch.
 */
@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private cachedToken: { value: string; expiresAt: number } | null = null;

  private loadKey(): ServiceAccountKey | null {
    try {
      const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
      let raw: string | null = null;
      if (inline) raw = inline.startsWith('{') ? inline : Buffer.from(inline, 'base64').toString('utf8');
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
        const p = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
        if (fs.existsSync(p)) raw = fs.readFileSync(p, 'utf8');
      }
      if (!raw) return null;
      const key = JSON.parse(raw);
      return key.client_email && key.private_key ? key : null;
    } catch (e: any) {
      this.logger.error(`Google service-account key could not be read: ${e.message}`);
      return null;
    }
  }

  get sheetId(): string | null {
    return process.env.GOOGLE_ONBOARDING_SHEET_ID?.trim() || null;
  }

  get isConfigured(): boolean {
    return !!this.loadKey() && !!this.sheetId;
  }

  /** What the UI may show about the setup — never the key itself. */
  describe() {
    const key = this.loadKey();
    return { configured: !!key && !!this.sheetId, robotEmail: key?.client_email ?? null, hasKey: !!key, hasSheet: !!this.sheetId };
  }

  private async token(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) return this.cachedToken.value;
    const key = this.loadKey();
    if (!key) throw new BadRequestException('Google access is not set up on this server.');

    const now = Math.floor(Date.now() / 1000);
    const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = enc({ alg: 'RS256', typ: 'JWT' });
    const claim = enc({ iss: key.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 });
    const signature = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key).toString('base64url');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${signature}` }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!body.access_token) {
      this.logger.error(`Google sign-in failed: ${body.error} ${body.error_description ?? ''}`);
      throw new BadRequestException('Google refused the sign-in. Check that the service-account key is valid and has not been deleted.');
    }
    this.cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3000) * 1000 };
    return body.access_token;
  }

  private async get(url: string): Promise<Response> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await this.token()}` } });
    if (res.status === 401) this.cachedToken = null;
    return res;
  }

  /** The whole response tab: formatted text, plus raw values so dates are unambiguous. */
  async readSheet(): Promise<SheetTable> {
    const id = this.sheetId;
    if (!id) throw new BadRequestException('No response sheet is configured (GOOGLE_ONBOARDING_SHEET_ID).');

    const meta = await this.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=properties.timeZone,sheets.properties.title`);
    await this.assertOk(meta, 'open the response sheet');
    const info: any = await meta.json();
    const timeZone: string | undefined = info.properties?.timeZone || undefined;
    let tab = process.env.GOOGLE_ONBOARDING_SHEET_TAB?.trim();
    if (!tab) {
      tab = info.sheets?.[0]?.properties?.title;
      if (!tab) throw new BadRequestException('The response sheet has no tabs.');
    }
    const range = encodeURIComponent(tab);
    const [textRes, rawRes] = await Promise.all([
      this.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueRenderOption=FORMATTED_VALUE`),
      this.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`),
    ]);
    await this.assertOk(textRes, 'read the response sheet');
    await this.assertOk(rawRes, 'read the response sheet');
    const text: string[][] = ((await textRes.json()) as any).values ?? [];
    const raw: any[][] = ((await rawRes.json()) as any).values ?? [];
    if (text.length === 0) return { header: [], rows: [], timeZone };

    const width = text[0].length;
    const pad = <T,>(row: T[] | undefined, fill: T): T[] => Array.from({ length: width }, (_, i) => (row && row[i] !== undefined ? row[i] : fill));
    return {
      header: text[0],
      rows: text.slice(1).map((r, i) => ({ text: pad<string>(r, ''), raw: pad<any>(raw[i + 1], null) })),
      timeZone,
    };
  }

  /** Downloads a file a joiner uploaded to the form. */
  async downloadFile(fileId: string): Promise<{ buffer: Buffer; mime: string; name: string; size: number }> {
    const metaRes = await this.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=name,mimeType,size&supportsAllDrives=true`);
    await this.assertOk(metaRes, 'open the uploaded file');
    const meta: any = await metaRes.json();
    const size = Number(meta.size ?? 0);
    if (size > 10 * 1024 * 1024) throw new BadRequestException('File is larger than the 10MB limit.');
    if (String(meta.mimeType).startsWith('application/vnd.google-apps')) {
      throw new BadRequestException('This is a Google Docs file, not an uploaded PDF or image.');
    }
    const dl = await this.get(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
    await this.assertOk(dl, 'download the uploaded file');
    return { buffer: Buffer.from(await dl.arrayBuffer()), mime: meta.mimeType, name: meta.name, size };
  }

  private async assertOk(res: Response, doing: string) {
    if (res.ok) return;
    const body: any = await res.json().catch(() => ({}));
    const why = body?.error?.message ?? res.statusText;
    this.logger.warn(`Google: could not ${doing} (${res.status}): ${why}`);
    if (res.status === 403 || res.status === 404) {
      const robot = this.loadKey()?.client_email;
      throw new BadRequestException(
        `Google would not let the ERP ${doing}. Make sure the sheet and the upload folder are shared with ${robot ?? 'the service account'} (Viewer is enough).`,
      );
    }
    throw new BadRequestException(`Google error while trying to ${doing}: ${why}`);
  }
}
