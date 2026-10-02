'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X, ArrowRight, ArrowLeft, Briefcase, CalendarCheck, Star, ListChecks, Clock, CheckCircle2,
  AlertCircle, Mail, Download, IndianRupee, UserCheck, Sparkles,
} from 'lucide-react';
import { hrmApi } from '../../services/api';

interface Props {
  employeeId: string | null;
  onClose: () => void;
  onConverted: () => void;
}

type Step = 'form' | 'confirm' | 'done';

const TYPE_LABEL: Record<string, string> = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', INTERN: 'Intern', CONTRACT: 'Contract' };
const MODE_LABEL: Record<string, string> = { ONSITE: 'Onsite', REMOTE: 'Remote', HYBRID: 'Hybrid' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Active', PROBATION: 'Probation', ON_LEAVE: 'On Leave' };

function fmtDate(v: any): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (v: string) => (v === '' ? 0 : Number(v));

export default function InternConversionModal({ employeeId, onClose, onConverted }: Props) {
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!employeeId) return;
    setStep('form');
    setResult(null);
    setError(null);
    setLoading(true);
    Promise.all([hrmApi.getConversionDraft(employeeId), hrmApi.getEmployees()])
      .then(([d, emps]) => {
        setDraft(d);
        setManagers((Array.isArray(emps) ? emps : []).filter((e: any) => e.id !== employeeId && e.status !== 'INACTIVE'));
        const p = d.proposed;
        setForm({
          firstName: d.employee.firstName ?? '',
          lastName: d.employee.lastName ?? '',
          personalEmail: d.employee.personalEmail ?? '',
          contact: d.employee.contact ?? '',
          empType: p.empType,
          designation: p.designation ?? '',
          department: p.department ?? '',
          workMode: p.workMode,
          reportingManagerId: p.reportingManagerId ?? '',
          effectiveDate: p.effectiveDate,
          startStatus: p.startStatus,
          engagementEndDate: '',
          isPaid: !!p.isPaid,
          basic: p.basic != null ? String(p.basic) : '',
          hra: p.hra ? String(p.hra) : '',
          specialAllowance: p.specialAllowance ? String(p.specialAllowance) : '',
          note: '',
        });
      })
      .catch((e) => setError(e.message || 'Could not load this intern.'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const gross = form.isPaid ? num(form.basic) + num(form.hra) + num(form.specialAllowance) : 0;
  const emp = draft?.employee;
  const previousPay = emp && emp.hasStipend && emp.stipendAmount ? emp.stipendAmount : 0;
  const managerName = (id: string) => {
    const m = managers.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}`.trim() : '—';
  };
  const departments = useMemo(
    () => Array.from(new Set(managers.map((m) => m.department?.name).filter(Boolean))).sort(),
    [managers],
  );

  /** Mirrors the server's checks so mistakes surface before the confirm screen. */
  function validate(): string | null {
    if (!form.firstName?.trim()) return 'First name is required.';
    if (!form.personalEmail?.trim()) return 'An email address is required — the offer letter is sent there.';
    if (!form.designation?.trim()) return 'Enter the designation for the new role.';
    if (!form.department?.trim()) return 'Enter the department.';
    if (!form.effectiveDate) return 'Choose the start date of the new role.';
    const internEnd = draft?.internship?.endDate ? String(draft.internship.endDate).slice(0, 10) : null;
    if (internEnd && form.effectiveDate < internEnd) return `The new role can't start before the internship ends (${fmtDate(draft.internship.endDate)}).`;
    if (form.empType === 'PART_TIME' && form.engagementEndDate && form.engagementEndDate <= form.effectiveDate) {
      return 'The contract end date must be after the start date.';
    }
    if (form.isPaid && !(num(form.basic) > 0)) return 'Enter a basic pay greater than zero, or mark the role as unpaid.';
    if ([form.basic, form.hra, form.specialAllowance].some((v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) {
      return 'Pay amounts must be numbers of zero or more.';
    }
    return null;
  }

  function goConfirm() {
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError(null);
    setStep('confirm');
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await hrmApi.convertIntern(employeeId!, {
        ...form,
        reportingManagerId: form.reportingManagerId || null,
        engagementEndDate: form.empType === 'PART_TIME' && form.engagementEndDate ? form.engagementEndDate : null,
        basic: form.isPaid ? num(form.basic) : undefined,
        hra: form.isPaid ? num(form.hra) : undefined,
        specialAllowance: form.isPaid ? num(form.specialAllowance) : undefined,
      });
      setResult(res);
      setStep('done');
      onConverted();
    } catch (e: any) {
      setError(e.message || 'The conversion could not be completed.');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadLetter() {
    const docId = result?.offerLetter?.documentId;
    if (!docId) return;
    try {
      await hrmApi.downloadOfferLetter(docId, `${form.firstName} ${form.lastName} - ${TYPE_LABEL[form.empType]} Offer Letter.pdf`.trim());
    } catch (e: any) {
      setError(e.message || 'Download failed.');
    }
  }

  if (!employeeId) return null;

  const rows: { label: string; from: string; to: string }[] = emp
    ? [
        { label: 'Employment type', from: TYPE_LABEL[emp.empType], to: TYPE_LABEL[form.empType] },
        { label: 'Designation', from: emp.designation ?? '—', to: form.designation },
        { label: 'Department', from: emp.department ?? '—', to: form.department },
        { label: 'Work mode', from: MODE_LABEL[emp.workMode], to: MODE_LABEL[form.workMode] },
        {
          label: 'Reports to',
          from: emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}` : '—',
          to: form.reportingManagerId ? managerName(form.reportingManagerId) : '—',
        },
        { label: 'Status', from: STATUS_LABEL[emp.status] ?? emp.status, to: STATUS_LABEL[form.startStatus] },
        { label: 'Monthly pay', from: previousPay ? `${inr(previousPay)} stipend` : 'Unpaid', to: form.isPaid ? `${inr(gross)} gross` : 'Unpaid' },
        { label: 'Role starts', from: `Intern since ${fmtDate(draft.internship.startDate)}`, to: fmtDate(form.effectiveDate) },
        ...(form.empType === 'PART_TIME' && form.engagementEndDate ? [{ label: 'Contract ends', from: '—', to: fmtDate(form.engagementEndDate) }] : []),
        { label: 'Name', from: `${emp.firstName} ${emp.lastName}`.trim(), to: `${form.firstName} ${form.lastName}`.trim() },
        { label: 'Email', from: emp.personalEmail ?? '—', to: form.personalEmail },
        { label: 'Phone', from: emp.contact || '—', to: form.contact || '—' },
      ]
    : [];

  const it = draft?.internship;

  return (
    <div className="icm-backdrop" onClick={() => !submitting && onClose()} role="presentation">
      <div className="icm-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Offer a job to this intern">
        <header className="icm-head">
          <div>
            <div className="icm-eyebrow"><Sparkles size={13} /> Intern to employee</div>
            <h2 className="icm-title">
              {emp ? `Offer ${emp.firstName} a role` : 'Offer a role'}
            </h2>
            {emp && <div className="icm-sub">{emp.empCode} · currently {emp.designation} ({TYPE_LABEL[emp.empType]})</div>}
          </div>
          <div className="icm-steps" aria-label="Progress">
            {(['form', 'confirm', 'done'] as Step[]).map((s, i) => (
              <span key={s} className={`icm-step ${step === s ? 'is-on' : ''} ${(['form', 'confirm', 'done'].indexOf(step) > i) ? 'is-past' : ''}`}>
                {i + 1}. {s === 'form' ? 'Review & edit' : s === 'confirm' ? 'Confirm' : 'Done'}
              </span>
            ))}
          </div>
          <button className="icm-close" onClick={onClose} disabled={submitting} aria-label="Close"><X size={18} /></button>
        </header>

        {error && <div className="icm-msg icm-msg-err" role="alert"><AlertCircle size={15} /> {error}</div>}

        <div className="icm-body">
          {loading || !draft ? (
            <p className="icm-dim">{loading ? 'Loading the intern record…' : 'Nothing to show.'}</p>
          ) : !draft.eligible && step !== 'done' ? (
            <div className="icm-blocked">
              <AlertCircle size={20} />
              <div>
                <strong>This intern can't be converted yet.</strong>
                <ul>{draft.blockers.map((b: string) => <li key={b}>{b}</li>)}</ul>
              </div>
            </div>
          ) : step === 'form' ? (
            <div className="icm-grid">
              {/* ---------- internship summary ---------- */}
              <aside className="icm-summary">
                <h3>Internship at a glance</h3>
                <p className="icm-period">{fmtDate(it.startDate)} → {fmtDate(it.endDate)}{it.durationDays ? ` · ${it.durationDays} days` : ''}</p>
                <div className="icm-stat">
                  <CalendarCheck size={16} />
                  <div>
                    <b>{it.attendance.ratePercent != null ? `${it.attendance.ratePercent}%` : 'No records'}</b>
                    <span>attendance{it.attendance.markedDays ? ` over ${it.attendance.markedDays} marked days` : ''}</span>
                  </div>
                </div>
                <div className="icm-stat">
                  <Clock size={16} />
                  <div><b>{it.approvedLeaveDays}</b><span>approved leave day{it.approvedLeaveDays === 1 ? '' : 's'}</span></div>
                </div>
                <div className="icm-stat">
                  <Star size={16} />
                  <div>
                    <b>{it.reviews.averageRating != null ? `${it.reviews.averageRating} / 5` : 'Not reviewed'}</b>
                    <span>{it.reviews.count ? `average of ${it.reviews.count} review${it.reviews.count === 1 ? '' : 's'}` : 'no performance reviews'}</span>
                  </div>
                </div>
                <div className="icm-stat">
                  <ListChecks size={16} />
                  <div>
                    <b>{it.work.tasksDone} / {it.work.tasksAssigned}</b>
                    <span>tasks done · {it.work.projects} project{it.work.projects === 1 ? '' : 's'}</span>
                  </div>
                </div>
                {it.reviews.latest && (
                  <blockquote className="icm-quote">“{it.reviews.latest.review}”<cite>{it.reviews.latest.quarter}</cite></blockquote>
                )}
                <p className="icm-foot">Figures come from this person's attendance, leave, reviews and project records.</p>
              </aside>

              {/* ---------- editable form ---------- */}
              <div className="icm-form">
                <section>
                  <h3><Briefcase size={15} /> New role</h3>
                  <div className="icm-types">
                    {(['FULL_TIME', 'PART_TIME'] as const).map((t) => (
                      <button
                        key={t} type="button"
                        className={`icm-type ${form.empType === t ? 'is-on' : ''}`}
                        onClick={() => set('empType', t)}
                        aria-pressed={form.empType === t}
                      >
                        <strong>{TYPE_LABEL[t]}</strong>
                        <span>{t === 'FULL_TIME' ? 'Permanent, full working hours' : 'Reduced hours, optional end date'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="icm-row">
                    <label>Designation *<input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Software Engineer" /></label>
                    <label>Department *
                      <input list="icm-departments" value={form.department} onChange={(e) => set('department', e.target.value)} />
                      <datalist id="icm-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
                    </label>
                  </div>
                  <div className="icm-row">
                    <label>Work mode
                      <select value={form.workMode} onChange={(e) => set('workMode', e.target.value)}>
                        {Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </label>
                    <label>Reports to
                      <select value={form.reportingManagerId} onChange={(e) => set('reportingManagerId', e.target.value)}>
                        <option value="">— Not set —</option>
                        {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}{m.designation?.title ? ` · ${m.designation.title}` : ''}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="icm-row">
                    <label>Role starts on *<input type="date" value={form.effectiveDate} min={it.endDate ? String(it.endDate).slice(0, 10) : undefined} onChange={(e) => set('effectiveDate', e.target.value)} /></label>
                    <label>Starts as
                      <select value={form.startStatus} onChange={(e) => set('startStatus', e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="PROBATION">Probation</option>
                      </select>
                    </label>
                  </div>
                  {form.empType === 'PART_TIME' && (
                    <div className="icm-row">
                      <label>Contract end date <em>(optional)</em><input type="date" value={form.engagementEndDate} onChange={(e) => set('engagementEndDate', e.target.value)} /></label>
                      <span />
                    </div>
                  )}
                </section>

                <section>
                  <h3><IndianRupee size={15} /> Compensation</h3>
                  <p className="icm-hint">
                    During the internship: <b>{previousPay ? `${inr(previousPay)}/month stipend` : 'unpaid'}</b>.
                    {' '}The internship pay record closes the day the new role starts.
                  </p>
                  <div className="icm-switch">
                    <button type="button" className={form.isPaid ? 'is-on' : ''} onClick={() => set('isPaid', true)} aria-pressed={form.isPaid}>Paid role</button>
                    <button type="button" className={!form.isPaid ? 'is-on' : ''} onClick={() => set('isPaid', false)} aria-pressed={!form.isPaid}>Unpaid</button>
                  </div>
                  {form.isPaid && (
                    <>
                      <div className="icm-row icm-row-3">
                        <label>Basic *<input inputMode="decimal" value={form.basic} onChange={(e) => set('basic', e.target.value)} placeholder="0" /></label>
                        <label>HRA<input inputMode="decimal" value={form.hra} onChange={(e) => set('hra', e.target.value)} placeholder="0" /></label>
                        <label>Special allowance<input inputMode="decimal" value={form.specialAllowance} onChange={(e) => set('specialAllowance', e.target.value)} placeholder="0" /></label>
                      </div>
                      <div className="icm-gross">
                        Gross monthly pay <b>{inr(gross)}</b>
                        {gross > 0 && (
                          <span className="icm-delta">
                            {previousPay ? `${gross >= previousPay ? '+' : '−'}${inr(Math.abs(gross - previousPay))} vs stipend` : 'first paid role'}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </section>

                <section>
                  <h3><UserCheck size={15} /> Employee details <em>— taken from the current record, edit if needed</em></h3>
                  <div className="icm-row">
                    <label>First name *<input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
                    <label>Last name<input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
                  </div>
                  <div className="icm-row">
                    <label>Email *<input type="email" value={form.personalEmail} onChange={(e) => set('personalEmail', e.target.value)} /></label>
                    <label>Phone<input value={form.contact} onChange={(e) => set('contact', e.target.value)} /></label>
                  </div>
                </section>

                <section>
                  <h3><Mail size={15} /> Offer letter</h3>
                  <p className="icm-hint">
                    The {TYPE_LABEL[form.empType]} offer letter is generated for <b>{form.personalEmail || '—'}</b> and held in <b>Letter Outbox</b>,
                    where you preview the PDF and email before anything is sent.
                  </p>
                  <label>Note for the history log <em>(optional)</em>
                    <textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Strong internship — offered on the team lead's recommendation." />
                  </label>
                </section>
              </div>
            </div>
          ) : step === 'confirm' ? (
            <div className="icm-confirm">
              <p className="icm-lead">Check the changes below. Nothing is saved until you confirm.</p>
              <table className="icm-diff">
                <thead><tr><th>Field</th><th>Now</th><th aria-label="becomes" /><th>After conversion</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const changed = r.from !== r.to;
                    return (
                      <tr key={r.label} className={changed ? 'is-changed' : ''}>
                        <td>{r.label}</td>
                        <td>{r.from}</td>
                        <td>{changed ? <ArrowRight size={14} /> : ''}</td>
                        <td>{changed ? <b>{r.to}</b> : <span className="icm-dim">unchanged</span>}</td>
                      </tr>
                    );
                  })}
                  {form.isPaid && (
                    <tr className="is-changed"><td>Pay split</td><td>—</td><td><ArrowRight size={14} /></td><td><b>Basic {inr(num(form.basic))} · HRA {inr(num(form.hra))} · Special {inr(num(form.specialAllowance))}</b></td></tr>
                  )}
                </tbody>
              </table>
              <div className="icm-effects">
                <h3>When you confirm</h3>
                <ul>
                  <li>{form.firstName} becomes <b>{TYPE_LABEL[form.empType]} — {form.designation}</b> everywhere in the app: directory, payroll, projects and their own portal.</li>
                  <li>{previousPay ? 'The internship stipend record closes' : 'The internship record closes'} on {fmtDate(form.effectiveDate)}{form.isPaid ? ` and a ${inr(gross)}/month salary record starts the same day.` : '. No salary record is created (unpaid role).'}</li>
                  <li>A {TYPE_LABEL[form.empType]} offer letter mentioning the completed internship is generated and held in Letter Outbox for your review before it is emailed to {form.personalEmail}.</li>
                  <li>{emp?.hasLogin ? `${form.firstName} gets an in-app notification.` : 'This person has no ERP login, so no in-app notification is sent.'}</li>
                  <li>The change is recorded in the employee's History tab and the audit trail.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="icm-done">
              <CheckCircle2 size={40} />
              <h3>{form.firstName} is now {TYPE_LABEL[result.empType]} — {result.designation}</h3>
              <p>Role starts {fmtDate(result.effectiveDate)} · {result.statusLabel} · {result.workModeLabel}{result.monthlyGross ? ` · ${inr(result.monthlyGross)}/month` : ' · unpaid'}</p>
              <div className={`icm-letter ${result.offerLetter?.emailed || result.offerLetter?.pending ? 'ok' : 'warn'}`}>
                <Mail size={16} />
                <span>
                  {result.offerLetter?.pending
                    ? `Offer letter is ready and waiting in Letter Outbox — preview it there, then send it to ${form.personalEmail}.`
                    : result.offerLetter?.emailed
                      ? `Offer letter emailed to ${form.personalEmail}.`
                      : result.offerLetter?.documentId
                        ? `Offer letter generated, but the email was not sent: ${result.offerLetter.error || 'unknown error'}. You can download it and send it yourself.`
                        : `The offer letter could not be generated: ${result.offerLetter?.error || 'unknown error'}.`}
                </span>
                {result.offerLetter?.documentId && (
                  <button className="icm-btn" onClick={downloadLetter}><Download size={14} /> Download</button>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="icm-foot-bar">
          {step === 'form' && draft?.eligible && (
            <>
              <button className="icm-btn" onClick={onClose}>Cancel</button>
              <button className="icm-btn icm-btn-primary" onClick={goConfirm}>Review changes <ArrowRight size={14} /></button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <button className="icm-btn" onClick={() => setStep('form')} disabled={submitting}><ArrowLeft size={14} /> Back to edit</button>
              <button className="icm-btn icm-btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? 'Converting…' : `Confirm & convert to ${TYPE_LABEL[form.empType]}`}
              </button>
            </>
          )}
          {(step === 'done' || (draft && !draft.eligible)) && <button className="icm-btn icm-btn-primary" onClick={onClose}>Close</button>}
        </footer>
      </div>

      <style>{`
.icm-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}
.icm-panel{background:var(--color-surface,#fff);color:var(--color-text-primary,#111);width:min(1080px,100%);max-height:94vh;border-radius:14px;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);overflow:hidden;}
.icm-head{display:flex;gap:16px;align-items:flex-start;padding:18px 22px;border-bottom:1px solid var(--color-border,#e5e7eb);flex-wrap:wrap;}
.icm-head>div:first-child{flex:1;min-width:220px;}
.icm-eyebrow{display:inline-flex;gap:6px;align-items:center;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7c3aed;}
.icm-title{font-size:20px;font-weight:700;margin:4px 0 2px;text-wrap:balance;}
.icm-sub{font-size:12.5px;color:var(--color-text-muted,#6b7280);}
.icm-steps{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.icm-step{font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;color:var(--color-text-muted,#6b7280);border:1px solid var(--color-border,#e5e7eb);}
.icm-step.is-on{background:#2563eb;color:#fff;border-color:#2563eb;}
.icm-step.is-past{color:#059669;border-color:#a7f3d0;}
.icm-close{border:none;background:none;cursor:pointer;color:var(--color-text-muted,#6b7280);padding:4px;border-radius:6px;}
.icm-close:focus-visible,.icm-btn:focus-visible,.icm-type:focus-visible,.icm-switch button:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
.icm-msg{display:flex;gap:8px;align-items:center;margin:12px 22px 0;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:600;}
.icm-msg-err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}
.icm-body{padding:18px 22px;overflow-y:auto;flex:1;}
.icm-dim{color:var(--color-text-muted,#6b7280);}
.icm-blocked{display:flex;gap:12px;padding:16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:14px;}
.icm-blocked ul{margin:6px 0 0 18px;}
.icm-grid{display:grid;grid-template-columns:280px 1fr;gap:20px;}
@media (max-width:820px){.icm-grid{grid-template-columns:1fr;}}
.icm-summary{background:var(--color-background,#f8fafc);border:1px solid var(--color-border,#e5e7eb);border-radius:12px;padding:16px;align-self:start;display:flex;flex-direction:column;gap:12px;}
.icm-summary h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary,#475569);margin:0;}
.icm-period{font-size:13px;font-weight:600;margin:0;font-variant-numeric:tabular-nums;}
.icm-stat{display:flex;gap:10px;align-items:flex-start;color:#2563eb;}
.icm-stat div{display:flex;flex-direction:column;color:var(--color-text-primary,#111);}
.icm-stat b{font-size:16px;font-variant-numeric:tabular-nums;}
.icm-stat span{font-size:12px;color:var(--color-text-muted,#6b7280);}
.icm-quote{margin:0;padding:10px 12px;border-left:3px solid #7c3aed;background:var(--color-surface,#fff);border-radius:6px;font-size:12.5px;font-style:italic;}
.icm-quote cite{display:block;margin-top:4px;font-style:normal;font-size:11px;color:var(--color-text-muted,#6b7280);}
.icm-foot{font-size:11px;color:var(--color-text-muted,#6b7280);margin:0;}
.icm-form{display:flex;flex-direction:column;gap:18px;}
.icm-form section{display:flex;flex-direction:column;gap:10px;}
.icm-form h3{display:flex;gap:7px;align-items:center;font-size:14px;font-weight:700;margin:0;}
.icm-form h3 em,.icm-form label em{font-weight:400;font-style:normal;color:var(--color-text-muted,#6b7280);font-size:12px;}
.icm-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.icm-row-3{grid-template-columns:1fr 1fr 1fr;}
@media (max-width:560px){.icm-row,.icm-row-3{grid-template-columns:1fr;}}
.icm-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:600;color:var(--color-text-secondary,#475569);min-width:0;}
.icm-form input,.icm-form select,.icm-form textarea{width:100%;min-width:0;box-sizing:border-box;padding:9px 11px;border-radius:8px;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-primary,#111);font-size:14px;font-weight:400;font-family:inherit;}
.icm-form input:focus,.icm-form select:focus,.icm-form textarea:focus{outline:2px solid #93c5fd;border-color:#2563eb;}
.icm-types{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.icm-type{text-align:left;padding:12px 14px;border-radius:10px;border:1.5px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);cursor:pointer;display:flex;flex-direction:column;gap:2px;color:var(--color-text-primary,#111);}
.icm-type span{font-size:12px;color:var(--color-text-muted,#6b7280);}
.icm-type.is-on{border-color:#2563eb;background:rgba(37,99,235,.07);}
.icm-hint{font-size:12.5px;color:var(--color-text-muted,#6b7280);margin:0;}
.icm-switch{display:inline-flex;border:1px solid var(--color-border,#d1d5db);border-radius:9px;overflow:hidden;align-self:flex-start;}
.icm-switch button{border:none;background:var(--color-surface,#fff);color:var(--color-text-secondary,#475569);padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;}
.icm-switch button.is-on{background:#2563eb;color:#fff;}
.icm-gross{font-size:14px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}
.icm-gross b{font-size:18px;font-variant-numeric:tabular-nums;}
.icm-delta{font-size:12px;font-weight:600;color:#059669;background:rgba(5,150,105,.1);padding:2px 8px;border-radius:999px;}
.icm-check{flex-direction:row !important;align-items:center;gap:8px !important;font-weight:500 !important;color:var(--color-text-primary,#111) !important;}
.icm-form .icm-check input{width:16px;height:16px;min-width:16px;padding:0;}
.icm-grid>*,.icm-row>*{min-width:0;}
@media (max-width:560px){
.icm-diff thead{display:none;}
.icm-diff,.icm-diff tbody{display:block;}
.icm-diff tr{display:grid;grid-template-columns:1fr auto 1fr;gap:2px 8px;padding:9px 0;border-bottom:1px solid var(--color-border,#f1f5f9);}
.icm-diff td{border:none;padding:0;width:auto !important;white-space:normal !important;}
.icm-diff td:first-child{grid-column:1/-1;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-muted,#6b7280);}
.icm-foot-bar{flex-wrap:wrap;}.icm-foot-bar .icm-btn{flex:1;justify-content:center;}}
.icm-lead{margin:0 0 12px;font-size:14px;}
.icm-diff{width:100%;border-collapse:collapse;font-size:13.5px;}
.icm-diff th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted,#6b7280);padding:8px 10px;border-bottom:1px solid var(--color-border,#e5e7eb);}
.icm-diff td{padding:9px 10px;border-bottom:1px solid var(--color-border,#f1f5f9);vertical-align:top;overflow-wrap:anywhere;}
.icm-diff td:first-child{font-weight:600;color:var(--color-text-secondary,#475569);white-space:nowrap;}
.icm-diff tr.is-changed td:last-child{color:#1d4ed8;}
.icm-diff td:nth-child(3){color:#2563eb;width:24px;}
.icm-effects{margin-top:16px;padding:14px 16px;border-radius:10px;background:var(--color-background,#f8fafc);border:1px solid var(--color-border,#e5e7eb);}
.icm-effects h3{font-size:13px;margin:0 0 6px;}
.icm-effects ul{margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:4px;}
.icm-done{text-align:center;padding:20px 10px;color:var(--color-text-primary,#111);display:flex;flex-direction:column;align-items:center;gap:8px;}
.icm-done>svg{color:#059669;}
.icm-done h3{font-size:18px;margin:4px 0 0;text-wrap:balance;}
.icm-done p{margin:0;color:var(--color-text-muted,#6b7280);font-size:13.5px;}
.icm-letter{margin-top:12px;display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:10px;font-size:13px;text-align:left;max-width:640px;}
.icm-letter.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;}
.icm-letter.warn{background:#fffbeb;color:#92400e;border:1px solid #fde68a;}
.icm-letter span{flex:1;}
.icm-foot-bar{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid var(--color-border,#e5e7eb);}
.icm-btn{display:inline-flex;gap:6px;align-items:center;padding:8px 16px;border-radius:8px;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-primary,#111);font-size:13px;font-weight:600;cursor:pointer;}
.icm-btn:disabled{opacity:.6;cursor:wait;}
.icm-btn-primary{background:#2563eb;border-color:#2563eb;color:#fff;}
@media (prefers-reduced-motion:no-preference){.icm-panel{animation:icm-in .18s ease-out;}@keyframes icm-in{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}}
`}</style>
    </div>
  );
}
