'use client';

import { useEffect, useState } from 'react';
import { KeyRound, ShieldOff, Lock } from 'lucide-react';
import { hrmApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import CredentialsPanel from '../../../components/modals/CredentialsPanel';

/**
 * Every ERP login account, with the ability to reset a password.
 *
 * There is no self-service password reset anywhere in the app — this screen
 * is the only place a password can change, and only HR or a super admin can
 * reach it (both in the sidebar, which hides the link, and here, which
 * refuses to render for anyone else even via a direct URL).
 */
export default function UserManagementPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; username: string; password: string } | null>(null);

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

  async function handleReset(user: any) {
    const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user.username || user.email);
    if (!confirm(`Reset the password for ${name}? Their current password will stop working immediately.`)) return;
    setResettingId(user.id);
    try {
      const result = await hrmApi.resetUserPassword(user.id);
      setResetResult({ name, username: result.username, password: result.temporaryPassword });
    } catch (e: any) {
      alert(e.message || 'Could not reset this password.');
    } finally {
      setResettingId(null);
    }
  }

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

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>ERP login accounts. Passwords can only be changed here — there is no self-service reset.</p>
        </div>
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
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={emptyStyle}>Loading accounts…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={emptyStyle}>No accounts found</td></tr>
            ) : users.map((u) => {
              const name = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : '—';
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{name}</div>
                    {u.employee?.empCode && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.employee.empCode} · {u.employee.department?.name}</div>}
                  </td>
                  <td style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13 }}>{u.username || u.email || '—'}</td>
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
                      onClick={() => handleReset(u)}
                      disabled={!u.isActive || resettingId === u.id}
                      title={!u.isActive ? 'This account is revoked — no password to reset' : 'Reset password'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
                        border: '1px solid var(--color-border)', background: 'var(--color-background)',
                        fontSize: 12.5, fontWeight: 600, cursor: u.isActive ? 'pointer' : 'not-allowed',
                        color: u.isActive ? 'var(--color-text)' : 'var(--color-text-muted)', opacity: u.isActive ? 1 : 0.6,
                      }}
                    >
                      <KeyRound size={13} /> {resettingId === u.id ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resetResult && (
        <CredentialsPanel
          isOpen={true}
          onClose={() => setResetResult(null)}
          personName={resetResult.name}
          username={resetResult.username}
          password={resetResult.password}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em',
};
const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' };
