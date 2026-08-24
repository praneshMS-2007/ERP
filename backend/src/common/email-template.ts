import * as path from 'path';

/**
 * Shared branded shell for every outbound HTML email (payslip, offer
 * letters). Table-based layout with inline styles throughout — the only
 * way to get consistent rendering across Outlook (which strips <style>
 * blocks and ignores flex/grid), Gmail, and Apple Mail. Keep this the
 * single source of the brand wrapper so every auto-mail looks like it
 * came from the same company, not a patchwork of one-off templates.
 */

export const EMAIL_BRAND = {
  darkBlue: '#1a2744',
  accentBlue: '#2b4d8a',
  headerBg: '#4a86c8',
  lightBlue: '#eef3fa',
  border: '#d7dee8',
  text: '#1f2530',
  muted: '#66707f',
};

export const LOGO_CID = 'shuroq-logo';

// process.cwd(), not __dirname — nest build's dist/ doesn't copy the
// assets/ folder alongside compiled JS, so an __dirname-relative path
// resolves to a nonexistent dist/assets/brand once running from dist
// (which is what `npm run start:dev` actually spawns — see the sibling
// bug this shares with payslip.service.ts / offer-letter.service.ts's
// own ASSETS_DIR, same fix applied there). process.cwd() is stable
// across both ts-node (src) and compiled (dist) execution because either
// way the process is launched from the backend/ directory.
const ASSETS_DIR = path.join(process.cwd(), 'assets', 'brand');
export const LOGO_ASSET_PATH = path.join(ASSETS_DIR, 'shuroq-logo.png');

/** Attach alongside the PDF so `<img src="cid:shuroq-logo">` resolves. */
export function logoAttachment(): { filename: string; path: string; cid: string } {
  return { filename: 'shuroq-logo.png', path: LOGO_ASSET_PATH, cid: LOGO_CID };
}

/**
 * A plain covering note for a mail whose real payload is its PDF attachment.
 *
 * Every document auto-mail in this app (payslip, offer letters, internship
 * completion certificate) uses this instead of `emailShell`. Deliberately:
 *   - no inline images, no `cid:` attachments, no logo, no branded frame;
 *   - the document is NOT restated in the body.
 *
 * Earlier versions re-rendered each document inline in HTML beside the
 * attachment, so recipients got the same thing twice — once as a picture they
 * could not use, once as the real file. The payslip version also spilled PAN
 * and bank-account numbers into the mail body, where the PDF alone was the
 * right place for them. Keep these notes short and image-free; if a document's
 * design changes, only its PDF generator should need touching.
 */
export function coverNoteHtml(paragraphs: string[]): string {
  const font = 'font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2530;';
  const body = paragraphs
    .map((p, i) => `  <p style="${font} margin: 0 0 ${i === paragraphs.length - 1 ? '0' : '12px'} 0;">${p}</p>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0; padding:16px; background:#ffffff;">
${body}
</body></html>`;
}

/**
 * Wraps `bodyHtml` in the branded header/footer shell. `bodyHtml` is
 * expected to already be a sequence of <table>/<tr> rows (email HTML
 * doesn't reliably support block-level divs with margins), not a div.
 */
export function emailShell(opts: { previewText?: string; bodyHtml: string }): string {
  const { previewText = '', bodyHtml } = opts;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Shuroq</title>
<!--[if mso]>
<style type="text/css">
  table { border-collapse: collapse; }
  body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style>
  body { margin: 0; padding: 0; background-color: #f2f4f8; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; }
  a { color: ${EMAIL_BRAND.accentBlue}; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .stack-col { display: block !important; width: 100% !important; padding-right: 0 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f2f4f8;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f8;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid ${EMAIL_BRAND.border}; border-radius:8px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding: 28px 24px 18px 24px; border-bottom: 1px solid ${EMAIL_BRAND.border};">
              <img src="cid:${LOGO_CID}" width="150" alt="Shuroq" style="width:150px; max-width:60%; height:auto;" />
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 28px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid ${EMAIL_BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; line-height: 1.6; color: ${EMAIL_BRAND.muted};">
                    Shuroq &middot; Hyderabad, Telangana, India<br />
                    <a href="mailto:hr-team@shuroq.com" style="color:${EMAIL_BRAND.muted}; text-decoration: underline;">hr-team@shuroq.com</a>
                    &middot;
                    <a href="https://www.shuroq.com" style="color:${EMAIL_BRAND.muted}; text-decoration: underline;">www.shuroq.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
