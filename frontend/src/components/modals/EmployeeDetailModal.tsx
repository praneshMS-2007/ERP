'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Pencil, Save, RotateCcw, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { hrmApi } from '../../services/api';

interface Props {
  employeeId: string | null;
  onClose: () => void;
  onSaved?: () => void;
  departments: any[];
  designations: any[];
}

type Section = 'personal' | 'employment' | 'statutory' | 'compensation';

const EMP_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
];
const STATUSES = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'INACTIVE'];
const WORK_MODES = ['ONSITE', 'REMOTE', 'HYBRID'];

/** yyyy-mm-dd for <input type="date">, empty when absent. */
function toDateInput(v: any): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function formatDate(v: any): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const rupee = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function EmployeeDetailModal({
  employeeId, onClose, onSaved, departments, designations,
}: Props) {
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('personal');
  const [form, setForm] = useState<Record<string, any>>({});
  const [salaryForm, setSalaryForm] = useState({ basic: '', hra: '', specialAllowance: '', effectiveFrom: '', note: '' });

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await hrmApi.getEmployee(employeeId);
      setEmp(data);
      setForm({
        firstName: data.firstName ?? '', lastName: data.lastName ?? '',
        gender: data.gender ?? '', dob: toDateInput(data.dob),
        contact: data.contact ?? '', personalEmail: data.personalEmail ?? '',
        address: data.address ?? '', city: data.city ?? '',
        state: data.state ?? '', country: data.country ?? '',
        joinDate: toDateInput(data.joinDate), empType: data.empType ?? 'FULL_TIME',
        status: data.status ?? 'ACTIVE', workMode: data.workMode ?? 'ONSITE',
        departmentId: data.departmentId ?? '', designationId: data.designationId ?? '',
        engagementEndDate: toDateInput(data.engagementEndDate),
        pan: data.pan ?? '', bankAccountNo: data.bankAccountNo ?? '', bankIfsc: data.bankIfsc ?? '',
      });
      const cur = data.compensation?.current;
      setSalaryForm({
        basic: cur?.basic != null ? String(cur.basic) : '',
        hra: cur?.hra != null ? String(cur.hra) : '',
        specialAllowance: cur?.specialAllowance != null ? String(cur.specialAllowance) : '',
        effectiveFrom: toDateInput(new Date()),
        note: '',
      });
    } catch (e: any) {
      setError(e.message || 'Could not load this employee.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  // Escape closes, matching every other dialog people use.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!employeeId) return null;

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    try {
      await hrmApi.updateEmployee(employeeId!, form);
      setToast('Profile saved');
      setEditing(false);
      await load();
      onSaved?.();
    } catch (e: any) {
      // The backend explains PAN/account mistakes precisely — show that text.
      setError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSalary() {
    setSaving(true);
    setError(null);
    try {
      await hrmApi.setSalary(employeeId!, {
        basic: Number(salaryForm.basic),
        hra: Number(salaryForm.hra || 0),
        specialAllowance: Number(salaryForm.specialAllowance || 0),
        effectiveFrom: salaryForm.effectiveFrom || undefined,
        note: salaryForm.note || undefined,
      });
      setToast('Salary structure recorded');
      await load();
      onSaved?.();
    } catch (e: any) {
      setError(e.message || 'Could not save the salary structure.');
    } finally {
      setSaving(false);
    }
  }

  const initials = emp ? `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase() : '';
  const grossPreview =
    Number(salaryForm.basic || 0) + Number(salaryForm.hra || 0) + Number(salaryForm.specialAllowance || 0);

  const tabs: { id: Section; label: string }[] = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'statutory', label: 'Statutory & Bank' },
    { id: 'compensation', label: 'Compensation' },
  ];

  return (
    <div className="edm-backdrop" onClick={onClose} role="presentation">
      <div
        className="edm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Employee details"
      >
        {/* ---------- header ---------- */}
        <header className="edm-head">
          <div className="edm-ident">
            <div className="edm-avatar">{initials || '—'}</div>
            <div>
              <h2 className="edm-name">
                {loading && !emp ? 'Loading…' : `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`}
              </h2>
              <div className="edm-sub">
                <span className="edm-code">{emp?.empCode ?? '—'}</span>
                {emp?.designation?.title && <span>· {emp.designation.title}</span>}
                {emp?.department?.name && <span>· {emp.department.name}</span>}
              </div>
            </div>
          </div>
          <div className="edm-head-actions">
            {!editing ? (
              <button className="edm-btn" onClick={() => setEditing(true)} disabled={loading || !emp}>
                <Pencil size={14} /> Edit
              </button>
            ) : (
              <>
                <button
                  className="edm-btn"
                  onClick={() => { setEditing(false); setError(null); load(); }}
                  disabled={saving}
                >
                  <RotateCcw size={14} /> Cancel
                </button>
                <button className="edm-btn edm-btn-primary" onClick={handleSaveProfile} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            )}
            <button className="edm-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ---------- messages ---------- */}
        {error && (
          <div className="edm-msg edm-msg-error" role="alert">
            <AlertCircle size={15} /> <span>{error}</span>
          </div>
        )}
        {toast && (
          <div className="edm-msg edm-msg-ok" role="status">
            <CheckCircle2 size={15} /> <span>{toast}</span>
          </div>
        )}

        {/* ---------- tabs ---------- */}
        <nav className="edm-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`edm-tab ${section === t.id ? 'is-active' : ''}`}
              onClick={() => setSection(t.id)}
            >
              {t.label}
              {t.id === 'compensation' && emp && !emp.canViewCompensation && (
                <Lock size={11} style={{ marginLeft: 5, opacity: 0.65 }} />
              )}
            </button>
          ))}
        </nav>

        {/* ---------- body ---------- */}
        <div className="edm-body">
          {loading && !emp ? (
            <p className="edm-dim">Loading employee record…</p>
          ) : !emp ? (
            <p className="edm-dim">No record to show.</p>
          ) : (
            <>
              {section === 'personal' && (
                <div className="edm-grid">
                  <Field label="First name" value={form.firstName} editing={editing} required
                         onChange={(v) => setForm({ ...form, firstName: v })} />
                  <Field label="Last name" value={form.lastName} editing={editing} required
                         onChange={(v) => setForm({ ...form, lastName: v })} />
                  <Field label="Date of birth" value={form.dob} display={formatDate(emp.dob)} type="date"
                         editing={editing} onChange={(v) => setForm({ ...form, dob: v })} />
                  <Field label="Gender" value={form.gender} editing={editing} type="select"
                         options={['', 'Male', 'Female', 'Other']}
                         onChange={(v) => setForm({ ...form, gender: v })} />
                  <Field label="Contact number" value={form.contact} editing={editing}
                         onChange={(v) => setForm({ ...form, contact: v })} />
                  <Field label="Personal email" value={form.personalEmail} editing={editing}
                         hint="The address they applied from"
                         onChange={(v) => setForm({ ...form, personalEmail: v })} />
                  <Field label="Address" value={form.address} editing={editing} wide
                         onChange={(v) => setForm({ ...form, address: v })} />
                  <Field label="City" value={form.city} editing={editing}
                         onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="State" value={form.state} editing={editing}
                         onChange={(v) => setForm({ ...form, state: v })} />
                  <Field label="Country" value={form.country} editing={editing}
                         onChange={(v) => setForm({ ...form, country: v })} />
                </div>
              )}

              {section === 'employment' && (
                <div className="edm-grid">
                  <Field label="Employee ID" value={emp.empCode ?? '—'} editing={false}
                         hint="Generated automatically, cannot be edited" />
                  <Field label="Company email" value={emp.user?.email ?? 'Not yet assigned'} editing={false} />
                  <Field label="Date of joining" value={form.joinDate} display={formatDate(emp.joinDate)}
                         type="date" editing={editing} onChange={(v) => setForm({ ...form, joinDate: v })} />
                  <Field label="Employment type" value={form.empType} editing={editing} type="select"
                         options={EMP_TYPES.map((t) => t.value)}
                         labels={Object.fromEntries(EMP_TYPES.map((t) => [t.value, t.label]))}
                         onChange={(v) => setForm({ ...form, empType: v })} />
                  <Field label="Status" value={form.status} editing={editing} type="select" options={STATUSES}
                         onChange={(v) => setForm({ ...form, status: v })} />
                  <Field label="Work mode" value={form.workMode} editing={editing} type="select" options={WORK_MODES}
                         onChange={(v) => setForm({ ...form, workMode: v })} />
                  <Field label="Department" value={form.departmentId} editing={editing} type="select"
                         options={departments.map((d) => d.id)}
                         labels={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                         display={emp.department?.name ?? '—'}
                         onChange={(v) => setForm({ ...form, departmentId: v })} />
                  <Field label="Designation" value={form.designationId} editing={editing} type="select"
                         options={designations.map((d) => d.id)}
                         labels={Object.fromEntries(designations.map((d) => [d.id, d.title]))}
                         display={emp.designation?.title ?? '—'}
                         onChange={(v) => setForm({ ...form, designationId: v })} />
                  <Field label="Reports to"
                         value={emp.reportingManager
                           ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}`
                           : '—'}
                         editing={false} />
                  {(form.empType === 'INTERN' || form.empType === 'CONTRACT') && (
                    <Field label="Engagement ends" value={form.engagementEndDate}
                           display={formatDate(emp.engagementEndDate)} type="date" editing={editing}
                           hint="Fixed-term engagements need an end date"
                           onChange={(v) => setForm({ ...form, engagementEndDate: v })} />
                  )}
                </div>
              )}

              {section === 'statutory' && (
                <>
                  <p className="edm-note">
                    These three values print on every payslip. The system checks each format on save, so a
                    bank account number cannot be stored as a PAN.
                  </p>
                  <div className="edm-grid">
                    <Field label="PAN number" value={form.pan} editing={editing} mono
                           hint="5 letters, 4 digits, 1 letter — e.g. QCKPS2002C"
                           onChange={(v) => setForm({ ...form, pan: v.toUpperCase() })} />
                    <Field label="Bank account number" value={form.bankAccountNo} editing={editing} mono
                           hint="9 to 18 digits"
                           onChange={(v) => setForm({ ...form, bankAccountNo: v })} />
                    <Field label="IFSC code" value={form.bankIfsc} editing={editing} mono
                           hint="e.g. HDFC0001234"
                           onChange={(v) => setForm({ ...form, bankIfsc: v.toUpperCase() })} />
                  </div>
                  {(!emp.pan || !emp.bankAccountNo) && (
                    <div className="edm-warn">
                      <AlertCircle size={15} />
                      <span>
                        Payslips cannot be generated for this employee until the PAN and bank account
                        number are filled in.
                      </span>
                    </div>
                  )}
                </>
              )}

              {section === 'compensation' && (
                !emp.canViewCompensation ? (
                  <div className="edm-locked">
                    <Lock size={20} />
                    <p><b>Salary details are restricted</b></p>
                    <p className="edm-dim">
                      Only HR and Finance can view compensation. This data is left out of the response
                      entirely, not merely hidden on screen.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="edm-salary-now">
                      <span className="edm-label">Current gross</span>
                      <span className="edm-gross">
                        {emp.compensation?.current ? rupee(emp.compensation.current.gross) : 'Not set'}
                      </span>
                      {emp.compensation?.current && (
                        <span className="edm-dim">
                          in force since {formatDate(emp.compensation.current.effectiveFrom)}
                        </span>
                      )}
                    </div>

                    <p className="edm-note">
                      Recording a new split closes the previous one rather than overwriting it, so a payslip
                      already issued never changes.
                    </p>

                    <div className="edm-grid">
                      <Field label="Basic salary" value={salaryForm.basic} editing mono required
                             onChange={(v) => setSalaryForm({ ...salaryForm, basic: v })} />
                      <Field label="HRA" value={salaryForm.hra} editing mono
                             onChange={(v) => setSalaryForm({ ...salaryForm, hra: v })} />
                      <Field label="Special allowance" value={salaryForm.specialAllowance} editing mono
                             onChange={(v) => setSalaryForm({ ...salaryForm, specialAllowance: v })} />
                      <Field label="Effective from" value={salaryForm.effectiveFrom} editing type="date"
                             onChange={(v) => setSalaryForm({ ...salaryForm, effectiveFrom: v })} />
                      <Field label="Note" value={salaryForm.note} editing wide
                             hint="Optional — e.g. annual revision"
                             onChange={(v) => setSalaryForm({ ...salaryForm, note: v })} />
                    </div>

                    <div className="edm-total">
                      <span>Gross total</span>
                      <b>{rupee(grossPreview)}</b>
                    </div>

                    <button className="edm-btn edm-btn-primary" onClick={handleSaveSalary}
                            disabled={saving || !salaryForm.basic}>
                      <Save size={14} /> {saving ? 'Saving…' : 'Record salary structure'}
                    </button>

                    {!!emp.compensation?.history?.length && (
                      <div className="edm-history">
                        <span className="edm-label">History</span>
                        <table className="edm-table">
                          <thead>
                            <tr><th>From</th><th>To</th><th>Basic</th><th>HRA</th><th>Special</th><th>Gross</th></tr>
                          </thead>
                          <tbody>
                            {emp.compensation.history.map((s: any) => (
                              <tr key={s.id}>
                                <td>{formatDate(s.effectiveFrom)}</td>
                                <td>{s.effectiveTo ? formatDate(s.effectiveTo) : 'current'}</td>
                                <td className="edm-num">{rupee(s.basic)}</td>
                                <td className="edm-num">{rupee(s.hra)}</td>
                                <td className="edm-num">{rupee(s.specialAllowance)}</td>
                                <td className="edm-num"><b>{rupee(s.basic + s.hra + s.specialAllowance)}</b></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )
              )}
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: EDM_CSS }} />
    </div>
  );
}

/* ---------------- field ---------------- */

function Field({
  label, value, onChange, editing, type = 'text', options, labels, hint, wide, mono, required, display,
}: {
  label: string; value: any; onChange?: (v: string) => void; editing: boolean;
  type?: 'text' | 'date' | 'select'; options?: string[]; labels?: Record<string, string>;
  hint?: string; wide?: boolean; mono?: boolean; required?: boolean; display?: string;
}) {
  const shown = display ?? (value === '' || value == null ? '—' : String(value));

  return (
    <div className={`edm-field ${wide ? 'is-wide' : ''}`}>
      <label className="edm-label">
        {label}{required && editing && <span className="edm-req"> *</span>}
      </label>

      {editing && onChange ? (
        type === 'select' ? (
          <select className="edm-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {(options ?? []).map((o) => (
              <option key={o} value={o}>{o === '' ? '— none —' : (labels?.[o] ?? o.replace(/_/g, ' '))}</option>
            ))}
          </select>
        ) : (
          <input
            className={`edm-input ${mono ? 'is-mono' : ''}`}
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <span className={`edm-value ${mono ? 'is-mono' : ''}`}>
          {type === 'select' && labels ? (labels[value] ?? shown) : shown}
        </span>
      )}

      {hint && editing && <span className="edm-hint">{hint}</span>}
    </div>
  );
}

/* ---------------- styles ---------------- */

const EDM_CSS = `
.edm-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(9,14,20,.55);
  display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto;
  backdrop-filter:blur(2px);}
.edm-panel{background:var(--color-card,#fff);color:var(--color-text,#111);width:100%;max-width:860px;
  border-radius:14px;border:1px solid var(--color-border,#e5e7eb);
  box-shadow:0 24px 60px -20px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;}
.edm-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;
  border-bottom:1px solid var(--color-border,#e5e7eb);flex-wrap:wrap;}
.edm-ident{display:flex;align-items:center;gap:13px;min-width:0;}
.edm-avatar{width:46px;height:46px;border-radius:11px;background:#2563eb;color:#fff;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;letter-spacing:.02em;}
.edm-name{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em;}
.edm-sub{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--color-text-muted,#6b7280);margin-top:2px;}
.edm-code{font-family:ui-monospace,Consolas,monospace;font-weight:600;color:var(--color-text,#111);}
.edm-head-actions{display:flex;align-items:center;gap:8px;margin-left:auto;}
.edm-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:8px;
  border:1px solid var(--color-border,#e5e7eb);background:var(--color-bg-secondary,#f9fafb);
  color:var(--color-text,#111);font-size:13px;font-weight:600;cursor:pointer;transition:.15s;}
.edm-btn:hover:not(:disabled){border-color:#94a3b8;}
.edm-btn:disabled{opacity:.5;cursor:not-allowed;}
.edm-btn-primary{background:#2563eb;border-color:#2563eb;color:#fff;}
.edm-btn-primary:hover:not(:disabled){background:#1d4ed8;border-color:#1d4ed8;}
.edm-close{border:none;background:none;cursor:pointer;color:var(--color-text-muted,#6b7280);
  padding:5px;border-radius:6px;display:flex;}
.edm-close:hover{background:var(--color-bg-secondary,#f3f4f6);}
.edm-msg{display:flex;align-items:center;gap:9px;padding:11px 22px;font-size:13.5px;font-weight:500;}
.edm-msg-error{background:#fef2f2;color:#b91c1c;border-bottom:1px solid #fecaca;}
.edm-msg-ok{background:#f0fdf4;color:#15803d;border-bottom:1px solid #bbf7d0;}
.edm-tabs{display:flex;gap:2px;padding:0 22px;border-bottom:1px solid var(--color-border,#e5e7eb);
  overflow-x:auto;}
.edm-tab{border:none;background:none;padding:11px 14px;font-size:13px;font-weight:600;cursor:pointer;
  color:var(--color-text-muted,#6b7280);border-bottom:2px solid transparent;margin-bottom:-1px;
  white-space:nowrap;display:inline-flex;align-items:center;}
.edm-tab:hover{color:var(--color-text,#111);}
.edm-tab.is-active{color:#2563eb;border-bottom-color:#2563eb;}
.edm-body{padding:22px;display:flex;flex-direction:column;gap:16px;max-height:62vh;overflow-y:auto;}
.edm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:15px 20px;}
.edm-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
.edm-field.is-wide{grid-column:1/-1;}
.edm-label{font-size:11px;font-weight:700;letter-spacing:.055em;text-transform:uppercase;
  color:var(--color-text-muted,#6b7280);}
.edm-req{color:#dc2626;}
.edm-value{font-size:14px;color:var(--color-text,#111);word-break:break-word;min-height:20px;}
.edm-value.is-mono,.edm-input.is-mono{font-family:ui-monospace,Consolas,monospace;letter-spacing:.01em;}
.edm-input{padding:8px 11px;border:1px solid var(--color-border,#d1d5db);border-radius:8px;font-size:13.5px;
  background:var(--color-bg-secondary,#fff);color:var(--color-text,#111);outline:none;width:100%;}
.edm-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.14);}
.edm-hint{font-size:11.5px;color:var(--color-text-muted,#9ca3af);}
.edm-note{font-size:13px;color:var(--color-text-muted,#6b7280);margin:0;line-height:1.55;}
.edm-dim{color:var(--color-text-muted,#6b7280);font-size:13px;margin:0;}
.edm-warn{display:flex;gap:9px;align-items:flex-start;padding:11px 14px;border-radius:8px;
  background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:13px;line-height:1.5;}
.edm-locked{display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center;
  padding:40px 20px;color:var(--color-text-muted,#6b7280);}
.edm-locked p{margin:0;max-width:44ch;font-size:13.5px;}
.edm-salary-now{display:flex;flex-direction:column;gap:2px;padding:14px 17px;border-radius:10px;
  background:var(--color-bg-secondary,#f8fafc);border:1px solid var(--color-border,#e5e7eb);}
.edm-gross{font-size:25px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
.edm-total{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;
  border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:14px;}
.edm-total b{font-size:17px;font-variant-numeric:tabular-nums;}
.edm-history{display:flex;flex-direction:column;gap:7px;}
.edm-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.edm-table th{text-align:left;padding:7px 9px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--color-text-muted,#6b7280);border-bottom:1px solid var(--color-border,#e5e7eb);}
.edm-table td{padding:7px 9px;border-bottom:1px solid var(--color-border,#f1f5f9);}
.edm-num{text-align:right;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,monospace;}
@media (max-width:640px){.edm-backdrop{padding:0;}.edm-panel{border-radius:0;min-height:100vh;}}
`;
