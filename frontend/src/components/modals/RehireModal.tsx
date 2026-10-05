'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import Modal from '../Modal';
import PaySetup, { payPayload, payProblem, payValueFromEmployee, type PayValue } from '../PaySetup';
import { hrmApi, teamsApi } from '../../services/api';
import { formatDate } from '../../lib/date';

const EMP_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' }, { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' }, { value: 'INTERN', label: 'Intern' },
];
const WORK_MODES = [{ value: 'ONSITE', label: 'Onsite' }, { value: 'REMOTE', label: 'Remote' }, { value: 'HYBRID', label: 'Hybrid' }];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(EMP_TYPES.map((t) => [t.value, t.label]));
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Re-hire a former employee in three steps: edit the new terms (pre-filled
 * from their last stint) → preview every change → confirm. The server does
 * the real validation in both the preview and the confirm call.
 */
export default function RehireModal({
  employeeId, onClose, onDone, departments, designations,
}: {
  employeeId: string | null;
  onClose: () => void;
  onDone: () => void;
  departments: { name: string }[];
  designations: { title: string }[];
}) {
  const [step, setStep] = useState<'edit' | 'review' | 'done'>('edit');
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [pay, setPay] = useState<PayValue>({ mode: 'FIXED', amount: '', shares: [] });
  const [teams, setTeams] = useState<{ id: string; name: string; isActive?: boolean }[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    setStep('edit'); setPreview(null); setResult(null); setError(null); setEmp(null); setCopied(false);
    Promise.all([hrmApi.getEmployee(employeeId), teamsApi.list().catch(() => [])]).then(([e, t]) => {
      setEmp(e);
      setTeams(Array.isArray(t) ? t : []);
      setForm({
        joinDate: today(), empType: e.empType ?? 'FULL_TIME', workMode: e.workMode ?? 'ONSITE',
        engagementEndDate: '', department: e.department?.name ?? '', designation: e.designation?.title ?? '',
        personalEmail: e.personalEmail ?? '', contact: e.contact ?? '', resetPassword: true, username: '', note: '',
      });
      setPay(payValueFromEmployee(e));
    }).catch((err) => setError(err.message || 'Could not load this person.'));
  }, [employeeId]);

  if (!employeeId) return null;
  const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : '';
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const needsEnd = form.empType === 'INTERN' || form.empType === 'CONTRACT';
  const body = () => ({ ...form, engagementEndDate: needsEnd ? form.engagementEndDate : '', ...payPayload(pay) });

  async function toReview() {
    const problem = !form.joinDate ? 'Choose the new joining date.'
      : !form.department?.trim() || !form.designation?.trim() ? 'Department and designation are both required.'
      : form.empType === 'INTERN' && !form.engagementEndDate ? 'Internship end date is required for interns.'
      : !form.personalEmail?.trim() ? 'An email address is required — the new offer letter is sent there.'
      : payProblem(pay, form.empType);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      setPreview(await hrmApi.rehirePreview(employeeId!, body()));
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Could not check these details.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true); setError(null);
    try {
      setResult(await hrmApi.rehireEmployee(employeeId!, body()));
      setStep('done');
      onDone();
    } catch (err: any) {
      setError(err.message || 'Could not re-hire this person.');
      setStep('edit');
    } finally {
      setBusy(false);
    }
  }

  const title = step === 'done' ? `${name} is back` : `Re-hire ${name}`;

  return (
    <Modal isOpen={!!employeeId} onClose={() => !busy && onClose()} title={title} width="620px">
      <div className="rh">
        {step !== 'done' && (
          <ol className="rh-steps" aria-label="Steps">
            <li className={step === 'edit' ? 'on' : 'done'}>1. Details</li>
            <li className={step === 'review' ? 'on' : ''}>2. Preview</li>
            <li>3. Confirm</li>
          </ol>
        )}
        {error && <div className="rh-alert"><AlertCircle size={16} /> {error}</div>}
        {!emp && !error && <p className="rh-muted">Loading…</p>}

        {emp && step === 'edit' && (
          <>
            <div className="rh-prev">
              <RotateCcw size={15} />
              <div>
                <b>{emp.empCode}</b> · previously {emp.designation?.title ?? '—'} ({TYPE_LABEL[emp.empType] ?? emp.empType}), {emp.department?.name ?? '—'}
                <div className="rh-muted">{formatDate(emp.joinDate)} – {emp.lastWorkingDay ? formatDate(emp.lastWorkingDay) : '—'}. Everything below starts filled in from then — change whatever is different now.</div>
              </div>
            </div>

            <div className="rh-grid">
              <label className="rh-f"><span>New joining date *</span><input type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} /></label>
              <label className="rh-f"><span>Employment type *</span>
                <select value={form.empType} onChange={(e) => set('empType', e.target.value)}>{EMP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              </label>
              <label className="rh-f"><span>Work mode *</span>
                <select value={form.workMode} onChange={(e) => set('workMode', e.target.value)}>{WORK_MODES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              </label>
              {needsEnd && (
                <label className="rh-f"><span>{form.empType === 'INTERN' ? 'Internship end date *' : 'Contract end date'}</span><input type="date" value={form.engagementEndDate} onChange={(e) => set('engagementEndDate', e.target.value)} /></label>
              )}
              <label className="rh-f"><span>Department *</span>
                <input list="rh-depts" value={form.department} onChange={(e) => set('department', e.target.value)} autoComplete="off" />
                <datalist id="rh-depts">{Array.from(new Set(departments.map((d) => d.name))).map((d) => <option key={d} value={d} />)}</datalist>
              </label>
              <label className="rh-f"><span>Designation *</span>
                <input list="rh-desigs" value={form.designation} onChange={(e) => set('designation', e.target.value)} autoComplete="off" />
                <datalist id="rh-desigs">{Array.from(new Set(designations.map((d) => d.title))).map((d) => <option key={d} value={d} />)}</datalist>
              </label>
              <label className="rh-f"><span>Email * <small>(the offer letter goes here)</small></span><input type="email" value={form.personalEmail} onChange={(e) => set('personalEmail', e.target.value)} /></label>
              <label className="rh-f"><span>Phone</span><input value={form.contact} onChange={(e) => set('contact', e.target.value)} /></label>
            </div>

            <PaySetup empType={form.empType} value={pay} onChange={setPay} teams={teams} />

            <div className="rh-box">
              <div className="rh-box-h">ERP login</div>
              {emp.user?.username ? (
                <>
                  <div>Username stays <code>{emp.user.username}</code>; their login is switched back on.</div>
                  <label className="rh-check">
                    <input type="checkbox" checked={form.resetPassword} onChange={(e) => set('resetPassword', e.target.checked)} />
                    <span>Give them a new temporary password (recommended) — they must change it when they first sign in.</span>
                  </label>
                </>
              ) : (
                <label className="rh-f"><span>Username * <small>(they have no login yet)</small></span><input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. jane.doe" /></label>
              )}
            </div>

            <label className="rh-f"><span>Note for their history (optional)</span><input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Returning after higher studies" /></label>

            <div className="rh-actions">
              <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={toReview} disabled={busy}>{busy ? 'Checking…' : <>Preview changes <ArrowRight size={14} /></>}</button>
            </div>
          </>
        )}

        {step === 'review' && preview && (
          <>
            <p className="rh-lead">Check the new terms for <b>{preview.name}</b> ({preview.empCode}). Nothing has been saved yet.</p>
            <div className="rh-table-wrap">
              <table className="rh-table">
                <thead><tr><th>Detail</th><th>Last stint</th><th>Now</th></tr></thead>
                <tbody>
                  {preview.changes.map((c: any) => (
                    <tr key={c.field}><td>{c.label}</td><td className="rh-old">{c.from}</td><td className="rh-new">{c.to}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.unchanged?.length > 0 && <p className="rh-muted">Staying the same: {preview.unchanged.join(', ')}.</p>}
            <div className="rh-box">
              <div className="rh-box-h">When you confirm</div>
              <ul>
                <li>{preview.name} moves back to <b>Active Employees</b> with the same employee code and full history; a “Re-hired” entry is added.</li>
                <li>Login <code>{preview.username}</code> is switched back on{preview.resetPassword || !preview.hasLogin ? ' with a new temporary password, shown to you once' : ' with their old password'}.</li>
                <li>A <b>new offer letter</b> for these terms is created and waits in the <b>Letter Outbox</b> for you to review and send to {preview.offerLetterTo}.</li>
              </ul>
            </div>
            <div className="rh-actions">
              <button className="btn btn-secondary" onClick={() => { setError(null); setStep('edit'); }} disabled={busy}><ArrowLeft size={14} /> Back to edit</button>
              <button className="btn btn-primary" onClick={confirm} disabled={busy}>{busy ? 'Re-hiring…' : 'Confirm re-hire'}</button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <>
            <div className="rh-ok"><CheckCircle2 size={18} /> {result.name} ({result.empCode}) is back in Active Employees from {formatDate(result.joinDate)}.</div>
            {result.tempPassword && (
              <div className="rh-box">
                <div className="rh-box-h">Their login — shown only now</div>
                <div className="rh-cred">
                  <span>Username <code>{result.username}</code></span>
                  <span>Temporary password <code>{result.tempPassword}</code></span>
                  <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(`Username: ${result.username}\nTemporary password: ${result.tempPassword}`).then(() => setCopied(true)).catch(() => {}); }}>
                    <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rh-muted">They&apos;ll be asked to choose their own password when they sign in.</div>
              </div>
            )}
            <div className="rh-box">
              <div className="rh-box-h">Offer letter</div>
              {result.offerLetter?.pending ? <div>Ready — <Link href="/letters">review it in the Letter Outbox</Link>, then send it.</div>
                : result.offerLetter?.emailed ? <div>Emailed.</div>
                : <div>Not created: {result.offerLetter?.error || 'unknown problem'}. You can send it later from their profile.</div>}
            </div>
            <div className="rh-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
          </>
        )}
      </div>

      <style jsx>{`
        .rh { display: flex; flex-direction: column; gap: 14px; font-size: 13.5px; }
        .rh-steps { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; }
        .rh-steps li { flex: 1; text-align: center; padding: 6px; border-radius: 8px; background: var(--color-bg-secondary); color: var(--color-text-muted); font-size: 12px; font-weight: 600; }
        .rh-steps li.on { background: #eff6ff; color: #2563eb; }
        .rh-steps li.done { color: var(--color-text-secondary); }
        .rh-alert { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-weight: 600; font-size: 13px; }
        .rh-ok { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-weight: 600; }
        .rh-prev { display: flex; gap: 10px; padding: 10px 12px; border-radius: 8px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); }
        .rh-prev :global(svg) { flex-shrink: 0; margin-top: 2px; color: #2563eb; }
        .rh-muted { font-size: 12.5px; color: var(--color-text-muted); }
        .rh-lead { margin: 0; }
        .rh-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .rh-f { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
        .rh-f small { font-weight: 400; color: var(--color-text-muted); }
        .rh-f input, .rh-f select { padding: 9px 10px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text); font-size: 13.5px; min-width: 0; }
        .rh-box { padding: 12px; border: 1px solid var(--color-border); border-radius: 10px; display: flex; flex-direction: column; gap: 8px; }
        .rh-box ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
        .rh-box-h { font-weight: 700; font-size: 13px; }
        .rh-check { display: flex; gap: 8px; align-items: flex-start; cursor: pointer; }
        .rh-check input { margin-top: 3px; }
        .rh-cred { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
        .rh code { font-family: Consolas, monospace; background: var(--color-bg-secondary); padding: 1px 6px; border-radius: 4px; }
        .rh-table-wrap { overflow-x: auto; }
        .rh-table { width: 100%; border-collapse: collapse; }
        .rh-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); padding: 6px 8px; border-bottom: 1px solid var(--color-border); }
        .rh-table td { padding: 8px; border-bottom: 1px solid var(--color-border); vertical-align: top; }
        .rh-old { color: var(--color-text-muted); }
        .rh-new { font-weight: 600; }
        .rh-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
        .rh-box :global(a) { color: #2563eb; font-weight: 600; }
        @media (max-width: 560px) { .rh-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Modal>
  );
}
