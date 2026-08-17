'use client';

import { useEffect, useState } from 'react';
import { KeyRound, ShieldOff, Lock, Users, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { hrmApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/Modal';

/**
 * Every ERP login account. Split into Active / Former the same way the
 * Employee Directory is — an account only ever leaves Active because the
 * person behind it was removed there (removeEmployee revokes isActive in
 * the same transaction), so the two screens stay in lockstep automatically.
 *
 * Password changes are manual only: HR/Admin type the new password
 * themselves. There is no "generate a random one" option here — that only
 * ever happens once, automatically, at new-employee creation.
 */
export default function UserManagementPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'ACTIVE' | 'FORMER'>('ACTIVE');
  const [passwordTarget, setPasswordTarget] = useState<any | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function copyPassword(id: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const authorised = hasPermission('HR', 'WRITE');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrmApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authorised) load(); }, [authorised]);

  if (!authorised) {
    return (
      <div className="fade-in">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', textAlign: 'center' }}>
          <Lock size={26} style={{ color: 'var(--color-text-muted)' }} />
          <h2 style={{ margin: 0, fontSize: 17 }}>User Management is restricted</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', maxWidth: 420, fontSize: 13.5 }}>
            Only HR and administrators can view or reset ERP login accounts.
          </p>
        </div>
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.isActive);
  const formerUsers = users.filter((u) => !u.isActive);
  const shown = viewTab === 'ACTIVE' ? activeUsers : formerUsers;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>ERP login accounts. Passwords can only be changed here — there is no self-service reset.</p>
        </div>
      </div>

      {/* Tab Toggle — mirrors Employee Directory's Active/Former pattern */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        <button
          onClick={() => setViewTab('ACTIVE')}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: viewTab === 'ACTIVE' ? '#2563eb' : 'transparent',
            color: viewTab === 'ACTIVE' ? '#fff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Active Employees ({activeUsers.length})
        </button>
        <button
          onClick={() => setViewTab('FORMER')}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: viewTab === 'FORMER' ? '#dc2626' : 'transparent',
            color: viewTab === 'FORMER' ? '#fff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          Former Employees ({formerUsers.length})
        </button>
      </div>

      <div className="card">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th style={thStyle}>Person</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Current Password</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={emptyStyle}>Loading accounts…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} style={emptyStyle}>{viewTab === 'ACTIVE' ? 'No active accounts' : 'No former accounts'}</td></tr>
            ) : shown.map((u) => {
              const name = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : '—';
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    {u.employee?.empCode && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.employee.empCode} · {u.employee.department?.name}</div>}
                  </td>
                  <td style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13 }}>{u.username || u.email || '—'}</td>
                  <td>
                    {!u.currentPassword ? (
                      <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>Not available (set before this feature)</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13, letterSpacing: '.02em' }}>
                          {revealedIds.has(u.id) ? u.currentPassword : '•'.repeat(Math.min(u.currentPassword.length, 12))}
                        </code>
                        <button onClick={() => toggleReveal(u.id)} title={revealedIds.has(u.id) ? 'Hide' : 'Show'}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 2 }}>
                          {revealedIds.has(u.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => copyPassword(u.id, u.currentPassword)} title="Copy"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedId === u.id ? '#16a34a' : 'var(--color-text-muted)', display: 'flex', padding: 2 }}>
                          {copiedId === u.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{u.role?.name?.replace(/_/g, ' ') ?? '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: u.isActive ? '#dcfce7' : '#fee2e2', color: u.isActive ? '#16a34a' : '#dc2626',
                    }}>
                      {u.isActive ? 'Active' : <><ShieldOff size={11} /> Revoked</>}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <button
                      onClick={() => setPasswordTarget(u)}
                      disabled={!u.isActive}
                      title={!u.isActive ? 'This account is revoked — no password to change' : 'Set a new password'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
                        border: '1px solid var(--color-border)', background: 'var(--color-background)',
                        fontSize: 12.5, fontWeight: 600, cursor: u.isActive ? 'pointer' : 'not-allowed',
                        color: u.isActive ? 'var(--color-text)' : 'var(--color-text-muted)', opacity: u.isActive ? 1 : 0.6,
                      }}
                    >
                      <KeyRound size={13} /> Set Password
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {passwordTarget && (
        <SetPasswordModal
          user={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onDone={() => { setPasswordTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function SetPasswordModal({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) {
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user.username || user.email);
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
      await hrmApi.resetUserPassword(user.id, password);
      alert(`Password updated for ${name}. Only the new password works from now on — hand it over in person or by phone, never by email.`);
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
        Their current password stops working the moment you save this. Only the password you type below will sign them in from now on.
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

const thStyle: React.CSSProperties = {
  textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em',
};
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' };
