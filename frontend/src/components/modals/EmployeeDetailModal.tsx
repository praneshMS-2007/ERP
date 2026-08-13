'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X, Pencil, Save, RotateCcw, Lock, AlertCircle, CheckCircle2,
  Eye, EyeOff, Upload, Download, Trash2, Laptop,
} from 'lucide-react';
import { hrmApi, API_ORIGIN } from '../../services/api';

interface Props {
  employeeId: string | null;
  onClose: () => void;
  onSaved?: () => void;
  departments: any[];
  designations: any[];
}

type Section = 'personal' | 'employment' | 'background' | 'statutory' | 'compensation' | 'it-access' | 'documents';

/** PAN/Aadhaar/UAN/PF/ESIC — the encrypted-at-rest fields, masked by default in the UI. */
type IdentityFieldKey = 'pan' | 'aadhaarNumber' | 'uanNumber' | 'pfNumber' | 'esicNumber';

/** "ABCDE1234F" -> "XXXXXX234F". Shows only the last 4 characters. */
function maskIdentity(value: string): string {
  if (value.length <= 4) return value;
  return 'X'.repeat(value.length - 4) + value.slice(-4);
}

/** "234567890123" -> "XXXX XXXX 0123", matching the standard Aadhaar grouping. */
function maskAadhaar(value: string): string {
  const masked = maskIdentity(value);
  return masked.replace(/(.{4})(?=.)/g, '$1 ').trim();
}

const DOCUMENT_KINDS = [
  { value: 'AADHAAR_CARD', label: 'Aadhaar Card' },
  { value: 'PAN_CARD', label: 'PAN Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Driving Licence' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'PROFILE_PHOTO', label: 'Profile Photo' },
  { value: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque' },
  { value: 'EDUCATION_CERTIFICATE', label: 'Education Certificate' },
  { value: 'EXPERIENCE_LETTER', label: 'Experience Letter' },
  { value: 'RELIEVING_LETTER', label: 'Relieving Letter' },
  { value: 'PREVIOUS_PAYSLIP', label: 'Previous Payslip' },
  { value: 'NDA_SIGNED', label: 'Signed NDA' },
  { value: 'POLICY_ACKNOWLEDGEMENT', label: 'Policy Acknowledgement' },
  { value: 'OTHER', label: 'Other' },
];
const DOC_LABELS = Object.fromEntries(DOCUMENT_KINDS.map((d) => [d.value, d.label]));

const EMP_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
];
// INACTIVE deliberately excluded — that transition only happens through the
// Remove action in the Employee Directory, which also revokes the login and
// records a last working day. The backend refuses it here either way.
const STATUSES = ['ACTIVE', 'PROBATION', 'ON_LEAVE'];
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

  // PAN/Aadhaar: masked by default, revealed only on explicit action.
  const [revealed, setRevealed] = useState<Set<IdentityFieldKey>>(new Set());

  // IT Access — its own tab, loaded lazily on first visit.
  const [itAccess, setItAccess] = useState<any>(null);
  const [itAccessLoaded, setItAccessLoaded] = useState(false);

  // Documents — its own tab, loaded lazily on first visit.
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [uploadKind, setUploadKind] = useState('AADHAAR_CARD');
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        pan: data.pan ?? '', aadhaarNumber: data.aadhaarNumber ?? '',
        bankAccountNo: data.bankAccountNo ?? '', bankIfsc: data.bankIfsc ?? '',
        sameAsCurrentAddress: data.sameAsCurrentAddress ?? true,
        permanentAddress: data.permanentAddress ?? '',
        emergencyContactName: data.emergencyContactName ?? '',
        emergencyContactPhone: data.emergencyContactPhone ?? '',
        emergencyContactRelation: data.emergencyContactRelation ?? '',
        highestQualification: data.highestQualification ?? '',
        institutionName: data.institutionName ?? '',
        yearOfPassing: data.yearOfPassing != null ? String(data.yearOfPassing) : '',
        previousCompany: data.previousCompany ?? '',
        previousDesignation: data.previousDesignation ?? '',
        totalExperienceYears: data.totalExperienceYears != null ? String(data.totalExperienceYears) : '',
        uanNumber: data.uanNumber ?? '', pfNumber: data.pfNumber ?? '', esicNumber: data.esicNumber ?? '',
        nomineeName: data.nomineeName ?? '', nomineeRelation: data.nomineeRelation ?? '',
        nomineeDob: toDateInput(data.nomineeDob), nomineePhone: data.nomineePhone ?? '',
        taxRegime: data.taxRegime ?? '', taxDeclarationNotes: data.taxDeclarationNotes ?? '',
      });
      setRevealed(new Set());
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

  // Reset per-employee lazy-load state when the modal opens on someone new,
  // so switching between two employees doesn't show stale IT/document data.
  useEffect(() => {
    setItAccessLoaded(false);
    setDocumentsLoaded(false);
    setItAccess(null);
    setDocuments([]);
  }, [employeeId]);

  useEffect(() => {
    if (section !== 'it-access' || itAccessLoaded || !employeeId) return;
    hrmApi.getItAccess(employeeId)
      .then((data) => { setItAccess(data); setItAccessLoaded(true); })
      .catch((e) => setError(e.message || 'Could not load IT access.'));
  }, [section, itAccessLoaded, employeeId]);

  const loadDocuments = useCallback(() => {
    if (!employeeId) return;
    return hrmApi.getDocuments(employeeId)
      .then((data) => { setDocuments(Array.isArray(data) ? data : []); setDocumentsLoaded(true); })
      .catch((e) => setError(e.message || 'Could not load documents.'));
  }, [employeeId]);

  useEffect(() => {
    if (section !== 'documents' || documentsLoaded) return;
    loadDocuments();
  }, [section, documentsLoaded, loadDocuments]);

  async function handleSaveItAccess() {
    setSaving(true);
    setError(null);
    try {
      const updated = await hrmApi.setItAccess(employeeId!, itAccess);
      setItAccess(updated);
      setToast('IT access details saved');
    } catch (e: any) {
      setError(e.message || 'Could not save IT access details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadDocument(file: File) {
    setUploading(true);
    setError(null);
    try {
      await hrmApi.uploadDocument(employeeId!, uploadKind, file);
      setToast(`${DOC_LABELS[uploadKind]} uploaded`);
      await loadDocuments();
    } catch (e: any) {
      setError(e.message || 'Could not upload this file.');
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadAvatar(file: File) {
    setUploadingAvatar(true);
    setError(null);
    try {
      await hrmApi.setAvatar(employeeId!, file);
      setToast('Photo updated');
      await load();
      onSaved?.();
    } catch (e: any) {
      setError(e.message || 'Could not upload this photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteDocument(docId: string, label: string) {
    if (!confirm(`Remove ${label}? This cannot be undone.`)) return;
    try {
      await hrmApi.deleteDocument(employeeId!, docId);
      await loadDocuments();
    } catch (e: any) {
      setError(e.message || 'Could not remove this document.');
    }
  }

  async function handleToggleAgreement(field: 'ndaSigned' | 'policyAcknowledged', value: boolean) {
    setError(null);
    try {
      const updated = await hrmApi.setAgreementStatus(employeeId!, field, value);
      setEmp((prev: any) => ({ ...prev, ...updated }));
    } catch (e: any) {
      setError(e.message || 'Could not update this.');
    }
  }

  function toggleReveal(field: IdentityFieldKey) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  }

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

  async function handleSaveTaxDeclaration() {
    setSaving(true);
    setError(null);
    try {
      await hrmApi.updateEmployee(employeeId!, {
        taxRegime: form.taxRegime || undefined,
        taxDeclarationNotes: form.taxDeclarationNotes || undefined,
      });
      setToast('Tax declaration saved');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not save the tax declaration.');
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
    { id: 'background', label: 'Education & Experience' },
    { id: 'statutory', label: 'Statutory & Bank' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'it-access', label: 'IT Access' },
    { id: 'documents', label: 'Documents' },
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
            <div className="edm-avatar-wrap">
              {emp?.avatarUrl ? (
                <img src={`${API_ORIGIN}${emp.avatarUrl}`} alt="" className="edm-avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="edm-avatar">{initials || '—'}</div>
              )}
              {emp?.canViewFullProfile && (
                <label className="edm-avatar-upload" title="Change photo">
                  {uploadingAvatar ? '…' : <Pencil size={11} />}
                  <input
                    type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                    disabled={uploadingAvatar}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadAvatar(f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
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
              {(t.id === 'statutory' || t.id === 'documents') && emp && !emp.canViewSensitiveIdentity && (
                <Lock size={11} style={{ marginLeft: 5, opacity: 0.65 }} />
              )}
              {(t.id === 'personal' || t.id === 'background') && emp && !emp.canViewFullProfile && (
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
                !emp.canViewFullProfile ? (
                  <div className="edm-locked">
                    <Lock size={20} />
                    <p><b>Personal details are restricted</b></p>
                    <p className="edm-dim">
                      Only HR and administrators can view a colleague's date of birth, address, or emergency
                      contact. The directory shows name, department, designation and work login to everyone.
                    </p>
                  </div>
                ) : (
                <>
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
                  <Field label="Current address" value={form.address} editing={editing} wide
                         onChange={(v) => setForm({ ...form, address: v })} />
                  <Field label="City" value={form.city} editing={editing}
                         onChange={(v) => setForm({ ...form, city: v })} />
                  <Field label="State" value={form.state} editing={editing}
                         onChange={(v) => setForm({ ...form, state: v })} />
                  <Field label="Country" value={form.country} editing={editing}
                         onChange={(v) => setForm({ ...form, country: v })} />
                </div>

                {editing ? (
                  <label className="edm-check-row" style={{ marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={form.sameAsCurrentAddress}
                      onChange={(e) => setForm({ ...form, sameAsCurrentAddress: e.target.checked })}
                    />
                    Permanent address is the same as current
                  </label>
                ) : (
                  <p className="edm-note">
                    Permanent address {emp.sameAsCurrentAddress ? 'is the same as current.' : 'differs from current — see below.'}
                  </p>
                )}
                {(!form.sameAsCurrentAddress || (!editing && !emp.sameAsCurrentAddress)) && (
                  <div className="edm-grid">
                    <Field label="Permanent address" value={form.permanentAddress} editing={editing} wide
                           onChange={(v) => setForm({ ...form, permanentAddress: v })} />
                  </div>
                )}

                <p className="edm-label" style={{ marginTop: 14 }}>Emergency contact</p>
                <div className="edm-grid">
                  <Field label="Name" value={form.emergencyContactName} editing={editing}
                         onChange={(v) => setForm({ ...form, emergencyContactName: v })} />
                  <Field label="Phone" value={form.emergencyContactPhone} editing={editing}
                         onChange={(v) => setForm({ ...form, emergencyContactPhone: v })} />
                  <Field label="Relationship" value={form.emergencyContactRelation} editing={editing}
                         hint="e.g. Parent, Spouse, Sibling"
                         onChange={(v) => setForm({ ...form, emergencyContactRelation: v })} />
                </div>
                </>
                )
              )}

              {section === 'background' && (
                !emp.canViewFullProfile ? (
                  <div className="edm-locked">
                    <Lock size={20} />
                    <p><b>Education &amp; experience are restricted</b></p>
                    <p className="edm-dim">Only HR and administrators can view this.</p>
                  </div>
                ) :
                <>
                  <p className="edm-label">Education</p>
                  <div className="edm-grid">
                    <Field label="Highest qualification" value={form.highestQualification} editing={editing}
                           hint="e.g. B.Tech, MBA"
                           onChange={(v) => setForm({ ...form, highestQualification: v })} />
                    <Field label="Institution" value={form.institutionName} editing={editing}
                           onChange={(v) => setForm({ ...form, institutionName: v })} />
                    <Field label="Year of passing" value={form.yearOfPassing} editing={editing} mono
                           onChange={(v) => setForm({ ...form, yearOfPassing: v })} />
                  </div>
                  <p className="edm-dim" style={{ fontSize: 12.5 }}>
                    Certificates and mark sheets go in the Documents tab, not here.
                  </p>

                  <p className="edm-label" style={{ marginTop: 18 }}>Previous employment</p>
                  <div className="edm-grid">
                    <Field label="Previous company" value={form.previousCompany} editing={editing}
                           onChange={(v) => setForm({ ...form, previousCompany: v })} />
                    <Field label="Previous designation" value={form.previousDesignation} editing={editing}
                           onChange={(v) => setForm({ ...form, previousDesignation: v })} />
                    <Field label="Total experience (years)" value={form.totalExperienceYears} editing={editing} mono
                           hint="Across all previous roles, e.g. 3.5"
                           onChange={(v) => setForm({ ...form, totalExperienceYears: v })} />
                  </div>
                  <p className="edm-dim" style={{ fontSize: 12.5 }}>
                    Experience letters, relieving letters and past payslips go in the Documents tab.
                  </p>
                </>
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
                    PAN and Aadhaar are encrypted in the database and only ever decrypted for HR and
                    administrators — everyone else gets nothing back for these two fields, not just a
                    hidden display. They're masked on screen by default; use the eye icon to reveal one.
                  </p>

                  <div className="edm-grid">
                    {emp.canViewSensitiveIdentity ? (
                      <>
                        <IdentityField
                          label="PAN number" fieldKey="pan" editing={editing}
                          rawValue={emp.pan} formValue={form.pan} revealed={revealed.has('pan')}
                          onToggleReveal={() => toggleReveal('pan')}
                          mask={maskIdentity}
                          hint="5 letters, 4 digits, 1 letter — e.g. QCKPS2002C"
                          onChange={(v) => setForm({ ...form, pan: v.toUpperCase() })}
                        />
                        <IdentityField
                          label="Aadhaar number" fieldKey="aadhaarNumber" editing={editing}
                          rawValue={emp.aadhaarNumber} formValue={form.aadhaarNumber} revealed={revealed.has('aadhaarNumber')}
                          onToggleReveal={() => toggleReveal('aadhaarNumber')}
                          mask={maskAadhaar}
                          hint="12 digits"
                          onChange={(v) => setForm({ ...form, aadhaarNumber: v })}
                        />
                      </>
                    ) : (
                      <>
                        <RestrictedField label="PAN number" />
                        <RestrictedField label="Aadhaar number" />
                      </>
                    )}
                    <Field label="Bank account number" value={form.bankAccountNo} editing={editing} mono
                           hint="9 to 18 digits"
                           onChange={(v) => setForm({ ...form, bankAccountNo: v })} />
                    <Field label="IFSC code" value={form.bankIfsc} editing={editing} mono
                           hint="e.g. HDFC0001234"
                           onChange={(v) => setForm({ ...form, bankIfsc: v.toUpperCase() })} />
                  </div>
                  {(!emp.pan || !emp.bankAccountNo) && emp.canViewSensitiveIdentity && (
                    <div className="edm-warn">
                      <AlertCircle size={15} />
                      <span>
                        Payslips cannot be generated for this employee until the PAN and bank account
                        number are filled in.
                      </span>
                    </div>
                  )}

                  <p className="edm-label" style={{ marginTop: 18 }}>Statutory numbers</p>
                  <p className="edm-dim" style={{ fontSize: 12.5, marginTop: -4 }}>
                    UAN is 12 digits, the same shape as Aadhaar — there is no way to detect the two being
                    swapped by format alone, so double-check before saving.
                  </p>
                  <div className="edm-grid">
                    {emp.canViewSensitiveIdentity ? (
                      <>
                        <IdentityField
                          label="UAN" fieldKey="uanNumber" editing={editing}
                          rawValue={emp.uanNumber} formValue={form.uanNumber} revealed={revealed.has('uanNumber')}
                          onToggleReveal={() => toggleReveal('uanNumber')}
                          mask={maskIdentity}
                          hint="EPFO Universal Account Number — 12 digits"
                          onChange={(v) => setForm({ ...form, uanNumber: v })}
                        />
                        <IdentityField
                          label="PF number" fieldKey="pfNumber" editing={editing}
                          rawValue={emp.pfNumber} formValue={form.pfNumber} revealed={revealed.has('pfNumber')}
                          onToggleReveal={() => toggleReveal('pfNumber')}
                          mask={maskIdentity}
                          hint="No fixed format — entered as-is"
                          onChange={(v) => setForm({ ...form, pfNumber: v })}
                        />
                        <IdentityField
                          label="ESIC number" fieldKey="esicNumber" editing={editing}
                          rawValue={emp.esicNumber} formValue={form.esicNumber} revealed={revealed.has('esicNumber')}
                          onToggleReveal={() => toggleReveal('esicNumber')}
                          mask={maskIdentity}
                          hint="9 to 17 digits"
                          onChange={(v) => setForm({ ...form, esicNumber: v })}
                        />
                      </>
                    ) : (
                      <>
                        <RestrictedField label="UAN" />
                        <RestrictedField label="PF number" />
                        <RestrictedField label="ESIC number" />
                      </>
                    )}
                  </div>

                  <p className="edm-label" style={{ marginTop: 18 }}>Nominee</p>
                  <p className="edm-dim" style={{ fontSize: 12.5, marginTop: -4 }}>
                    For PF, gratuity and insurance purposes — a third party's personal details, so this
                    follows the same HR/Admin-only gate as the rest of a colleague's personal profile.
                  </p>
                  {!emp.canViewFullProfile ? (
                    <div className="edm-grid">
                      <RestrictedField label="Name" />
                      <RestrictedField label="Relationship" />
                      <RestrictedField label="Phone" />
                    </div>
                  ) : (
                    <div className="edm-grid">
                      <Field label="Name" value={form.nomineeName} editing={editing}
                             onChange={(v) => setForm({ ...form, nomineeName: v })} />
                      <Field label="Relationship" value={form.nomineeRelation} editing={editing}
                             onChange={(v) => setForm({ ...form, nomineeRelation: v })} />
                      <Field label="Date of birth" value={form.nomineeDob} display={formatDate(emp.nomineeDob)} type="date"
                             editing={editing} onChange={(v) => setForm({ ...form, nomineeDob: v })} />
                      <Field label="Phone" value={form.nomineePhone} editing={editing}
                             onChange={(v) => setForm({ ...form, nomineePhone: v })} />
                    </div>
                  )}
                </>
              )}

              {section === 'it-access' && (
                <>
                  <p className="edm-note">
                    Existing account identifiers, plus a checklist IT ticks off by hand. This does not create
                    or invite accounts in any of these systems — it only tracks that provisioning happened
                    elsewhere.
                  </p>
                  {!itAccess ? (
                    <p className="edm-dim">Loading…</p>
                  ) : (
                    <>
                      <div className="edm-grid">
                        <Field label="GitHub username" value={itAccess.githubUsername ?? ''} editing
                               onChange={(v) => setItAccess({ ...itAccess, githubUsername: v })} />
                        <Field label="Slack email" value={itAccess.slackEmail ?? ''} editing
                               onChange={(v) => setItAccess({ ...itAccess, slackEmail: v })} />
                        <Field label="Corporate email" value={itAccess.corporateEmail ?? ''} editing
                               hint="Only if different from their ERP login"
                               onChange={(v) => setItAccess({ ...itAccess, corporateEmail: v })} />
                        <Field label="Laptop asset tag" value={itAccess.laptopAssetTag ?? ''} editing
                               onChange={(v) => setItAccess({ ...itAccess, laptopAssetTag: v })} />
                        <Field label="Required software" value={itAccess.softwareNotes ?? ''} editing wide
                               hint="Free text — e.g. VS Code, Docker, Figma"
                               onChange={(v) => setItAccess({ ...itAccess, softwareNotes: v })} />
                      </div>

                      <div className="edm-checklist">
                        <span className="edm-label">Provisioning checklist</span>
                        {[
                          ['laptopAssigned', 'Laptop assigned'],
                          ['slackInvited', 'Invited to Slack'],
                          ['githubAccessGranted', 'GitHub access granted'],
                          ['jiraAccessGranted', 'Jira access granted'],
                          ['awsAccessGranted', 'AWS access granted'],
                        ].map(([key, label]) => (
                          <label key={key} className="edm-check-row">
                            <input
                              type="checkbox"
                              checked={!!itAccess[key]}
                              onChange={(e) => setItAccess({ ...itAccess, [key]: e.target.checked })}
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <button className="edm-btn edm-btn-primary" onClick={handleSaveItAccess} disabled={saving}>
                        <Save size={14} /> {saving ? 'Saving…' : 'Save IT access details'}
                      </button>
                    </>
                  )}
                </>
              )}

              {section === 'documents' && (
                !emp.canViewSensitiveIdentity ? (
                  <div className="edm-locked">
                    <Lock size={20} />
                    <p><b>Documents are restricted</b></p>
                    <p className="edm-dim">Only HR and administrators can view or upload identity documents.</p>
                  </div>
                ) : (
                  <>
                    <p className="edm-note">
                      PDF, JPG or PNG, up to 10MB. Stored outside the public upload path — every read is
                      checked against the same HR/Admin role as PAN and Aadhaar above.
                    </p>

                    <div className="edm-upload-row">
                      <select className="edm-input" value={uploadKind} onChange={(e) => setUploadKind(e.target.value)}>
                        {DOCUMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <label className="edm-btn edm-btn-primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                        <Upload size={14} /> {uploading ? 'Uploading…' : 'Choose file'}
                        <input
                          type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                          disabled={uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDocument(f); e.target.value = ''; }}
                        />
                      </label>
                    </div>

                    {documents.length === 0 ? (
                      <p className="edm-dim">No documents uploaded yet.</p>
                    ) : (
                      <div className="edm-doclist">
                        {documents.map((d) => (
                          <div key={d.id} className="edm-doc-row">
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{DOC_LABELS[d.kind] ?? d.kind}</div>
                              <div className="edm-dim" style={{ fontSize: 12 }}>
                                {d.fileName} · {formatDate(d.issuedAt)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="edm-icon-btn" title="Download"
                                      onClick={() => hrmApi.downloadDocument(employeeId!, d.id, d.fileName).catch((e: any) => setError(e.message || 'Download failed.'))}>
                                <Download size={14} />
                              </button>
                              <button className="edm-icon-btn edm-icon-btn-danger" title="Remove"
                                      onClick={() => handleDeleteDocument(d.id, DOC_LABELS[d.kind] ?? d.kind)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="edm-checklist" style={{ marginTop: 18 }}>
                      <span className="edm-label">Agreements & policies</span>
                      <label className="edm-check-row">
                        <input
                          type="checkbox"
                          checked={!!emp.ndaSigned}
                          onChange={(e) => handleToggleAgreement('ndaSigned', e.target.checked)}
                        />
                        NDA / Confidentiality agreement signed
                        {emp.ndaSigned && emp.ndaSignedAt && (
                          <span className="edm-dim" style={{ fontSize: 12 }}> — {formatDate(emp.ndaSignedAt)}</span>
                        )}
                      </label>
                      <label className="edm-check-row">
                        <input
                          type="checkbox"
                          checked={!!emp.policyAcknowledged}
                          onChange={(e) => handleToggleAgreement('policyAcknowledged', e.target.checked)}
                        />
                        Company policies acknowledged
                        {emp.policyAcknowledged && emp.policyAcknowledgedAt && (
                          <span className="edm-dim" style={{ fontSize: 12 }}> — {formatDate(emp.policyAcknowledgedAt)}</span>
                        )}
                      </label>
                      <span className="edm-dim" style={{ fontSize: 12 }}>
                        The employment agreement itself is the offer letter, generated automatically at onboarding.
                      </span>
                    </div>
                  </>
                )
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

                    <p className="edm-label" style={{ marginTop: 18 }}>Tax declaration</p>
                    <p className="edm-dim" style={{ fontSize: 12.5, marginTop: -4 }}>
                      For TDS purposes. Not a full investment-declaration workflow (Section 80C/80D line
                      items, old-vs-new comparison) — just the regime and free-text notes for now.
                    </p>
                    <div className="edm-grid">
                      <Field label="Tax regime" value={form.taxRegime} editing type="select"
                             options={['', 'OLD', 'NEW']}
                             onChange={(v) => setForm({ ...form, taxRegime: v })} />
                      <Field label="Declaration notes" value={form.taxDeclarationNotes} editing wide
                             hint="Free text — e.g. investment proofs submitted, HRA claimed"
                             onChange={(v) => setForm({ ...form, taxDeclarationNotes: v })} />
                    </div>
                    <button className="edm-btn edm-btn-primary" onClick={handleSaveTaxDeclaration} disabled={saving}>
                      <Save size={14} /> {saving ? 'Saving…' : 'Save tax declaration'}
                    </button>
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

/**
 * PAN/Aadhaar specifically: masked by default with an eye-toggle to reveal,
 * per the team lead's spec. In edit mode it behaves like a normal Field —
 * masking a value you're actively typing over would be actively unhelpful.
 */
function IdentityField({
  label, fieldKey, editing, rawValue, formValue, revealed, onToggleReveal, mask, hint, onChange,
}: {
  label: string; fieldKey: string; editing: boolean;
  rawValue: string | null; formValue: string; revealed: boolean; onToggleReveal: () => void;
  mask: (v: string) => string; hint?: string; onChange: (v: string) => void;
}) {
  if (editing) {
    return <Field label={label} value={formValue} editing mono hint={hint} onChange={onChange} />;
  }

  const hasValue = !!rawValue;
  return (
    <div className="edm-field">
      <label className="edm-label">{label}</label>
      {!hasValue ? (
        <span className="edm-value">—</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="edm-value is-mono">{revealed ? rawValue : mask(rawValue)}</span>
          <button type="button" className="edm-icon-btn" onClick={onToggleReveal}
                  title={revealed ? 'Hide' : 'Reveal'} aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

function RestrictedField({ label }: { label: string }) {
  return (
    <div className="edm-field">
      <label className="edm-label">{label}</label>
      <span className="edm-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
        <Lock size={12} /> HR only
      </span>
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
.edm-avatar-wrap{position:relative;flex-shrink:0;}
.edm-avatar-upload{position:absolute;bottom:-3px;right:-3px;width:19px;height:19px;border-radius:50%;
  background:var(--color-card,#fff);border:1px solid var(--color-border,#e5e7eb);cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:var(--color-text-muted,#6b7280);
  font-size:10px;box-shadow:0 1px 3px rgba(0,0,0,.15);}
.edm-avatar-upload:hover{color:#2563eb;border-color:#2563eb;}
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
.edm-icon-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;
  border-radius:7px;border:1px solid var(--color-border,#e5e7eb);background:var(--color-bg-secondary,#f9fafb);
  color:var(--color-text-muted,#6b7280);cursor:pointer;flex-shrink:0;}
.edm-icon-btn:hover{border-color:#94a3b8;color:var(--color-text,#111);}
.edm-icon-btn-danger:hover{border-color:#fca5a5;color:#dc2626;background:#fef2f2;}
.edm-checklist{display:flex;flex-direction:column;gap:9px;padding:14px 17px;border-radius:10px;
  background:var(--color-bg-secondary,#f8fafc);border:1px solid var(--color-border,#e5e7eb);}
.edm-check-row{display:flex;align-items:center;gap:9px;font-size:13.5px;cursor:pointer;}
.edm-check-row input{width:15px;height:15px;cursor:pointer;}
.edm-upload-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.edm-upload-row select.edm-input{width:auto;min-width:200px;}
.edm-doclist{display:flex;flex-direction:column;gap:8px;}
.edm-doc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;
  border-radius:9px;border:1px solid var(--color-border,#e5e7eb);background:var(--color-bg-secondary,#fff);}
@media (max-width:640px){.edm-backdrop{padding:0;}.edm-panel{border-radius:0;min-height:100vh;}}
`;
