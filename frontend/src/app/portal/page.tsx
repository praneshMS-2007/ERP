'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, KeyRound, ChevronLeft, Eye, EyeOff, Check, X, RotateCcw } from 'lucide-react';
import { hrmApi } from '../../services/api';
import Modal from '../../components/Modal';
import PageGuard from '../../components/PageGuard';
import { formatDate } from '../../lib/date';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK_LEAVE: 'Sick Leave',
  CASUAL_LEAVE: 'Casual Leave',
  ANNUAL_LEAVE: 'Annual Leave',
  MATERNITY_LEAVE: 'Maternity Leave',
  PATERNITY_LEAVE: 'Paternity Leave',
};

/**
 * HR/Admin's employee-facing hub, repurposed from the old self-service
 * grab-bag: a top-level switch between two full-page sections, Leave
 * Management and Password Reset Requests — never both at once. Employees
 * themselves never land on this route any more — their own self-service
 * pages are /leaves, /attendance, /payroll.
 */
export default function EmployeePortalHrPageGuarded() {
  return (
    <PageGuard module="HR" action="WRITE">
      <EmployeePortalHrPage />
    </PageGuard>
  );
}

function EmployeePortalHrPage() {
  const [activeSection, setActiveSection] = useState<'leaves' | 'resets'>('leaves');
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const [empData, leaveData, resetData] = await Promise.all([
        hrmApi.getEmployees(),
        hrmApi.getLeaves(),
        hrmApi.getPasswordResetRequests(),
      ]);
      setEmployees((Array.isArray(empData) ? empData : []).filter((e: any) => e.status !== 'INACTIVE'));
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setResetRequests(Array.isArray(resetData) ? resetData : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load this page.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await hrmApi.updateLeaveStatus(id, status);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Could not update this leave request.');
    }
  }

  // Undoes an approval — the backend removes the attendance days it
  // auto-marked ABSENT and puts the request back in front of HR to decide
  // again, same as before it was ever approved.
  async function handleRevoke(id: string) {
    if (!confirm("Revoke this approval? The attendance days it marked absent will be removed, and the request goes back to pending.")) return;
    try {
      await hrmApi.updateLeaveStatus(id, 'PENDING');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Could not revoke this approval.');
    }
  }

  const employeeLeaves = selectedEmployee ? leaves.filter((l) => l.employeeId === selectedEmployee.id) : [];
  const pendingResets = resetRequests.filter((r) => r.status === 'PENDING');
  const resolvedResets = resetRequests.filter((r) => r.status !== 'PENDING');

  const pendingLeaveCount = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Employee Request</h1>
          <p>Leave approvals and password reset requests from your team.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      {/* Top-level switch — only one section is ever on screen at once. */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-light)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveSection('leaves')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 700, color: activeSection === 'leaves' ? '#2563eb' : 'var(--color-text-secondary)',
            borderBottom: activeSection === 'leaves' ? '2px solid #2563eb' : '2px solid transparent', marginBottom: '-1px',
          }}
        >
          <CalendarDays size={16} /> Leave Management
          {pendingLeaveCount > 0 && <span className="badge badge-warning" style={{ fontSize: '11px' }}>{pendingLeaveCount}</span>}
        </button>
        <button
          onClick={() => setActiveSection('resets')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 700, color: activeSection === 'resets' ? '#2563eb' : 'var(--color-text-secondary)',
            borderBottom: activeSection === 'resets' ? '2px solid #2563eb' : '2px solid transparent', marginBottom: '-1px',
          }}
        >
          <KeyRound size={16} /> Password Reset Requests
          {pendingResets.length > 0 && <span className="badge badge-warning" style={{ fontSize: '11px' }}>{pendingResets.length}</span>}
        </button>
      </div>

      {/* ================= LEAVE MANAGEMENT (full page) ================= */}
      {activeSection === 'leaves' && (
        <div className="card">
          {selectedEmployee ? (
            <div>
              <button onClick={() => setSelectedEmployee(null)} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
                <ChevronLeft size={14} /> Back to employees
              </button>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
                Every leave request this employee has made from their own account — pending, approved, and declined.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
                {employeeLeaves.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0', gridColumn: '1 / -1' }}>No leave requests from this employee yet.</p>
                ) : employeeLeaves.map((l) => (
                  <div key={l.id} style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</span>
                      <span className={`badge ${l.status === 'APPROVED' ? 'badge-healthy' : l.status === 'REJECTED' ? 'badge-critical' : 'badge-warning'}`}>{l.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>{l.reason}</div>
                    {l.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button onClick={() => handleLeaveStatus(l.id, 'APPROVED')} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: '#dcfce7', color: '#16a34a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => handleLeaveStatus(l.id, 'REJECTED')} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: '#fee2e2', color: '#dc2626', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          <X size={13} /> Decline
                        </button>
                      </div>
                    )}
                    {l.status === 'APPROVED' && (
                      <div style={{ marginTop: '10px' }}>
                        <button onClick={() => handleRevoke(l.id)} title="Undo the approval and remove the attendance days it marked absent" style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-secondary)', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          <RotateCcw size={13} /> Revoke Approval
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Employees</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {loading ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0', gridColumn: '1 / -1' }}>Loading…</p>
                ) : employees.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0', gridColumn: '1 / -1' }}>No active employees.</p>
                ) : employees.map((emp) => {
                  const pendingCount = leaves.filter((l) => l.employeeId === emp.id && l.status === 'PENDING').length;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{emp.firstName} {emp.lastName}</span>
                      {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} pending</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= PASSWORD RESET REQUESTS (full page) ================= */}
      {activeSection === 'resets' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Password Reset Requests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
            ) : pendingResets.length === 0 && resolvedResets.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No password reset requests.</p>
            ) : (
              <>
                {pendingResets.map((r) => {
                  const name = r.user.employee ? `${r.user.employee.firstName} ${r.user.employee.lastName}` : (r.user.username || r.user.email);
                  return (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{r.user.username || r.user.email} · requested {new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                      <button onClick={() => setResetTarget(r)} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        <KeyRound size={13} /> Set Password
                      </button>
                    </div>
                  );
                })}
                {resolvedResets.length > 0 && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '10px' }}>Resolved</div>
                    {resolvedResets.map((r) => {
                      const name = r.user.employee ? `${r.user.employee.firstName} ${r.user.employee.lastName}` : (r.user.username || r.user.email);
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', opacity: 0.65 }}>
                          <span style={{ fontSize: '12.5px' }}>{name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Resolved {r.resolvedAt ? formatDate(r.resolvedAt) : ''}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {resetTarget && (
        <SetPasswordModal
          request={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { setResetTarget(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function SetPasswordModal({ request, onClose, onDone }: { request: any; onClose: () => void; onDone: () => void }) {
  const name = request.user.employee ? `${request.user.employee.firstName} ${request.user.employee.lastName}` : (request.user.username || request.user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (password.length < 8) {
      setError('The new password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await hrmApi.resetUserPassword(request.user.id, password);
      await hrmApi.resolvePasswordResetRequest(request.id);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Could not update this password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Set a new password for ${name}`} width="440px">
      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Their current password stops working the moment you save this. Hand the new one over in person or by phone, never by email.
      </p>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>New password</label>
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <input
          type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters" autoComplete="new-password"
          style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none' }}
        />
        <button type="button" onClick={() => setShowPassword((s) => !s)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Confirm new password</label>
      <input
        type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Type it again" autoComplete="new-password"
        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none', marginBottom: '18px' }}
      />
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save password'}
        </button>
      </div>
    </Modal>
  );
}
