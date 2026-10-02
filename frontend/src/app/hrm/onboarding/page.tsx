'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CloudDownload, Upload, UserPlus, X, CheckCircle2, AlertCircle, AlertTriangle, FileText, Download, Trash2, SlidersHorizontal, Users, Save,
} from 'lucide-react';
import { onboardingApi } from '../../../services/api';
import PageGuard from '../../../components/PageGuard';

type Tab = 'PENDING' | 'IMPORTED' | 'DISMISSED';
const TYPE_LABEL: Record<string, string> = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', INTERN: 'Intern', CONTRACT: 'Contract' };
const MODE_LABEL: Record<string, string> = { ONSITE: 'Onsite', REMOTE: 'Remote', HYBRID: 'Hybrid' };
const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const stamp = (v: any) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const dmy = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export default function OnboardingPageGuarded() {
  return (
    <PageGuard module="HR" action="WRITE">
      <OnboardingPage />
    </PageGuard>
  );
}

function OnboardingPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [rows, setRows] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (keepSelection = false) => {
    setLoading(true);
    setError(null);
    try {
      const [list, c] = await Promise.all([onboardingApi.list(tab), onboardingApi.config()]);
      const next = Array.isArray(list) ? list : [];
      setRows(next);
      setCfg(c);
      setSelected((prev) => (keepSelection ? new Set(Array.from(prev).filter((id) => next.some((r: any) => r.id === id))) : new Set()));
    } catch (e: any) {
      setError(e.message || 'Could not load the onboarding queue.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(t);
  }, [notice]);

  const waiting = tab === 'PENDING';
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const blocked = selectedRows.filter((r) => r.errors > 0);

  function summarise(r: any, source: string) {
    const parts = [`${r.added} new response${r.added === 1 ? '' : 's'} received`];
    if (r.alreadyReceived) parts.push(`${r.alreadyReceived} already received earlier`);
    if (r.problems?.length) parts.push(`${r.problems.length} could not be read`);
    setNotice({ ok: r.problems?.length === 0, text: `${source}: ${parts.join(' · ')}.` });
  }

  async function fetchGoogle() {
    setBusy('fetch');
    try { summarise(await onboardingApi.fetchResponses(), 'Google Form'); await load(); }
    catch (e: any) { setNotice({ ok: false, text: e.message || 'Could not fetch the responses.' }); }
    finally { setBusy(null); }
  }

  async function uploadPicked(file?: File | null) {
    if (!file) return;
    setBusy('upload');
    try { summarise(await onboardingApi.upload(file), file.name); setTab('PENDING'); await load(); }
    catch (e: any) { setNotice({ ok: false, text: e.message || 'Could not read that file.' }); }
    finally { setBusy(null); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function runImport() {
    setConfirmImport(false);
    setBusy('import');
    try {
      const r = await onboardingApi.importMany(selectedRows.filter((x) => x.errors === 0).map((x) => x.id));
      setResults(r);
      await load();
    } catch (e: any) {
      setNotice({ ok: false, text: e.message || 'Could not add these people.' });
    } finally { setBusy(null); }
  }

  const counts = { PENDING: cfg?.pending ?? 0 };

  return (
    <>
    <div className="ob fade-in">
      <div className="page-header">
        <div>
          <h1>Bulk Onboarding</h1>
          <p>New joiners fill in the Google Form. Fetch their answers here, check and complete each one, then add them all to the Employee Directory in one go.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={!!busy}><Upload size={15} /> {busy === 'upload' ? 'Reading…' : 'Upload CSV / Excel'}</button>
          <input ref={fileInput} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={(e) => uploadPicked(e.target.files?.[0])} />
          <button
            className="btn btn-primary" onClick={fetchGoogle} disabled={!!busy || !cfg?.google?.configured}
            title={cfg?.google?.configured ? 'Read the new answers from the Google Form' : 'Google is not set up on this server — use Upload CSV / Excel instead'}
          >
            <CloudDownload size={15} /> {busy === 'fetch' ? 'Fetching…' : 'Fetch new responses'}
          </button>
        </div>
      </div>

      {cfg && !cfg.google?.configured && (
        <div className="ob-note"><AlertTriangle size={15} /> Google isn&apos;t connected on this server, so <b>Fetch new responses</b> is switched off. In Google Sheets choose <b>File → Download → CSV</b> and use <b>Upload CSV / Excel</b>.</div>
      )}
      {notice && <div className={`ob-notice ${notice.ok ? 'ok' : 'bad'}`} role="status">{notice.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.text}</div>}

      <div className="ob-tabs" role="tablist">
        {([['PENDING', 'Waiting for review'], ['IMPORTED', 'Added'], ['DISMISSED', 'Dismissed']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            {l}{k === 'PENDING' && cfg ? <span>{counts.PENDING}</span> : null}
          </button>
        ))}
      </div>

      {waiting && selected.size > 0 && (
        <div className="ob-bar">
          <b>{selected.size} selected{blocked.length ? ` · ${blocked.length} need fixing first` : ''}</b>
          <button className="btn btn-secondary" onClick={() => setShowBulk(true)}><SlidersHorizontal size={14} /> Set role &amp; pay for all selected</button>
          <button className="btn btn-primary" disabled={!!busy || selectedRows.length === blocked.length} onClick={() => setConfirmImport(true)}>
            <UserPlus size={14} /> {busy === 'import' ? 'Adding…' : `Add ${selectedRows.length - blocked.length} to the directory`}
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <p className="ob-empty">Loading…</p>
          : error ? <p className="ob-empty" style={{ color: '#b91c1c' }}>{error}</p>
          : rows.length === 0 ? (
            <p className="ob-empty">
              {waiting ? 'Nobody is waiting. Press “Fetch new responses” after joiners submit the form.' : tab === 'IMPORTED' ? 'Nobody has been added through bulk onboarding yet.' : 'Nothing has been dismissed.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table ob-table">
                <thead>
                  <tr>
                    {waiting && <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}
                    <th>Joiner</th><th>Role (HR sets)</th><th>Joining</th><th>Documents</th><th>{waiting ? 'Check' : 'Status'}</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      {waiting && <td><input type="checkbox" aria-label={`Select ${r.fullName}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                      <td><div className="ob-name">{r.fullName}</div><div className="ob-sub">{r.email}</div></td>
                      <td className="ob-sub">
                        {r.hr?.empType ? <><b style={{ color: 'var(--color-text-primary)' }}>{TYPE_LABEL[r.hr.empType]}</b><br />{[r.hr.designation, r.hr.department].filter(Boolean).join(' · ') || '—'}</> : <span className="ob-todo">Not set yet</span>}
                      </td>
                      <td className="ob-sub">{dmy(r.hr?.joinDate || r.joiningDate)}</td>
                      <td className="ob-sub">{r.files} file{r.files === 1 ? '' : 's'}</td>
                      <td>
                        {waiting ? (
                          r.errors > 0 ? <span className="ob-chip bad"><AlertCircle size={12} /> {r.errors} to fix</span>
                            : r.warnings > 0 ? <span className="ob-chip warn"><AlertTriangle size={12} /> Ready · {r.warnings} note{r.warnings === 1 ? '' : 's'}</span>
                            : <span className="ob-chip ok"><CheckCircle2 size={12} /> Ready</span>
                        ) : tab === 'IMPORTED' ? <span className="ob-chip ok">Added {stamp(r.importedAt)}</span> : <span className="ob-sub">{r.dismissedReason || 'Dismissed'}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {waiting && <button className="btn btn-secondary btn-sm" onClick={() => setOpenId(r.id)}>Review</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>


      <style>{`
.ob-note{display:flex;gap:8px;align-items:flex-start;padding:10px 14px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:13px;margin-bottom:14px;}
.ob-notice{display:flex;gap:8px;align-items:center;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:14px;}
.ob-notice.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;} .ob-notice.bad{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}
.ob-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
.ob-tabs button{border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text-secondary);padding:7px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;gap:8px;align-items:center;}
.ob-tabs button span{background:var(--color-border-light,#eef2f7);padding:0 8px;border-radius:999px;font-size:11.5px;}
.ob-tabs button.is-on{background:#2563eb;border-color:#2563eb;color:#fff;} .ob-tabs button.is-on span{background:rgba(255,255,255,.25);}
.ob-bar{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:10px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.25);margin-bottom:14px;flex-wrap:wrap;}
.ob-bar b{margin-right:auto;font-size:13px;}
.ob-empty{padding:36px 20px;text-align:center;color:var(--color-text-muted);font-size:14px;margin:0;}
.ob-name{font-weight:600;font-size:13.5px;} .ob-sub{font-size:12px;color:var(--color-text-muted);} .ob-todo{color:#b45309;font-weight:600;}
.ob-chip{display:inline-flex;gap:5px;align-items:center;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap;}
.ob-chip.ok{background:#ecfdf5;color:#047857;} .ob-chip.warn{background:#fffbeb;color:#b45309;} .ob-chip.bad{background:#fef2f2;color:#b91c1c;}
.ob-list{margin:0 0 12px;padding-left:18px;font-size:13.5px;display:flex;flex-direction:column;gap:4px;}
.ob-warn{display:flex;gap:8px;align-items:flex-start;padding:9px 12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:13px;}
.ob-hint{font-size:12.5px;color:var(--color-text-muted);margin:10px 0 0;}
`}</style>
    </div>
    {openId && <ReviewModal key={openId} id={openId} cfg={cfg} onClose={() => { setOpenId(null); load(); }} setNotice={setNotice} />}
    {showBulk && <BulkApplyModal ids={Array.from(selected)} cfg={cfg} onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); setNotice({ ok: true, text: `Updated ${selected.size} people.` }); load(true); }} />}
    {confirmImport && (
      <Dialog title={`Add ${selectedRows.length - blocked.length} ${selectedRows.length - blocked.length === 1 ? 'person' : 'people'} to the Employee Directory?`} onClose={() => setConfirmImport(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setConfirmImport(false)}>Cancel</button><button className="btn btn-primary" onClick={runImport}>Add them now</button></>}>
        <ul className="ob-list">
          {selectedRows.filter((r) => r.errors === 0).map((r) => <li key={r.id}><b>{r.fullName}</b> — {TYPE_LABEL[r.hr.empType]}, {r.hr.designation}</li>)}
        </ul>
        {blocked.length > 0 && <p className="ob-warn"><AlertTriangle size={14} /> {blocked.length} selected {blocked.length === 1 ? 'person has' : 'people have'} problems and will be skipped: {blocked.map((b) => b.fullName).join(', ')}.</p>}
        <p className="ob-hint">Each person gets an ERP login with a temporary password (you&apos;ll download the list next), and their offer letter is prepared and held in <b>Letter Outbox</b> for you to preview before it&apos;s emailed.</p>
      </Dialog>
    )}
    {results && <ResultsModal data={results} onClose={() => setResults(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Dialog({ title, children, footer, onClose, wide }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="dlg-back" onClick={onClose} role="presentation">
      <div className={`dlg ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={18} /></button></header>
        <div className="dlg-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
      <style>{`
.dlg-back{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:14px;}
.dlg{background:var(--color-surface,#fff);color:var(--color-text-primary,#111);width:min(560px,100%);max-height:92vh;border-radius:14px;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);overflow:hidden;}
.dlg.wide{width:min(1180px,100%);height:min(92vh,880px);}
.dlg header{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--color-border,#e5e7eb);}
.dlg header h2{margin:0;font-size:17px;flex:1;text-wrap:balance;} .dlg header button{border:none;background:none;cursor:pointer;color:var(--color-text-muted);padding:4px;border-radius:6px;}
.dlg-body{padding:16px 20px;overflow-y:auto;flex:1;min-height:0;}
.dlg footer{display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid var(--color-border,#e5e7eb);flex-wrap:wrap;}
.dlg button:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
`}</style>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', issue, hint, wide, area }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; issue?: { message: string; severity: string }; hint?: string; wide?: boolean; area?: boolean;
}) {
  const bad = issue?.severity === 'error';
  return (
    <label className={`fld ${wide ? 'wide' : ''} ${issue ? (bad ? 'bad' : 'warn') : ''}`}>
      <span>{label}</span>
      {area ? <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />}
      {issue ? <em>{issue.message}</em> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

const FIELD_CSS = `
.fld{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:var(--color-text-secondary,#475569);min-width:0;}
.fld.wide{grid-column:1/-1;}
.fld input,.fld select,.fld textarea{padding:8px 10px;border-radius:8px;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-primary,#111);font-size:14px;font-weight:400;font-family:inherit;width:100%;box-sizing:border-box;min-width:0;}
.fld input:focus,.fld select:focus,.fld textarea:focus{outline:2px solid #93c5fd;border-color:#2563eb;}
.fld.bad input,.fld.bad textarea,.fld.bad select{border-color:#dc2626;} .fld.warn input,.fld.warn textarea,.fld.warn select{border-color:#f59e0b;}
.fld em{font-style:normal;font-weight:600;font-size:12px;color:#b91c1c;} .fld.warn em{color:#b45309;} .fld small{font-weight:400;font-size:11.5px;color:var(--color-text-muted,#6b7280);}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;} @media (max-width:640px){.fgrid{grid-template-columns:1fr;}}
`;

function HrFields({ hr, set, cfg, issues, suggestedUsername }: { hr: any; set: (k: string, v: any) => void; cfg: any; issues: Record<string, any>; suggestedUsername?: string }) {
  const gross = hr.isPaid ? Number(hr.basic || 0) + Number(hr.hra || 0) + Number(hr.specialAllowance || 0) : 0;
  return (
    <>
      <div className="fgrid">
        <label className={`fld ${issues['hr.empType'] ? 'bad' : ''}`}><span>Employment type *</span>
          <select value={hr.empType} onChange={(e) => set('empType', e.target.value)}>
            <option value="">Choose…</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>{issues['hr.empType'] && <em>{issues['hr.empType'].message}</em>}
        </label>
        <label className={`fld ${issues['hr.workMode'] ? 'bad' : ''}`}><span>Work mode *</span>
          <select value={hr.workMode} onChange={(e) => set('workMode', e.target.value)}>
            <option value="">Choose…</option>
            {Object.entries(MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>{issues['hr.workMode'] && <em>{issues['hr.workMode'].message}</em>}
        </label>
        <label className={`fld ${issues['hr.designation'] ? 'bad' : ''}`}><span>Designation *</span>
          <input list="ob-desig" value={hr.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Software Engineer" />
          <datalist id="ob-desig">{(cfg?.designations ?? []).map((d: string) => <option key={d} value={d} />)}</datalist>
          {issues['hr.designation'] && <em>{issues['hr.designation'].message}</em>}
        </label>
        <label className={`fld ${issues['hr.department'] ? 'bad' : ''}`}><span>Department *</span>
          <input list="ob-dept" value={hr.department} onChange={(e) => set('department', e.target.value)} />
          <datalist id="ob-dept">{(cfg?.departments ?? []).map((d: string) => <option key={d} value={d} />)}</datalist>
          {issues['hr.department'] && <em>{issues['hr.department'].message}</em>}
        </label>
        <label className="fld"><span>Reports to</span>
          <select value={hr.reportingManagerId} onChange={(e) => set('reportingManagerId', e.target.value)}>
            <option value="">— Not set —</option>
            {(cfg?.managers ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.empCode})</option>)}
          </select>
        </label>
        <label className={`fld ${issues['hr.joinDate'] ? 'bad' : ''}`}><span>Date of joining *</span>
          <input type="date" value={hr.joinDate} onChange={(e) => set('joinDate', e.target.value)} />{issues['hr.joinDate'] && <em>{issues['hr.joinDate'].message}</em>}
        </label>
        {(hr.empType === 'INTERN' || hr.empType === 'PART_TIME' || hr.empType === 'CONTRACT') && (
          <label className={`fld ${issues['hr.engagementEndDate'] ? (issues['hr.engagementEndDate'].severity === 'error' ? 'bad' : 'warn') : ''}`}><span>{hr.empType === 'INTERN' ? 'Internship end date' : 'Contract end date (optional)'}</span>
            <input type="date" value={hr.engagementEndDate} onChange={(e) => set('engagementEndDate', e.target.value)} />
            {issues['hr.engagementEndDate'] && <em>{issues['hr.engagementEndDate'].message}</em>}
          </label>
        )}
        <label className={`fld ${issues['hr.username'] ? 'bad' : ''}`}><span>Username</span>
          <input value={hr.username} onChange={(e) => set('username', e.target.value)} placeholder={suggestedUsername ?? 'firstname.lastname'} />
          {issues['hr.username'] ? <em>{issues['hr.username'].message}</em> : <small>Leave empty to use the suggestion.</small>}
        </label>
      </div>
      <div className="ob-pay">
        <div className="ob-switch">
          <button type="button" className={hr.isPaid ? 'is-on' : ''} onClick={() => set('isPaid', true)} aria-pressed={hr.isPaid}>Paid</button>
          <button type="button" className={!hr.isPaid ? 'is-on' : ''} onClick={() => set('isPaid', false)} aria-pressed={!hr.isPaid}>Unpaid</button>
        </div>
        {hr.isPaid && (
          <>
            <div className="fgrid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 10 }}>
              <label className={`fld ${issues['hr.basic'] ? 'bad' : ''}`}><span>Basic *</span><input inputMode="decimal" value={hr.basic} onChange={(e) => set('basic', e.target.value)} /></label>
              <label className="fld"><span>HRA</span><input inputMode="decimal" value={hr.hra} onChange={(e) => set('hra', e.target.value)} /></label>
              <label className="fld"><span>Special allowance</span><input inputMode="decimal" value={hr.specialAllowance} onChange={(e) => set('specialAllowance', e.target.value)} /></label>
            </div>
            {issues['hr.basic'] ? <p className="ob-err">{issues['hr.basic'].message}</p> : <p className="ob-sub" style={{ margin: '6px 0 0' }}>Gross monthly pay: <b>{inr(gross)}</b></p>}
          </>
        )}
      </div>
      <style>{FIELD_CSS + `
.ob-pay{margin-top:12px;} .ob-err{color:#b91c1c;font-size:12px;font-weight:600;margin:6px 0 0;}
.ob-switch{display:inline-flex;border:1px solid var(--color-border,#d1d5db);border-radius:9px;overflow:hidden;}
.ob-switch button{border:none;background:var(--color-surface,#fff);color:var(--color-text-secondary,#475569);padding:7px 18px;font-size:13px;font-weight:600;cursor:pointer;}
.ob-switch button.is-on{background:#2563eb;color:#fff;}`}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ReviewModal({ id, cfg, onClose, setNotice }: { id: string; cfg: any; onClose: () => void; setNotice: (n: { text: string; ok: boolean }) => void }) {
  const [data, setData] = useState<any>(null);
  const [p, setP] = useState<any>(null);
  const [hr, setHr] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, { url: string; type: string }>>({});
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const apply = (d: any) => { setData(d); setP(d.payload); setHr(d.payload.hr); setDirty(false); };

  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    (async () => {
      try {
        const d = await onboardingApi.get(id);
        if (!live) return;
        apply(d);
        const avail = d.files.filter((f: any) => f.available);
        setActiveDoc(avail[0]?.field ?? null);
        for (const f of avail) {
          try { const u = await onboardingApi.fileUrl(id, f.field); urls.push(u.url); if (live) setDocUrls((m) => ({ ...m, [f.field]: u })); } catch { /* shown as missing */ }
        }
      } catch (e: any) { if (live) setErr(e.message || 'Could not load this response.'); }
    })();
    return () => { live = false; urls.forEach((u) => window.URL.revokeObjectURL(u)); };
  }, [id]);

  const issuesBy = useMemo(() => {
    const m: Record<string, any> = {};
    for (const i of data?.issues ?? []) if (!m[i.field] || i.severity === 'error') m[i.field] = i;
    return m;
  }, [data]);

  const setField = (k: string, v: any) => { setP((x: any) => ({ ...x, [k]: v })); setDirty(true); };
  const setHrField = (k: string, v: any) => { setHr((x: any) => ({ ...x, [k]: v })); setDirty(true); };

  async function save(): Promise<boolean> {
    setSaving(true); setErr(null);
    try {
      const { hr: _h, ...payload } = p;
      apply(await onboardingApi.update(id, { payload, hr }));
      return true;
    } catch (e: any) { setErr(e.message || 'Could not save.'); return false; }
    finally { setSaving(false); }
  }

  async function dismiss() {
    const reason = prompt('Why is this response being dismissed? (optional — it is kept on record)');
    if (reason === null) return;
    try { await onboardingApi.dismiss(id, reason || undefined); setNotice({ ok: true, text: `Dismissed ${data.payload.fullName}.` }); onClose(); }
    catch (e: any) { setErr(e.message || 'Could not dismiss.'); }
  }

  function close() { if (dirty && !confirm('You have unsaved changes. Close without saving?')) return; onClose(); }

  const errors = (data?.issues ?? []).filter((i: any) => i.severity === 'error');
  const warnings = (data?.issues ?? []).filter((i: any) => i.severity === 'warning');
  const ok = (data?.files ?? []).filter((f: any) => f.available);

  return (
    <Dialog wide title={data ? `${data.payload.fullName}` : 'Loading…'} onClose={close}
      footer={data ? (
        <>
          <button className="btn btn-secondary" style={{ marginRight: 'auto', color: '#b91c1c' }} onClick={dismiss}><Trash2 size={14} /> Dismiss</button>
          <button className="btn btn-secondary" onClick={close}>Close</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}><Save size={14} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
        </>
      ) : undefined}>
      {err && <div className="rv-err" role="alert"><AlertCircle size={15} /> {err}</div>}
      {!data ? <p className="ob-sub">{err ? '' : 'Loading…'}</p> : (
        <div className="rv">
          <aside className="rv-docs">
            <h3>Documents</h3>
            <div className="rv-tabs">
              {data.files.map((f: any) => (
                <button key={f.field} className={`${activeDoc === f.field ? 'is-on' : ''} ${f.available ? '' : 'miss'}`} disabled={!f.available} onClick={() => setActiveDoc(f.field)} title={f.error || f.fileName}>
                  <FileText size={13} /> {f.label}
                </button>
              ))}
            </div>
            {data.files.filter((f: any) => !f.available).map((f: any) => <p key={f.field} className="rv-miss"><AlertTriangle size={12} /> {f.label}: {f.error || 'not available'}</p>)}
            <div className="rv-view">
              {activeDoc && docUrls[activeDoc] ? (
                docUrls[activeDoc].type.startsWith('image/') ? <img src={docUrls[activeDoc].url} alt={activeDoc} /> : <iframe src={docUrls[activeDoc].url} title="Document" />
              ) : <p className="ob-sub" style={{ padding: 20 }}>{ok.length === 0 ? 'No documents were received for this person. You can attach them from the employee profile after adding them.' : 'Choose a document above.'}</p>}
            </div>
            {activeDoc && docUrls[activeDoc] && <a className="rv-open" href={docUrls[activeDoc].url} target="_blank" rel="noreferrer"><Download size={12} /> Open in a new tab</a>}
          </aside>

          <section className="rv-form">
            {(errors.length > 0 || warnings.length > 0) && (
              <div className="rv-issues">
                {errors.length > 0 && <div className="bad"><b>To fix before adding ({errors.length})</b><ul>{errors.map((i: any, n: number) => <li key={n}>{i.message}</li>)}</ul></div>}
                {warnings.length > 0 && <div className="warn"><b>Worth a look ({warnings.length})</b><ul>{warnings.map((i: any, n: number) => <li key={n}>{i.message}</li>)}</ul></div>}
              </div>
            )}
            <h3>From the joiner <small>Compare with the documents on the left. Edit anything that&apos;s wrong.</small></h3>
            <div className="fgrid">
              <Field label="First name *" value={p.firstName} onChange={(v) => setField('firstName', v)} issue={issuesBy.firstName} />
              <Field label="Last name" value={p.lastName} onChange={(v) => setField('lastName', v)} />
              <Field label="Email *" type="email" value={p.email} onChange={(v) => setField('email', v)} issue={issuesBy.email || issuesBy['dup:email']} hint="The offer letter is sent here." />
              <Field label="Mobile" value={p.mobile} onChange={(v) => setField('mobile', v)} issue={issuesBy.mobile} />
              <Field label="Date of birth" type="date" value={p.dob} onChange={(v) => setField('dob', v)} issue={issuesBy.dob} />
              <Field label="Joiner's expected joining date" type="date" value={p.joiningDate} onChange={(v) => setField('joiningDate', v)} issue={issuesBy.joiningDate} hint="HR confirms the real date below." />
              <Field label="Aadhaar number" value={p.aadhaar} onChange={(v) => setField('aadhaar', v)} issue={issuesBy.aadhaar || issuesBy['dup:aadhaar']} />
              <Field label="PAN" value={p.pan} onChange={(v) => setField('pan', v)} issue={issuesBy.pan || issuesBy['dup:pan']} />
              <Field label="Bank account number" value={p.bankAccount} onChange={(v) => setField('bankAccount', v)} issue={issuesBy.bankAccount} />
              <Field label="IFSC code" value={p.ifsc} onChange={(v) => setField('ifsc', v)} issue={issuesBy.ifsc} hint="Not on the form — add it if you have it." />
              <Field wide area label="Current address" value={p.currentAddress} onChange={(v) => setField('currentAddress', v)} issue={issuesBy.currentAddress} />
              <Field wide area label="Permanent address" value={p.permanentAddress} onChange={(v) => setField('permanentAddress', v)} hint="Leave empty if it is the same as the current address." />
              <Field label="Highest qualification" value={p.qualification} onChange={(v) => setField('qualification', v)} issue={issuesBy.qualification} />
              <Field label="Institution" value={p.institution} onChange={(v) => setField('institution', v)} />
              <Field label="Year of passing" value={p.yearOfPassing} onChange={(v) => setField('yearOfPassing', v)} issue={issuesBy.yearOfPassing} />
              <span />
              <Field label="Emergency contact name" value={p.emergencyName} onChange={(v) => setField('emergencyName', v)} issue={issuesBy.emergencyName} />
              <Field label="Emergency contact number" value={p.emergencyPhone} onChange={(v) => setField('emergencyPhone', v)} issue={issuesBy.emergencyPhone} />
              <Field label="Relationship" value={p.emergencyRelation} onChange={(v) => setField('emergencyRelation', v)} />
              <label className={`fld ${issuesBy.consent ? 'bad' : ''}`}><span>Consent to store these details</span>
                <span className="rv-check"><input type="checkbox" checked={!!p.consent} onChange={(e) => setField('consent', e.target.checked)} /> {p.consent ? 'Given on the form' : 'Not given'}</span>
                {issuesBy.consent && <em>{issuesBy.consent.message}</em>}
              </label>
            </div>

            <h3 style={{ marginTop: 22 }}>HR details <small>These decide the offer letter. The joiner never sees or sets them.</small></h3>
            <HrFields hr={hr} set={setHrField} cfg={cfg} issues={issuesBy} suggestedUsername={data.suggestedUsername} />
          </section>
        </div>
      )}
      <style>{FIELD_CSS + `
.rv{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:20px;align-items:start;} @media (max-width:900px){.rv{grid-template-columns:1fr;}}
.rv h3{font-size:14px;margin:0 0 8px;} .rv h3 small{font-weight:400;color:var(--color-text-muted,#6b7280);font-size:12px;margin-left:6px;}
.rv-docs{position:sticky;top:0;} .rv-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.rv-tabs button{display:inline-flex;gap:5px;align-items:center;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-secondary,#475569);padding:5px 10px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;}
.rv-tabs button.is-on{background:#2563eb;border-color:#2563eb;color:#fff;} .rv-tabs button.miss{opacity:.45;cursor:not-allowed;}
.rv-view{border:1px solid var(--color-border,#e5e7eb);border-radius:10px;background:#f1f5f9;min-height:340px;max-height:60vh;overflow:auto;display:flex;align-items:flex-start;justify-content:center;}
.rv-view img{max-width:100%;height:auto;display:block;} .rv-view iframe{width:100%;height:56vh;border:0;background:#fff;}
.rv-open{display:inline-flex;gap:5px;align-items:center;font-size:12px;font-weight:600;color:#2563eb;margin-top:6px;}
.rv-miss{display:flex;gap:6px;align-items:flex-start;font-size:12px;color:#b45309;margin:0 0 6px;}
.rv-issues{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;} .rv-issues>div{padding:9px 12px;border-radius:8px;font-size:12.5px;}
.rv-issues .bad{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;} .rv-issues .warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;}
.rv-issues ul{margin:4px 0 0;padding-left:18px;} .rv-issues li{margin:2px 0;}
.rv-err{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:600;margin-bottom:12px;}
.rv-check{display:inline-flex;gap:8px;align-items:center;font-weight:400;font-size:13.5px;color:var(--color-text-primary,#111);padding:6px 0;} .rv-check input{width:16px;height:16px;padding:0;}`}</style>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function BulkApplyModal({ ids, cfg, onClose, onDone }: { ids: string[]; cfg: any; onClose: () => void; onDone: () => void }) {
  const [hr, setHr] = useState<any>({ empType: '', designation: '', department: '', workMode: '', reportingManagerId: '', joinDate: '', engagementEndDate: '', isPaid: false, basic: '', hra: '', specialAllowance: '', username: '' });
  const [applyPay, setApplyPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setHr((x: any) => ({ ...x, [k]: v }));

  async function apply() {
    const patch: Record<string, any> = {};
    for (const k of ['empType', 'designation', 'department', 'workMode', 'reportingManagerId', 'joinDate', 'engagementEndDate']) if (hr[k]) patch[k] = hr[k];
    if (applyPay) Object.assign(patch, { isPaid: hr.isPaid, basic: hr.basic, hra: hr.hra, specialAllowance: hr.specialAllowance });
    if (Object.keys(patch).length === 0) { setErr('Fill in at least one field to apply.'); return; }
    setBusy(true); setErr(null);
    try {
      for (const id of ids) await onboardingApi.update(id, { hr: patch });
      onDone();
    } catch (e: any) { setErr(e.message || 'Could not update them all.'); }
    finally { setBusy(false); }
  }

  return (
    <Dialog title={`Set role & pay for ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={apply} disabled={busy}>{busy ? 'Applying…' : `Apply to ${ids.length}`}</button></>}>
      <p className="ob-hint" style={{ margin: '0 0 12px' }}>Only the fields you fill in are changed — anything left empty stays as it is for each person. You can still adjust individuals afterwards.</p>
      {err && <div className="rv-err" role="alert"><AlertCircle size={15} /> {err}</div>}
      <HrFields hr={hr} set={set} cfg={cfg} issues={{}} />
      <label className="rv-check" style={{ marginTop: 12 }}><input type="checkbox" checked={applyPay} onChange={(e) => setApplyPay(e.target.checked)} /> Also apply the pay choice above ({hr.isPaid ? 'paid' : 'unpaid'}) to everyone selected</label>
      <style>{`.rv-err{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:600;margin-bottom:12px;}.rv-check{display:inline-flex;gap:8px;align-items:center;font-size:13.5px;}.rv-check input{width:16px;height:16px;}`}</style>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function ResultsModal({ data, onClose }: { data: any; onClose: () => void }) {
  const ok = data.results.filter((r: any) => r.ok);
  const bad = data.results.filter((r: any) => !r.ok);

  function download() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      ['Name', 'Employee code', 'Username', 'Temporary password', 'Email', 'Role', 'Date of joining'].map(esc).join(','),
      ...ok.map((r: any) => [r.name, r.empCode, r.username, r.tempPassword, r.email, `${TYPE_LABEL[r.empType] ?? r.empType} — ${r.designation}`, dmy(r.joinDate)].map(esc).join(',')),
    ];
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `new-joiner-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <Dialog wide title={`${ok.length} added${bad.length ? `, ${bad.length} not added` : ''}`} onClose={onClose}
      footer={<>
        {ok.length > 0 && <a className="btn btn-secondary" href="/letters" style={{ marginRight: 'auto', textDecoration: 'none' }}>Review their offer letters</a>}
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </>}>
      {ok.length > 0 && (
        <div className="rs-cred">
          <Users size={18} />
          <div>
            <b>Credentials list</b>
            <p>Each new person signs in with the temporary password below and is made to choose their own on first login. Download the list now to hand out the details — HR can also see a temporary password in User Management until its owner changes it. Keep the file safe and delete it once the details are handed over.</p>
          </div>
          <button className="btn btn-primary" onClick={download}><Download size={14} /> Download credentials (CSV)</button>
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Person</th><th>Result</th><th>Login</th><th>Offer letter</th></tr></thead>
        <tbody>
          {data.results.map((r: any) => (
            <tr key={r.id}>
              <td><b>{r.name}</b>{r.empCode && <div className="ob-sub">{r.empCode}</div>}</td>
              <td>{r.ok ? <span className="ob-chip ok"><CheckCircle2 size={12} /> Added</span> : <span className="ob-chip bad"><AlertCircle size={12} /> Not added</span>}{!r.ok && <div className="rs-why">{r.error}</div>}{r.notes?.length > 0 && <div className="rs-why" style={{ color: '#b45309' }}>{r.notes.join(' ')}</div>}</td>
              <td className="ob-sub">{r.ok ? <><code>{r.username}</code><br /><code>{r.tempPassword}</code></> : '—'}</td>
              <td className="ob-sub">{r.ok ? (r.letter.pending ? 'Waiting in Letter Outbox' : r.letter.emailed ? 'Emailed' : r.letter.error ? `Not sent: ${r.letter.error}` : '—') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
.rs-cred{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:10px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.25);margin-bottom:14px;flex-wrap:wrap;color:#1d4ed8;}
.rs-cred>div{flex:1;min-width:240px;color:var(--color-text-primary,#111);} .rs-cred p{margin:4px 0 0;font-size:12.5px;color:var(--color-text-secondary,#475569);}
.rs-why{font-size:12px;color:#b91c1c;margin-top:3px;max-width:420px;overflow-wrap:anywhere;} code{font-size:12px;background:var(--color-background,#f1f5f9);padding:1px 6px;border-radius:4px;}
.ob-sub{font-size:12px;color:var(--color-text-muted,#6b7280);} .ob-chip{display:inline-flex;gap:5px;align-items:center;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;} .ob-chip.ok{background:#ecfdf5;color:#047857;} .ob-chip.bad{background:#fef2f2;color:#b91c1c;}`}</style>
    </Dialog>
  );
}
