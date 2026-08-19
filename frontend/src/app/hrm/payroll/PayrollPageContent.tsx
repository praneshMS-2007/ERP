'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, IndianRupee, Plus, Check, ChevronLeft, ChevronRight, Users, Edit2, Trash2, Undo2 } from 'lucide-react';
import { hrmApi, exportApi } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';
import Modal, { FormField } from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';
import { formatINR } from '../../../lib/currency';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#dc2626', '#16a34a', '#d97706', '#0891b2', '#db2777'];
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', PAID: 'Paid', REJECTED: 'Returned to HR' };

// mode is which sidebar section this was reached from — HR Management or
// Finance — not a permission check by itself (that still happens per role
// below). It's what keeps "Add Payroll" off the Finance side and "Mark
// Paid"/"Return to HR" off the HR side, for every role including Super
// Admin, so the two sides of the workflow never blur together in the UI
// even for someone who technically has full access to both.
export default function PayrollPageContent({ mode }: { mode: 'hr' | 'finance' }) {
  const { user } = useAuth();
  const canCreatePayroll = mode === 'hr' && (user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER');
  const canMarkPaid = mode === 'finance' && (user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_MANAGER');
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  // Same "pick a person, then see their own records" pattern as the
  // Projects Tasks/Timesheet tabs — Active/Former mirrors the Employee
  // Directory exactly, so nobody can accidentally run payroll for someone
  // who no longer shows up there (see createPayroll's server-side check).
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Default the range to the current calendar month — still just a
  // starting point, both ends are freely editable via the date pickers.
  // Built from local date parts, not toISOString() — that converts through
  // UTC first, which in a timezone ahead of UTC (e.g. IST) shifts local
  // midnight back a day and defaults to the wrong month boundary.
  function toLocalDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const today = new Date();
  const firstOfMonth = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastOfMonth = toLocalDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const defaultForm = { periodStart: firstOfMonth, periodEnd: lastOfMonth, baseSalary: '', bonus: '', deductions: '' };
  const [form, setForm] = useState(defaultForm);

  // Return to HR — Finance's way of sending a record back with a reason
  // instead of paying it; HR sees the reason and edits/resubmits.
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTargetId, setReturnTargetId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState<string | null>(null);

  // What actually gets stored as payPeriod — a readable label derived from
  // the two dates chosen in the calendar pickers, e.g. "1 Aug 2026 – 31 Aug
  // 2026". The backend field is still just one free-text string, so this is
  // computed client-side rather than changing the data model.
  //
  // "YYYY-MM-DD" (what a date input gives us) parses as UTC midnight per the
  // JS spec — in a timezone behind UTC that rolls back to the previous
  // local day. Parsed by hand here instead of new Date(str), so the label
  // always matches what's shown in the picker, in any timezone.
  function formatPeriodLabel(startStr: string, endStr: string) {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const parseLocal = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parseLocal(startStr).toLocaleDateString(undefined, opts);
    const end = parseLocal(endStr).toLocaleDateString(undefined, opts);
    return `${start} – ${end}`;
  }

  async function fetchAll() {
    const [payData, empData] = await Promise.all([hrmApi.getPayrolls(), hrmApi.getEmployees()]);
    setPayrolls(Array.isArray(payData) ? payData : []);
    setEmployees(Array.isArray(empData) ? empData : []);
  }

  useEffect(() => { fetchAll(); }, []);

  const activeEmployees = employees.filter((e) => e.status !== 'INACTIVE');
  const formerEmployees = employees.filter((e) => e.status === 'INACTIVE');

  const totalDisbursed = payrolls.filter((p) => p.status === 'PAID').reduce((s, p) => s + (p.netPay || 0), 0);
  const pendingTotal = payrolls.filter((p) => p.status === 'DRAFT').reduce((s, p) => s + (p.netPay || 0), 0);
  const pendingCount = payrolls.filter((p) => p.status === 'DRAFT').length;

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedIsActive = selectedEmployee?.status !== 'INACTIVE';
  const selectedPayrolls = payrolls.filter((p) => p.employeeId === selectedEmployeeId);

  function openAddModal() {
    setEditingPayroll(null);
    setForm(defaultForm);
    setRunError(null);
    setShowRunModal(true);
  }

  function openEditModal(p: any) {
    setEditingPayroll(p);
    setForm({ ...defaultForm, baseSalary: String(p.baseSalary ?? ''), bonus: String(p.bonus ?? ''), deductions: String(p.deductions ?? '') });
    setRunError(null);
    setShowRunModal(true);
  }

  async function handleSaveModal() {
    if (!form.baseSalary) return;
    setRunError(null);
    try {
      if (editingPayroll) {
        await hrmApi.updatePayroll(editingPayroll.id, {
          baseSalary: parseFloat(form.baseSalary),
          bonus: parseFloat(form.bonus || '0'),
          deductions: parseFloat(form.deductions || '0'),
        });
      } else {
        if (!selectedEmployeeId || !form.periodStart || !form.periodEnd) return;
        if (new Date(form.periodEnd) < new Date(form.periodStart)) {
          setRunError('The end date cannot be before the start date.');
          return;
        }
        await hrmApi.createPayroll({
          employeeId: selectedEmployeeId,
          payPeriod: formatPeriodLabel(form.periodStart, form.periodEnd),
          baseSalary: parseFloat(form.baseSalary),
          bonus: parseFloat(form.bonus || '0'),
          deductions: parseFloat(form.deductions || '0'),
        });
      }
      setShowRunModal(false);
      setEditingPayroll(null);
      setForm(defaultForm);
      fetchAll();
    } catch (e: any) {
      setRunError(e.message || 'Could not save this payroll record.');
    }
  }

  async function handleMarkPaid(id: string) {
    const result = await hrmApi.updatePayrollStatus(id, 'PAID');
    fetchAll();
    const payslip = result?.payslip;
    if (payslip && !payslip.emailed) {
      alert(`Payroll marked paid, but the payslip email did not go out: ${payslip.error || 'unknown error'}. The record is still paid — you can address this separately.`);
    }
  }

  function openReturnModal(id: string) {
    setReturnTargetId(id);
    setReturnReason('');
    setReturnError(null);
    setShowReturnModal(true);
  }

  async function handleReturnToHR() {
    if (!returnTargetId) return;
    if (!returnReason.trim()) {
      setReturnError('A reason is required so HR knows what to fix.');
      return;
    }
    try {
      await hrmApi.updatePayrollStatus(returnTargetId, 'REJECTED', returnReason.trim());
      setShowReturnModal(false);
      fetchAll();
    } catch (e: any) {
      setReturnError(e.message || 'Could not return this record to HR.');
    }
  }

  async function handleDeletePayroll(id: string) {
    if (!confirm('Delete this payroll record? This cannot be undone.')) return;
    try {
      await hrmApi.deletePayroll(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this payroll record.');
    }
  }

  const badgeClass = (s: string) => {
    if (s === 'PAID') return 'badge badge-healthy';
    if (s === 'DRAFT') return 'badge badge-warning';
    if (s === 'REJECTED') return 'badge badge-critical';
    return 'badge';
  };

  const initialsOf = (e: any) => `${e.firstName?.charAt(0) || ''}${e.lastName?.charAt(0) || ''}`.toUpperCase();
  const colorOf = (e: any) => AVATAR_COLORS[((e.firstName?.length || 0) + (e.lastName?.length || 0)) % AVATAR_COLORS.length];

  function EmployeeRow({ e }: { e: any }) {
    const count = payrolls.filter((p) => p.employeeId === e.id).length;
    return (
      <button
        onClick={() => setSelectedEmployeeId(e.id)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left',
          padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)',
          cursor: 'pointer', marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: colorOf(e), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {initialsOf(e)}
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{e.firstName} {e.lastName}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{e.department?.name || 'Unassigned'} · {e.designation?.title || '—'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{count} record{count === 1 ? '' : 's'}</span>
          <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      </button>
    );
  }

  // ================= EMPLOYEE LIST VIEW =================
  if (!selectedEmployeeId) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div>
            <h1>Payroll Management</h1>
            <p>Select an employee to view or {mode === 'hr' ? 'run' : 'release'} their payroll.</p>
          </div>
          <div className="page-header-actions">
            <ExportButton onExport={(format) => exportApi.exportEmployees(format)} label="Export CSV" />
          </div>
        </div>

        <div className="kpi-grid" style={{ marginBottom: '24px' }}>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-label">Total Disbursed</div>
              <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><IndianRupee size={20} /></div>
            </div>
            <div className="kpi-card-value">{formatINR(totalDisbursed)}</div>
            <div className="kpi-card-trend up">Paid payrolls</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-label">Pending Payment</div>
              <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={20} /></div>
            </div>
            <div className="kpi-card-value">{formatINR(pendingTotal)}</div>
            <div className="kpi-card-trend neutral">{pendingCount} record{pendingCount === 1 ? '' : 's'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-label">Total Records</div>
              <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><FileText size={20} /></div>
            </div>
            <div className="kpi-card-value">{payrolls.length}</div>
            <div className="kpi-card-trend neutral">All time</div>
          </div>
        </div>

        {/* Active Employees / Former Employees — stacked vertically, same
            split as Employee Directory, so nobody who's left the company
            can be mistaken for someone payroll can still be run for. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              <Users size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Active Employees ({activeEmployees.length})
            </h3>
            {activeEmployees.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>No active employees.</p>
            ) : activeEmployees.map((e) => <EmployeeRow key={e.id} e={e} />)}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#dc2626' }}>
              Former Employees ({formerEmployees.length})
            </h3>
            {formerEmployees.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>No former employees.</p>
            ) : formerEmployees.map((e) => <EmployeeRow key={e.id} e={e} />)}
          </div>
        </div>
      </div>
    );
  }

  // ================= SELECTED EMPLOYEE'S PAYROLL =================
  return (
    <div className="fade-in">
      <button onClick={() => setSelectedEmployeeId(null)} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
        <ChevronLeft size={14} /> Back to all employees
      </button>

      <div className="page-header">
        <div>
          <h1>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</h1>
          <p>
            {selectedEmployee?.department?.name || 'Unassigned'} · {selectedEmployee?.designation?.title || '—'}
            {!selectedIsActive && <span style={{ color: '#dc2626', fontWeight: 600 }}> — Former employee</span>}
          </p>
        </div>
        <div className="page-header-actions">
          {mode === 'hr' && selectedIsActive && canCreatePayroll && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} /> Add Payroll
            </button>
          )}
          {mode === 'hr' && !selectedIsActive && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Payroll can't be started for a former employee.</span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Payroll Records ({selectedPayrolls.length})</h3>
        <table className="data-table">
          <thead><tr><th>Pay Period</th><th>Base Salary</th><th>Bonus</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {selectedPayrolls.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                {mode === 'hr' && selectedIsActive
                  ? (canCreatePayroll ? 'No payroll records yet. Click "Add Payroll" to create one.' : 'No payroll records yet.')
                  : 'No payroll records for this person.'}
              </td></tr>
            ) : selectedPayrolls.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.payPeriod || '—'}
                  {p.status === 'REJECTED' && p.rejectedReason && (
                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', maxWidth: '220px' }}>Returned: {p.rejectedReason}</div>
                  )}
                </td>
                <td>{formatINR(p.baseSalary || 0)}</td>
                <td style={{ color: '#16a34a' }}>+{formatINR(p.bonus || 0)}</td>
                <td style={{ color: '#dc2626' }}>-{formatINR(p.deductions || 0)}</td>
                <td style={{ fontWeight: 700 }}>{formatINR(p.netPay || 0)}</td>
                <td><span className={badgeClass(p.status)}>{STATUS_LABEL[p.status] || p.status}</span></td>
                <td>
                  {mode === 'finance' && p.status === 'DRAFT' && canMarkPaid && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleMarkPaid(p.id)} style={{ gap: '4px' }}>
                        <Check size={14} /> Mark Paid
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openReturnModal(p.id)} style={{ gap: '4px' }}>
                        <Undo2 size={14} /> Return to HR
                      </button>
                    </div>
                  )}
                  {mode === 'finance' && p.status !== 'DRAFT' && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {p.status === 'REJECTED' ? 'Awaiting HR' : ''}
                    </span>
                  )}
                  {mode === 'hr' && p.status !== 'PAID' && canCreatePayroll && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(p)} style={{ gap: '4px' }}>
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => handleDeletePayroll(p.id)} title="Delete"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', padding: '4px' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                  {mode === 'hr' && p.status === 'DRAFT' && !canCreatePayroll && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Awaiting Finance</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT PAYROLL MODAL — employee is already fixed by context, so
          there's no picker here (that's what removed the "12 vs 11" bug:
          this modal can only ever be reached for someone in Active
          Employees above). Editing keeps the original pay period fixed —
          only the amounts change — to avoid re-parsing a stored label back
          into a date range. */}
      <Modal isOpen={showRunModal} onClose={() => setShowRunModal(false)} title={`${editingPayroll ? 'Edit' : 'Add'} Payroll — ${selectedEmployee?.firstName} ${selectedEmployee?.lastName}`}>
        {runError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{runError}</div>
        )}
        {editingPayroll ? (
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Pay period: <strong>{editingPayroll.payPeriod}</strong>
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <FormField label="Period Start" type="date" value={form.periodStart} onChange={(v) => setForm({ ...form, periodStart: v })} required />
              </div>
              <div style={{ flex: 1 }}>
                <FormField label="Period End" type="date" value={form.periodEnd} onChange={(v) => setForm({ ...form, periodEnd: v })} required />
              </div>
            </div>
            {form.periodStart && form.periodEnd && (
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
                Pay period: <strong>{formatPeriodLabel(form.periodStart, form.periodEnd)}</strong>
              </p>
            )}
          </>
        )}
        <FormField label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => setForm({ ...form, baseSalary: v })} required placeholder="5000" />
        <FormField label="Bonus" type="number" value={form.bonus} onChange={(v) => setForm({ ...form, bonus: v })} placeholder="500" />
        <FormField label="Deductions" type="number" value={form.deductions} onChange={(v) => setForm({ ...form, deductions: v })} placeholder="200" />
        <div style={{ background: 'var(--color-background)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Calculated Net Pay</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
            {formatINR((parseFloat(form.baseSalary || '0') + parseFloat(form.bonus || '0') - parseFloat(form.deductions || '0')))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowRunModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveModal}>{editingPayroll ? 'Save Changes' : 'Add Payroll'}</button>
        </div>
      </Modal>

      {/* RETURN TO HR MODAL — Finance-only. */}
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Return to HR" width="440px">
        {returnError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{returnError}</div>
        )}
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          This sends the record back to HR without paying it. Explain what needs fixing — HR will see this note.
        </p>
        <FormField label="Reason" type="textarea" value={returnReason} onChange={setReturnReason} required placeholder="e.g. Bonus amount looks wrong for this period." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleReturnToHR}>Return to HR</button>
        </div>
      </Modal>
    </div>
  );
}
