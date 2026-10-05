'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, Crown, Pencil, Trash2, Save, X, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import { hrmApi, teamsApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Modal, { FormField } from '../../../components/Modal';
import { useRefreshTick } from '@/lib/refresh';

interface Member {
  id: string; employeeId: string; role: 'HEAD' | 'MEMBER'; revenueSharePct: number | null;
  employee: { id: string; firstName: string; lastName: string; empCode: string | null; designation?: { title: string } | null };
}
interface Team { id: string; name: string; description: string | null; isActive: boolean; members: Member[]; totalSharePct: number }
interface RevenueRow { teamId: string; name: string; amount: number | null; enteredByName: string | null; updatedAt: string | null; sharedPct: number }
interface EditRow { employeeId: string; role: 'HEAD' | 'MEMBER'; revenueSharePct: string }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (p: string) => { const [y, m] = p.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }); };
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`.trim();

export default function TeamsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const refreshTick = useRefreshTick();

  const [teams, setTeams] = useState<Team[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [period, setPeriod] = useState(thisMonth());
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [revDraft, setRevDraft] = useState<Record<string, string>>({});
  const [savingRev, setSavingRev] = useState(false);

  const [teamDialog, setTeamDialog] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [membersFor, setMembersFor] = useState<Team | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, e] = await Promise.all([teamsApi.list(), canManage ? hrmApi.getEmployees() : Promise.resolve([])]);
      setTeams(Array.isArray(t) ? t : []);
      setPeople((Array.isArray(e) ? e : []).filter((p: any) => p.status !== 'INACTIVE'));
    } catch (err: any) {
      setError(err.message || 'Could not load teams.');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const loadRevenue = useCallback(async (p: string) => {
    try {
      const r = await teamsApi.getRevenue(p);
      setRevenue(r.teams ?? []);
      setRevDraft(Object.fromEntries((r.teams ?? []).map((x: RevenueRow) => [x.teamId, x.amount != null ? String(x.amount) : ''])));
    } catch (err: any) {
      setError(err.message || 'Could not load revenue.');
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshTick]);
  useEffect(() => { loadRevenue(period); }, [loadRevenue, period, refreshTick]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 4000); return () => clearTimeout(t); }, [notice]);

  const revDirty = revenue.some((r) => (r.amount != null ? String(r.amount) : '') !== (revDraft[r.teamId] ?? ''));

  async function saveRevenue() {
    for (const r of revenue) {
      const v = revDraft[r.teamId] ?? '';
      if (v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) { setError(`Revenue for ${r.name} must be a number of zero or more.`); return; }
    }
    setSavingRev(true); setError(null);
    try {
      const r = await teamsApi.setRevenue(period, revenue.map((x) => ({ teamId: x.teamId, amount: (revDraft[x.teamId] ?? '') === '' ? null : Number(revDraft[x.teamId]) })));
      setRevenue(r.teams ?? []);
      setNotice(`Revenue for ${monthLabel(period)} saved.`);
    } catch (err: any) {
      setError(err.message || 'Could not save revenue.');
    } finally {
      setSavingRev(false);
    }
  }

  async function saveTeam() {
    if (!teamDialog) return;
    setBusy(true); setDialogError(null);
    try {
      if (teamDialog.id) await teamsApi.update(teamDialog.id, { name: teamDialog.name, description: teamDialog.description });
      else await teamsApi.create({ name: teamDialog.name, description: teamDialog.description });
      setNotice(teamDialog.id ? 'Team updated.' : `${teamDialog.name.trim()} created.`);
      setTeamDialog(null);
      await Promise.all([load(), loadRevenue(period)]);
    } catch (err: any) {
      setDialogError(err.message || 'Could not save the team.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(t: Team) {
    try {
      await teamsApi.update(t.id, { isActive: !t.isActive });
      setNotice(t.isActive ? `${t.name} paused — its members get no revenue share while paused.` : `${t.name} is active again.`);
      await Promise.all([load(), loadRevenue(period)]);
    } catch (err: any) { setError(err.message || 'Could not update the team.'); }
  }

  async function deleteTeam(t: Team) {
    if (!confirm(`Delete ${t.name}?\n\nIts ${t.members.length} member(s) leave the team and its revenue history is removed. Payroll already created keeps its own figures.`)) return;
    try {
      await teamsApi.remove(t.id);
      setNotice(`${t.name} deleted.`);
      await Promise.all([load(), loadRevenue(period)]);
    } catch (err: any) { setError(err.message || 'Could not delete the team.'); }
  }

  function openMembers(t: Team) {
    setMembersFor(t);
    setDialogError(null);
    setRows(t.members.map((m) => ({ employeeId: m.employeeId, role: m.role, revenueSharePct: m.revenueSharePct != null ? String(m.revenueSharePct) : '' })));
  }

  const rowTotal = useMemo(() => rows.reduce((s, r) => s + (Number(r.revenueSharePct) || 0), 0), [rows]);

  async function saveMembers() {
    if (!membersFor) return;
    if (rows.some((r) => !r.employeeId)) { setDialogError('Choose a person in every row, or remove the empty row.'); return; }
    if (rows.filter((r) => r.role === 'HEAD').length > 1) { setDialogError('A team can have only one Head.'); return; }
    if (rowTotal > 100) { setDialogError(`Shares add up to ${+rowTotal.toFixed(2)}% — the total can't be more than 100%.`); return; }
    setBusy(true); setDialogError(null);
    try {
      await teamsApi.setMembers(membersFor.id, rows.map((r) => ({ employeeId: r.employeeId, role: r.role, revenueSharePct: r.revenueSharePct === '' ? null : Number(r.revenueSharePct) })));
      setNotice(`${membersFor.name} members saved.`);
      setMembersFor(null);
      await Promise.all([load(), loadRevenue(period)]);
    } catch (err: any) {
      setDialogError(err.message || 'Could not save members.');
    } finally {
      setBusy(false);
    }
  }

  const sharedTotal = (t: Team) => t.totalSharePct || 0;

  return (
    <>
      <div className="tm fade-in">
        <div className="page-header">
          <div>
            <h1>Teams</h1>
            <p>Group people into teams, choose each team&apos;s Head, and enter the revenue each team earns every month. People on a revenue share are paid their % of it in payroll.</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => { setDialogError(null); setTeamDialog({ name: '', description: '' }); }}>
              <Plus size={16} /> New team
            </button>
          )}
        </div>

        {error && <div className="tm-alert bad"><AlertCircle size={16} /> {error}</div>}
        {notice && <div className="tm-alert ok"><CheckCircle2 size={16} /> {notice}</div>}

        {/* Monthly revenue */}
        <section className="card tm-rev">
          <div className="tm-rev-head">
            <div>
              <h2><IndianRupee size={17} /> Monthly team revenue</h2>
              <p>Payroll can&apos;t include a revenue share for a month until that team&apos;s revenue for the month is entered here.</p>
            </div>
            <label className="tm-month">
              <span>Month</span>
              <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
            </label>
          </div>
          {revenue.length === 0 ? (
            <p className="tm-muted">{loading ? 'Loading…' : canManage ? 'No active teams yet — create one with “New team”.' : 'No active teams yet.'}</p>
          ) : (
            <div className="tm-table-wrap">
              <table className="tm-table">
                <thead><tr><th>Team</th><th>Shared with members</th><th>Revenue for {monthLabel(period)}</th><th>Last entered</th></tr></thead>
                <tbody>
                  {revenue.map((r) => {
                    const v = revDraft[r.teamId] ?? '';
                    const paidOut = v !== '' && Number(v) >= 0 ? (Number(v) * r.sharedPct) / 100 : null;
                    return (
                      <tr key={r.teamId}>
                        <td><b>{r.name}</b></td>
                        <td className="tm-num">{r.sharedPct}%{paidOut != null && r.sharedPct > 0 && <div className="tm-sub">{inr(paidOut)} paid out as shares</div>}</td>
                        <td>
                          <div className="tm-money">
                            <span>₹</span>
                            <input type="number" min="0" inputMode="decimal" placeholder="Not entered" value={v}
                                   aria-label={`${r.name} revenue for ${monthLabel(period)}`}
                                   onChange={(e) => setRevDraft({ ...revDraft, [r.teamId]: e.target.value })} />
                          </div>
                        </td>
                        <td className="tm-sub">{r.enteredByName ? `${r.enteredByName}${r.updatedAt ? ` · ${new Date(r.updatedAt).toLocaleDateString('en-IN')}` : ''}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {revenue.length > 0 && (
            <div className="tm-actions">
              <button className="btn btn-primary" onClick={saveRevenue} disabled={savingRev || !revDirty}><Save size={14} /> {savingRev ? 'Saving…' : 'Save revenue'}</button>
            </div>
          )}
        </section>

        {/* Teams */}
        <div className="tm-grid">
          {!loading && teams.length === 0 && (
            <div className="card tm-empty">
              <Users size={28} />
              <p>No teams yet.{canManage ? ' Create your first team, then add people as Head or Member.' : ''}</p>
            </div>
          )}
          {teams.map((t) => {
            const head = t.members.find((m) => m.role === 'HEAD');
            return (
              <section className={`card tm-team ${t.isActive ? '' : 'is-paused'}`} key={t.id}>
                <header>
                  <div>
                    <h3>{t.name} {!t.isActive && <span className="tm-chip">Paused</span>}</h3>
                    <div className="tm-sub">{head ? <>Head: <b>{fullName(head.employee)}</b></> : 'No Head yet'} · {t.members.length} {t.members.length === 1 ? 'person' : 'people'}</div>
                    {t.description && <p className="tm-desc">{t.description}</p>}
                  </div>
                  {canManage && (
                    <div className="tm-icons">
                      <button onClick={() => { setDialogError(null); setTeamDialog({ id: t.id, name: t.name, description: t.description ?? '' }); }} aria-label={`Rename ${t.name}`} title="Rename"><Pencil size={14} /></button>
                      <button onClick={() => deleteTeam(t)} aria-label={`Delete ${t.name}`} title="Delete" className="danger"><Trash2 size={14} /></button>
                    </div>
                  )}
                </header>

                <div className="tm-bar" title={`${sharedTotal(t)}% of revenue shared`}>
                  <div style={{ width: `${Math.min(100, sharedTotal(t))}%` }} />
                </div>
                <div className="tm-sub">{sharedTotal(t)}% of this team&apos;s revenue is shared with members</div>

                {t.members.length > 0 ? (
                  <ul className="tm-members">
                    {t.members.map((m) => (
                      <li key={m.id}>
                        <span className="tm-who">
                          {m.role === 'HEAD' && <Crown size={13} aria-label="Head" />}
                          {fullName(m.employee)} <span className="tm-sub">{m.employee.empCode}</span>
                        </span>
                        <span className={`tm-role ${m.role === 'HEAD' ? 'head' : ''}`}>{m.role === 'HEAD' ? 'Head' : 'Member'}</span>
                        <span className="tm-num">{m.revenueSharePct ? `${m.revenueSharePct}%` : '—'}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="tm-muted">Nobody in this team yet.</p>}

                {canManage && (
                  <div className="tm-actions">
                    <button className="btn btn-secondary" onClick={() => toggleActive(t)}>{t.isActive ? 'Pause team' : 'Make active'}</button>
                    <button className="btn btn-primary" onClick={() => openMembers(t)}><Users size={14} /> Edit members</button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* New / rename team */}
      <Modal isOpen={!!teamDialog} onClose={() => !busy && setTeamDialog(null)} title={teamDialog?.id ? 'Rename team' : 'New team'} width="440px">
        {dialogError && <div className="tm-alert bad"><AlertCircle size={16} /> {dialogError}</div>}
        <FormField label="Team name" value={teamDialog?.name ?? ''} onChange={(v) => setTeamDialog((d) => d && { ...d, name: v })} required placeholder="e.g. Sunrisers" />
        <FormField label="Description (optional)" value={teamDialog?.description ?? ''} onChange={(v) => setTeamDialog((d) => d && { ...d, description: v })} placeholder="What this team does" />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => setTeamDialog(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={saveTeam} disabled={busy || !teamDialog?.name.trim()}>{busy ? 'Saving…' : teamDialog?.id ? 'Save' : 'Create team'}</button>
        </div>
      </Modal>

      {/* Members */}
      <Modal isOpen={!!membersFor} onClose={() => !busy && setMembersFor(null)} title={`${membersFor?.name ?? ''} — members`} width="640px">
        {dialogError && <div className="tm-alert bad"><AlertCircle size={16} /> {dialogError}</div>}
        <p className="tm-muted" style={{ marginTop: 0 }}>One Head per team. Leave the share empty for people who aren&apos;t paid from this team&apos;s revenue. Shares can add up to 100% at most.</p>
        <div className="tm-rows">
          {rows.map((r, i) => (
            <div className="tm-row" key={i}>
              <select value={r.employeeId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, employeeId: e.target.value } : x)))} aria-label="Person">
                <option value="">Choose person…</option>
                {people.map((p) => <option key={p.id} value={p.id} disabled={rows.some((x, j) => j !== i && x.employeeId === p.id)}>{fullName(p)}{p.empCode ? ` (${p.empCode})` : ''}</option>)}
              </select>
              <select value={r.role} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, role: e.target.value as EditRow['role'] } : x)))} aria-label="Position">
                <option value="MEMBER">Member</option>
                <option value="HEAD">Head</option>
              </select>
              <div className="tm-pct">
                <input type="number" min="0" max="100" step="0.01" placeholder="No share" value={r.revenueSharePct} aria-label="Revenue share percent"
                       onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, revenueSharePct: e.target.value } : x)))} />
                <span>%</span>
              </div>
              <button className="tm-x" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove person"><X size={14} /></button>
            </div>
          ))}
          <button className="tm-add" onClick={() => setRows([...rows, { employeeId: '', role: 'MEMBER', revenueSharePct: '' }])}><Plus size={14} /> Add person</button>
        </div>
        <div className={`tm-total ${rowTotal > 100 ? 'over' : ''}`}>Total shared: <b>{+rowTotal.toFixed(2)}%</b> of revenue</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={() => setMembersFor(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={saveMembers} disabled={busy}>{busy ? 'Saving…' : 'Save members'}</button>
        </div>
      </Modal>

      <style jsx>{`
        .tm { display: flex; flex-direction: column; gap: 20px; }
        .tm-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
        .tm-alert.bad { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .tm-alert.ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
        .tm-rev-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
        .tm-rev-head h2 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 6px; margin: 0 0 4px; }
        .tm-rev-head p { margin: 0; font-size: 13px; color: var(--color-text-muted); max-width: 60ch; }
        .tm-month { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
        .tm-month input, .tm-money input, .tm-row select, .tm-row input { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text); font-size: 13.5px; min-width: 0; }
        .tm-table-wrap { overflow-x: auto; }
        .tm-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .tm-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted); padding: 8px 10px; border-bottom: 1px solid var(--color-border); }
        .tm-table td { padding: 10px; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
        .tm-money { display: flex; align-items: center; gap: 6px; max-width: 220px; }
        .tm-money span { color: var(--color-text-muted); }
        .tm-money input { width: 100%; font-variant-numeric: tabular-nums; }
        .tm-num { font-variant-numeric: tabular-nums; }
        .tm-sub { font-size: 12px; color: var(--color-text-muted); }
        .tm-muted { font-size: 13px; color: var(--color-text-muted); }
        .tm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .tm-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--color-text-muted); text-align: center; padding: 32px; }
        .tm-team { display: flex; flex-direction: column; gap: 8px; }
        .tm-team.is-paused { opacity: 0.75; }
        .tm-team header { display: flex; justify-content: space-between; gap: 12px; }
        .tm-team h3 { font-size: 16px; font-weight: 700; margin: 0 0 2px; display: flex; align-items: center; gap: 8px; }
        .tm-desc { margin: 6px 0 0; font-size: 13px; color: var(--color-text-secondary); }
        .tm-chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; }
        .tm-icons { display: flex; gap: 6px; }
        .tm-icons button, .tm-x { border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text-muted); border-radius: 8px; padding: 7px; cursor: pointer; display: flex; height: fit-content; }
        .tm-icons button.danger:hover { color: #dc2626; border-color: #fecaca; }
        .tm-bar { height: 6px; border-radius: 999px; background: var(--color-bg-secondary); overflow: hidden; margin-top: 4px; }
        .tm-bar div { height: 100%; background: #2563eb; border-radius: 999px; }
        .tm-members { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; }
        .tm-members li { display: grid; grid-template-columns: minmax(0, 1fr) auto 56px; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--color-border); font-size: 13.5px; }
        .tm-members li .tm-num { text-align: right; }
        .tm-who { display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tm-who :global(svg) { color: #d97706; flex-shrink: 0; }
        .tm-role { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--color-bg-secondary); color: var(--color-text-secondary); }
        .tm-role.head { background: #fef3c7; color: #92400e; }
        .tm-rows { display: flex; flex-direction: column; gap: 8px; }
        .tm-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .tm-pct { display: flex; align-items: center; gap: 4px; }
        .tm-pct input { width: 100%; }
        .tm-pct span { font-size: 13px; color: var(--color-text-muted); }
        .tm-add { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; border: 1px dashed var(--color-border); background: transparent; color: #2563eb; font-weight: 600; font-size: 13px; padding: 7px 12px; border-radius: 8px; cursor: pointer; }
        .tm-total { margin-top: 12px; font-size: 13px; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
        .tm-total.over { color: #dc2626; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        @media (max-width: 640px) {
          .tm-row { grid-template-columns: 1fr 1fr; }
          .tm-row select:first-child { grid-column: 1 / -1; }
        }
      `}</style>
    </>
  );
}
