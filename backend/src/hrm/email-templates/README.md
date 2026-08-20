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

Both live implementations wrap their body HTML in the shared branded
shell at `backend/src/common/email-template.ts` (`emailShell`) — that's
where the outer header/footer/logo markup common to every template lives.
The Shuroq logo is sent as an inline `cid:` attachment (`logoAttachment()`
in that same file), not a data URI, because several mail clients
(notably Outlook desktop) strip `data:` image sources from inbound HTML.

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

## Shared / non-content variables (every template)

| Variable | Notes |
|---|---|
| Logo image | `cid:shuroq-logo`, attached from `backend/assets/brand/shuroq-logo.png` |
| Footer address/email/website | Hardcoded company constants, not per-recipient |
