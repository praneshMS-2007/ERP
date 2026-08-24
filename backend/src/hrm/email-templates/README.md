# Auto-mail HTML templates — reference copies

These `.template.html` files are **not executed at runtime**. The live
versions are compiled in code and sent via nodemailer/Gmail SMTP
(`backend/src/common/mailer.service.ts`):

| Template | Live implementation | Trigger |
|---|---|---|
| `payslip-email.template.html` | `backend/src/hrm/payslip.service.ts` → `buildEmailHtml()` | Automatically, the instant Finance marks a `Payroll` record `PAID` (`HrmService.updatePayrollStatus`) |
| `offer-letter-fulltime-email.template.html` | `backend/src/hrm/offer-letter.service.ts` → `buildOfferLetterEmailHtml()`, `empType` branch `FULL_TIME`/`CONTRACT` | Automatically, the instant a new employee is created with that employment type (`HrmService.createEmployee`) |
| `offer-letter-parttime-email.template.html` | same file, `empType` branch `PART_TIME` | same trigger |
| `offer-letter-internship-email.template.html` | same file, `empType` branch `INTERN` | **Not currently wired** — see caveat below |
| `internship-completion-certificate.html` | `backend/src/hrm/internship-certificate.service.ts` → `buildCertificateEmailHtml()` | HR/Admin clicking **Approve & Send** on the Internship Certificates page, only once the internship's real end date has passed (`InternshipCertificateService.approveAndSend`) |

## Every document mail sends the PDF and nothing else

All five mails above follow one rule: **one attachment — the PDF — plus a
short plain covering note.** No inline images, no `cid:` attachments, no
logo, and *not* the branded `emailShell` wrapper.

The shared note builder is `coverNoteHtml()` in
`backend/src/common/email-template.ts`. Each service passes it a few
paragraphs; that is the whole body.

Earlier versions wrapped every mail in `emailShell` and re-rendered the
document inline in HTML beside the attachment, so recipients received the
same thing twice — once as a picture they could not use, once as the real
file. The payslip version additionally printed the employee's **PAN and bank
account number** into the mail body, where the PDF alone was the right place
for them. Do not reintroduce any of that: if a document's design changes,
only its PDF generator should need touching.

`emailShell()` and `logoAttachment()` still exist in `email-template.ts` and
are still exported, but no document mail uses them any more.

## ⚠️ Internship caveat

The internship template above matches the **clean, numbered-clause offer
letter** style (the sample you provided — Pala Iova Kishore's "Full Stack
Developer Intern OFFER LETTER"). But the live PDF-generation routing in
`offer-letter.service.ts` currently sends every `INTERN`-type employee a
**different document** at onboarding: a branded "internship confirmation
letter" (blue diagonal stripes, company seal, bullet-point sections —
matching a separate WhatsApp-style reference, not the sample you gave me).

Because the email body and the PDF attachment must describe the same
document, `buildOfferLetterEmailHtml`'s `INTERN` branch exists and is
fully built, but `issueAndSend` does **not** call it yet — interns still
get the original short 3-line note alongside their branded confirmation
letter PDF. Wiring the internship template into live sends means one of:

1. Also switch interns' PDF to the clean offer-letter style (matching the
   sample you gave me), and use this template for the email body — the
   two would then agree with each other, or
2. Keep the branded confirmation letter as-is, and instead write a
   *different* HTML email body matching *that* document's actual bullet
   structure, or
3. Treat these as two sequential documents (an offer letter now, sent
   with this template, and a separate confirmation letter later at
   internship completion) — which is what the "OFFER LETTER" vs
   "CONFIRMATION LETTER" naming in the code's own doc comments implies
   was originally intended, but isn't how `createEmployee` actually
   calls it today.

None of these were picked unilaterally — flagging it rather than guessing.

## Dynamic variables

### Payslip (`payslip-email.template.html`)

| Variable | Source | Notes |
|---|---|---|
| `{{EMPLOYEE_FIRST_NAME}}` | `Employee.firstName` | |
| `{{EMPLOYEE_NAME}}` | `Employee.firstName + lastName`, uppercased | |
| `{{DATE_OF_JOINING}}` | `Employee.joinDate` | Formatted `M/D/YYYY` |
| `{{ROLE}}` | `Employee.designation.title` | |
| `{{EMPLOYEE_ID}}` | `Employee.empCode` | |
| `{{PAN_NUMBER}}` | `Employee.pan`, decrypted | AES-256-GCM at rest — see `field-encryption.ts` |
| `{{BANK_ACCOUNT_NO}}` | `Employee.bankAccountNo` | Stored plaintext (not a government ID field) |
| `{{PAY_PERIOD}}` / `{{PAY_PERIOD_UPPERCASE}}` | `Payroll.payPeriod` | |
| `{{BASIC_SALARY}}`, `{{HRA}}`, `{{SPECIAL_ALLOWANCE}}`, `{{BONUS}}` | `Payroll.baseSalary/hra/specialAllowance/bonus` | Formatted `Rs. N,NN,NNN` |
| `{{TDS}}`, `{{PROVIDENT_FUND}}`, `{{PROFESSIONAL_TAX}}`, `{{LOSS_OF_PAY}}` | `Payroll.tds/providentFund/professionalTax/lossOfPay` | Same formatting |
| `{{GROSS_TOTAL}}` | computed: basic+hra+specialAllowance+bonus | |
| `{{TOTAL_DEDUCTIONS}}` | computed: tds+providentFund+professionalTax+lossOfPay | |
| `{{NET_PAY_FORMATTED}}` | `Payroll.netPay` | |
| `{{NET_PAY_IN_WORDS}}` | computed from `Payroll.netPay` | Indian-numbering word conversion (lakh/crore) — `numberToWords()` in `payslip.service.ts` |
| `{{TOTAL_DAYS_IN_MONTH}}`, `{{EFFECTIVE_WORK_DAYS}}`, `{{LEAVES_TAKEN}}` | `Payroll.totalDaysInMonth/effectiveWorkDays/leavesTaken` | |
| `{{HR_SUPPORT_EMAIL}}` | constant | `hr-team@shuroq.com` |

**Gate:** nothing is sent (no PDF, no email) unless `Employee.personalEmail`,
`Employee.pan`, and `Employee.bankAccountNo` are all on file — matches the
pre-existing warning already shown in the Employee Detail modal.

### Offer letters (all three templates)

| Variable | Source | Notes |
|---|---|---|
| `{{CANDIDATE_FIRST_NAME}}` | `Employee.firstName` | |
| `{{CANDIDATE_NAME}}` | `Employee.firstName + lastName` | |
| `{{ROLE_TITLE}}` / `{{ROLE_TITLE_UPPERCASE}}` | `Employee.designation.title` (falls back to `"Employee"`) | |
| `{{DEPARTMENT}}` | `Employee.department.name` (full-time only) | |
| `{{LETTER_DATE}}` | today's date at send time | Formatted `M/D/YYYY` |
| `{{START_DATE}}` | `Employee.joinDate` | Formatted `M/D/YYYY` |
| `{{END_DATE}}` | `Employee.engagementEndDate` (internship only) | Line omitted entirely if null |
| `{{WORK_MODE}}` | `Employee.workMode` (full-time only) | Falls back to `"Remote"` |
| `{{COMPENSATION_LINE}}` | computed from the employee's active `SalaryStructure` (`basic+hra+specialAllowance`) | Two variants depending on whether a salary structure exists yet — see `buildOfferLetterEmailHtml` |
| `{{STIPEND_LINE}}` | same salary lookup (internship only) | "Unpaid" variant if no stipend on file |
| `{{SUPPORT_CONTACT_LINE}}` | `CompanyPolicy` key `support_contact_phone`, else falls back to the HR email alone | Deliberately never fabricated — see `getSupportContactLine()` |

**Gate:** nothing is sent unless `Employee.personalEmail` is on file.

### Internship Completion Certificate (`internship-completion-certificate.html`)

The mail is a **covering note only** — the certificate is the attached PDF and
is not reproduced in the body. Two variable sets are therefore in play: the
handful the mail body actually interpolates, and the ones that only reach the
PDF.

**Used by the mail body:**

| Variable | Source | Notes |
|---|---|---|
| `{{CANDIDATE_FIRST_NAME}}` | `Employee.firstName` | Greeting |
| `{{SUPPORT_CONTACT_LINE}}` | `CompanyPolicy` key `support_contact_phone`, else the HR email alone | Same helper as the offer letters |

**PDF only** (`renderCompletionCertificate`) — these no longer appear anywhere
in the email body:

| Variable | Source | Notes |
|---|---|---|
| `{{CANDIDATE_NAME}}` | `Employee.firstName + lastName` | Also used for the attachment filename |
| `{{ROLE_TITLE}}` | `Employee.designation.title` (falls back to `"Intern"`) | |
| `{{START_DATE}}` | `Employee.joinDate` | Formatted `DD-MM-YYYY` |
| `{{END_DATE}}` | `Employee.engagementEndDate` | Formatted `DD-MM-YYYY`; this is also the field that gates the whole send — see below |

**Gate:** refuses to run unless `Employee.personalEmail` is set, `Employee.engagementEndDate` is set, and `engagementEndDate` is on or before today — approving early is rejected with the real end date in the error message (`InternshipCertificateService.approveAndSend`). A record already `APPROVED` can't be re-issued.

**The mail carries the PDF and nothing else** — see the rule at the top of
this file, which now applies to every document mail here.

**Font note:** the mail body is plain Arial text. All certificate typography (Bodoni MT for the title and name, Century Gothic for body copy) is embedded in the PDF, so it renders identically everywhere and does not depend on the recipient's mail client.

## PDF certificate — how it is laid out

The attached PDF (`InternshipCertificateService.renderCompletionCertificate`) is
built to the sample image's own measurements: the reference is 1280×904px, so
every constant in the `L` layout table is that pixel position × `841.89/1280`
on an A4-landscape page (aspect 1.4143 vs the sample's 1.4159).

- **Text is positioned by baseline, never by cap height.** The bundled Windows
  faces used here report `capHeight` as `NaN` (their OS/2 tables predate the
  field), so any cap-height maths would silently produce `NaN` offsets.
- **Embedded fonts** live in `backend/assets/fonts/`: `certificate-serif*.ttf`
  (Bodoni MT — title and candidate name) and `certificate-body*.ttf`
  (Century Gothic — all body copy). These are Microsoft-bundled faces copied
  from `C:\Windows\Fonts`; fine for local/internal use, but they need
  replacing with licensed or open equivalents before the app is distributed or
  deployed to a non-Windows host.
- **The sample's own title box sits ~16pt right of page centre** (both title
  lines centre on x=664 of 1280, not 640). The generator centres the title
  properly instead of copying that offset.
- **The description paragraph's three-line break is hard-coded**, matching the
  sample exactly. It is fixed copy set in a fixed font, so it cannot re-wrap.

### Brand assets — use the `*-clean.png` files

The original `company-seal.png` / `msme-logo.png` / `authorized-signature.png`
are unusable crops. Measured with PIL: the seal's ink touches the right **and**
bottom edges, MSME's touches the right edge, and ~25% of each file is a blue
diagonal wedge bled in from whatever page they were captured from. The
signature additionally bakes in its own rule line and "Authorized Signature"
caption, which double-printed against the caption this template draws, and its
crop cut the ascending loops off the top of the stroke.

The `*-clean.png` files were cut from the approved certificate design instead,
so every mark is complete — the full circular seal including its
`UDYAM-TS-20-0193233` registration arc, the MSME mark with an uncropped Ashoka
emblem, and the signature's whole stroke.

| Asset | Source crop (in the 1280×904 design) | Placed at (pt) |
|---|---|---|
| `company-seal-clean.png` | (775, 623)–(950, 795), masked to the circle | x 509.74, y 409.76, w 115.10 |
| `msme-logo-clean.png` | (977, 615)–(1148, 800) | x 642.60, y 404.50, w 112.47 |
| `authorized-signature-clean.png` | (250, 610)–(412, 745) | x 164.43, y 401.21, w 106.55 |

They are cut at the design's own resolution (~172px for the seal) — fine on
screen, soft in print. Replace with vector or high-DPI originals before
sending these to a commercial printer.

`offer-letter.service.ts` still points at the three **broken** originals, but
only inside `renderInternConfirmationLetter`, which the `empType` dispatch no
longer calls — so no document that actually ships is affected. Repoint it at
the clean files if that template is ever revived.

## Shared / non-content elements

None. Since every document mail became a plain covering note, there is no
longer a shared logo image, header, or footer block — the mails carry only
text and their one PDF. The company address/email/website appear inside the
generated PDFs, not in the mail bodies.
