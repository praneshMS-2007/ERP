'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, Check, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { passwordApi } from '../../services/api';

/**
 * Shown to accounts created with a generated temporary password. It is the
 * only page they can reach until they have chosen their own.
 */
export default function ChangePasswordPage() {
  const { user, isLoading, logout, completePasswordChange } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Someone who isn't being asked to change it has no business here.
  useEffect(() => {
    if (!isLoading && user && !user.mustChangePassword) router.replace('/');
  }, [isLoading, user, router]);

  const handle = (user?.username || user?.email?.split('@')[0] || '').toLowerCase();
  const rules = [
    { ok: next.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(next) && /[0-9]/.test(next), text: 'Contains a letter and a number' },
    { ok: next.length > 0 && next !== current, text: 'Different from your temporary password' },
    { ok: next.length > 0 && !(handle && next.toLowerCase().includes(handle)), text: 'Does not contain your username' },
  ];
  const valid = rules.every((r) => r.ok) && next === confirm && current.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      await passwordApi.change(current, next);
      completePasswordChange();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Could not change the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cp-wrap">
      <form className="cp-card" onSubmit={submit}>
        <div className="cp-icon"><ShieldCheck size={26} /></div>
        <h1>Choose your own password</h1>
        <p className="cp-lead">
          {user?.name ? `Welcome, ${user.name}. ` : ''}You signed in with a temporary password. Pick a new one that only you know — you'll use it from now on.
        </p>

        {error && <div className="cp-error" role="alert">{error}</div>}

        <label>Temporary password
          <div className="cp-field"><Lock size={16} />
            <input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </div>
        </label>
        <label>New password
          <div className="cp-field"><Lock size={16} />
            <input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide passwords' : 'Show passwords'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </label>
        <label>Confirm new password
          <div className="cp-field"><Lock size={16} />
            <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
        </label>
        {confirm.length > 0 && next !== confirm && <div className="cp-mismatch">The two new passwords don't match.</div>}

        <ul className="cp-rules">
          {rules.map((r) => (
            <li key={r.text} className={r.ok ? 'ok' : ''}>{r.ok ? <Check size={14} /> : <Circle size={14} />} {r.text}</li>
          ))}
        </ul>

        <button className="cp-submit" type="submit" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
        <button className="cp-out" type="button" onClick={logout}>Sign out instead</button>
      </form>

      <style>{`
.cp-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--color-bg,#f1f5f9);}
.cp-card{width:min(440px,100%);background:var(--color-surface,#fff);color:var(--color-text-primary,#111);border:1px solid var(--color-border,#e5e7eb);border-radius:16px;padding:32px 28px;box-shadow:0 12px 40px rgba(15,23,42,.1);display:flex;flex-direction:column;gap:14px;}
.cp-icon{width:48px;height:48px;border-radius:12px;background:rgba(37,99,235,.12);color:#2563eb;display:flex;align-items:center;justify-content:center;}
.cp-card h1{font-size:22px;font-weight:800;margin:0;text-wrap:balance;}
.cp-lead{margin:0;font-size:14px;line-height:1.5;color:var(--color-text-secondary,#475569);}
.cp-card label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:700;color:var(--color-text-secondary,#475569);}
.cp-field{display:flex;align-items:center;gap:8px;border:1px solid var(--color-border,#d1d5db);border-radius:10px;padding:0 12px;background:var(--color-surface,#fff);color:var(--color-text-muted,#6b7280);}
.cp-field:focus-within{outline:2px solid #93c5fd;border-color:#2563eb;}
.cp-field input{flex:1;min-width:0;border:none;outline:none;padding:11px 0;font-size:15px;background:transparent;color:var(--color-text-primary,#111);}
.cp-field button{border:none;background:none;cursor:pointer;color:inherit;padding:4px;display:flex;}
.cp-error{padding:10px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:600;}
.cp-mismatch{font-size:12.5px;font-weight:600;color:#b91c1c;margin-top:-6px;}
.cp-rules{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--color-text-muted,#6b7280);}
.cp-rules li{display:flex;gap:8px;align-items:center;} .cp-rules li.ok{color:#059669;}
.cp-submit{margin-top:6px;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:700;cursor:pointer;}
.cp-submit:disabled{opacity:.5;cursor:not-allowed;}
.cp-submit:focus-visible,.cp-out:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
.cp-out{border:none;background:none;color:var(--color-text-muted,#6b7280);font-size:13px;cursor:pointer;text-decoration:underline;}
`}</style>
    </div>
  );
}
