'use client';

import Link from 'next/link';
import { Plus, X } from 'lucide-react';

export type PayMode = 'FIXED' | 'REVENUE_SHARE' | 'FIXED_AND_SHARE' | 'UNPAID';

export interface ShareRow {
  teamId: string;
  role: 'HEAD' | 'MEMBER';
  revenueSharePct: string;
}

export interface PayValue {
  mode: PayMode;
  amount: string;
  shares: ShareRow[];
}

/** Interns get a stipend; part-time and full-time people get a salary. */
export const payWord = (empType?: string) => (empType === 'INTERN' ? 'Stipend' : 'Salary');

const hasFixed = (m: PayMode) => m === 'FIXED' || m === 'FIXED_AND_SHARE';
const hasShare = (m: PayMode) => m === 'REVENUE_SHARE' || m === 'FIXED_AND_SHARE';

/** Build the form value from an employee record (edit screen). */
export function payValueFromEmployee(emp: any): PayValue {
  const shares: ShareRow[] = (emp?.teamMemberships ?? []).map((m: any) => ({
    teamId: m.teamId, role: m.role, revenueSharePct: m.revenueSharePct != null ? String(m.revenueSharePct) : '',
  }));
  const fixed = !!emp?.hasStipend && Number(emp?.stipendAmount) > 0;
  const mode: PayMode = emp?.payType === 'FIXED_AND_SHARE' ? 'FIXED_AND_SHARE'
    : emp?.payType === 'REVENUE_SHARE' ? 'REVENUE_SHARE'
    : fixed ? 'FIXED' : 'UNPAID';
  return { mode, amount: emp?.stipendAmount != null ? String(emp.stipendAmount) : '', shares };
}

/** What the server expects: hasStipend/stipendAmount for the fixed part, teamShares for teams. */
export function payPayload(v: PayValue) {
  const share = hasShare(v.mode);
  return {
    hasStipend: hasFixed(v.mode),
    stipendAmount: hasFixed(v.mode) ? Number(v.amount) : null,
    payType: v.mode === 'UNPAID' ? 'FIXED' : v.mode,
    teamShares: v.shares.map((s) => ({ teamId: s.teamId, role: s.role, revenueSharePct: share && s.revenueSharePct !== '' ? Number(s.revenueSharePct) : null })),
  };
}

/** Plain-language check before saving; returns a message or null. */
export function payProblem(v: PayValue, empType?: string): string | null {
  const word = payWord(empType).toLowerCase();
  if (hasFixed(v.mode)) {
    const n = Number(v.amount);
    if (!v.amount || !Number.isFinite(n) || n <= 0) return `Enter the monthly ${word} amount.`;
  }
  if (v.shares.some((s) => !s.teamId)) return 'Choose a team in every team row, or remove the empty row.';
  if (new Set(v.shares.map((s) => s.teamId)).size !== v.shares.length) return 'The same team is listed twice.';
  if (hasShare(v.mode)) {
    for (const s of v.shares) {
      if (s.revenueSharePct === '') continue;
      const p = Number(s.revenueSharePct);
      if (!Number.isFinite(p) || p < 0 || p > 100) return 'Revenue share must be a percentage between 0 and 100.';
    }
    if (!v.shares.some((s) => Number(s.revenueSharePct) > 0)) return 'Add at least one team with a revenue share %.';
  }
  return null;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** One-line summary, e.g. "₹10,000 / month + 50% of Sunrisers revenue". */
export function paySummary(emp: any): string {
  const word = payWord(emp?.empType);
  const fixed = !!emp?.hasStipend && Number(emp?.stipendAmount) > 0 ? `${inr(Number(emp.stipendAmount))} / month` : '';
  const shares = (emp?.teamMemberships ?? []).filter((m: any) => Number(m.revenueSharePct) > 0)
    .map((m: any) => `${+Number(m.revenueSharePct).toFixed(2)}% of ${m.team?.name ?? 'team'} revenue`);
  if (fixed && shares.length) return `${fixed} + ${shares.join(' + ')}`;
  if (shares.length) return shares.join(' + ');
  if (fixed) return fixed;
  return `No ${word.toLowerCase()} (unpaid)`;
}

export default function PaySetup({
  empType, value, onChange, teams, teamsHref = '/hrm/teams',
}: {
  empType?: string;
  value: PayValue;
  onChange: (v: PayValue) => void;
  teams: { id: string; name: string; isActive?: boolean }[];
  teamsHref?: string;
}) {
  const word = payWord(empType);
  const modes: { key: PayMode; label: string }[] = [
    { key: 'FIXED', label: `Fixed ${word.toLowerCase()}` },
    { key: 'REVENUE_SHARE', label: '% of team revenue' },
    { key: 'FIXED_AND_SHARE', label: `Fixed + %` },
    { key: 'UNPAID', label: `No ${word.toLowerCase()} (unpaid)` },
  ];
  const set = (patch: Partial<PayValue>) => onChange({ ...value, ...patch });
  const setRow = (i: number, patch: Partial<ShareRow>) => set({ shares: value.shares.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const share = hasShare(value.mode);
  const activeTeams = teams.filter((t) => t.isActive !== false);

  return (
    <div className="pay-setup">
      <div className="pay-label">{word} / monthly pay <span className="pay-req">*</span></div>
      <div className="pay-modes" role="radiogroup" aria-label={`${word} type`}>
        {modes.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={value.mode === m.key}
                  className={`pay-mode ${value.mode === m.key ? 'is-on' : ''}`}
                  onClick={() => set({ mode: m.key, ...(m.key === 'UNPAID' || m.key === 'REVENUE_SHARE' ? { amount: '' } : {}) })}>
            {m.label}
          </button>
        ))}
      </div>

      {hasFixed(value.mode) && (
        <label className="pay-field">
          <span>Monthly {word.toLowerCase()} (₹/month) <span className="pay-req">*</span></span>
          <input type="number" min="0" value={value.amount} placeholder="e.g. 15000" onChange={(e) => set({ amount: e.target.value })} />
        </label>
      )}

      <div className="pay-teams">
        <div className="pay-teams-head">
          <span>{share ? <>Teams and revenue share <span className="pay-req">*</span></> : 'Teams (optional)'}</span>
          {share && <small>Paid each month as share % × that team&apos;s revenue for the month.</small>}
        </div>
        {activeTeams.length === 0 ? (
          <div className="pay-empty">
            No teams yet. <Link href={teamsHref}>Create a team on the Teams page</Link> first{share ? ' to pay a revenue share' : ''}.
          </div>
        ) : (
          <>
            {value.shares.map((s, i) => (
              <div className="pay-row" key={i}>
                <select value={s.teamId} onChange={(e) => setRow(i, { teamId: e.target.value })} aria-label="Team">
                  <option value="">Choose team…</option>
                  {activeTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={s.role} onChange={(e) => setRow(i, { role: e.target.value as ShareRow['role'] })} aria-label="Position">
                  <option value="MEMBER">Member</option>
                  <option value="HEAD">Head</option>
                </select>
                {share && (
                  <div className="pay-pct">
                    <input type="number" min="0" max="100" step="0.01" value={s.revenueSharePct} placeholder="50"
                           onChange={(e) => setRow(i, { revenueSharePct: e.target.value })} aria-label="Revenue share percent" />
                    <span>%</span>
                  </div>
                )}
                <button type="button" className="pay-x" onClick={() => set({ shares: value.shares.filter((_, j) => j !== i) })} aria-label="Remove team">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="pay-add" onClick={() => set({ shares: [...value.shares, { teamId: '', role: 'MEMBER', revenueSharePct: '' }] })}>
              <Plus size={14} /> Add {value.shares.length ? 'another ' : ''}team
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .pay-setup { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .pay-label { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
        .pay-req { color: #dc2626; }
        .pay-modes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .pay-mode { padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; text-align: center;
          border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text); }
        .pay-mode.is-on { border: 2px solid #2563eb; background: #eff6ff; color: #2563eb; }
        .pay-mode:focus-visible, .pay-add:focus-visible, .pay-x:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        .pay-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
        .pay-field input, .pay-row select, .pay-row input { padding: 9px 10px; border-radius: 8px; border: 1px solid var(--color-border);
          background: var(--color-background); color: var(--color-text); font-size: 13.5px; min-width: 0; }
        .pay-teams { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-bg-secondary); }
        .pay-teams-head { display: flex; flex-direction: column; gap: 2px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
        .pay-teams-head small { font-weight: 400; color: var(--color-text-muted); font-size: 12px; }
        .pay-row { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) ${share ? 'minmax(0, 0.9fr)' : ''} auto; gap: 8px; align-items: center; }
        .pay-pct { display: flex; align-items: center; gap: 4px; }
        .pay-pct input { width: 100%; }
        .pay-pct span { font-size: 13px; color: var(--color-text-muted); }
        .pay-x { border: 1px solid var(--color-border); background: var(--color-background); border-radius: 8px; padding: 8px; cursor: pointer; color: var(--color-text-muted); display: flex; }
        .pay-add { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; border: 1px dashed var(--color-border); background: transparent;
          color: #2563eb; font-weight: 600; font-size: 13px; padding: 7px 12px; border-radius: 8px; cursor: pointer; }
        .pay-empty { font-size: 12.5px; color: var(--color-text-muted); }
        .pay-empty :global(a) { color: #2563eb; font-weight: 600; }
      `}</style>
    </div>
  );
}
