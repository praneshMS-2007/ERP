'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, FileText, Award, Wallet, X, RefreshCw, Trash2, CheckCircle2, AlertCircle, ChevronRight, Settings2, Mail } from 'lucide-react';
import { lettersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRefreshTick } from '@/lib/refresh';

type Status = 'DRAFT' | 'FAILED' | 'SENT' | 'DISCARDED';
type Kind = 'OFFER_LETTER' | 'COMPLETION_CERTIFICATE' | 'PAYSLIP';

const KIND_META: Record<Kind, { label: string; plural: string; icon: any; color: string }> = {
  OFFER_LETTER: { label: 'Offer letter', plural: 'Offer letters', icon: FileText, color: '#2563eb' },
  COMPLETION_CERTIFICATE: { label: 'Certificate', plural: 'Internship certificates', icon: Award, color: '#059669' },
  PAYSLIP: { label: 'Payslip', plural: 'Payslips', icon: Wallet, color: '#d97706' },
};
const TABS: { key: Status; label: string }[] = [
  { key: 'DRAFT', label: 'Waiting for review' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'SENT', label: 'Sent' },
  { key: 'DISCARDED', label: 'Discarded' },
];

const stamp = (v: any) => new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function LetterOutboxPage() {
  const { user } = useAuth();
  const canChangeSettings = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const [tab, setTab] = useState<Status>('DRAFT');
  const [letters, setLetters] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Record<string, boolean> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [queue, setQueue] = useState<string[]>([]); // ids still to review, in order
  const [openId, setOpenId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, c] = await Promise.all([lettersApi.list(tab), lettersApi.counts()]);
      setLetters(Array.isArray(list) ? list : []);
      setCounts(c || {});
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message || 'Could not load the outbox.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const refreshTick = useRefreshTick();
  useEffect(() => { load(); }, [load, refreshTick]);
  useEffect(() => { lettersApi.settings().then(setSettings).catch(() => setSettings(null)); }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const actionable = tab === 'DRAFT' || tab === 'FAILED';
  const allSelected = letters.length > 0 && selected.size === letters.length;
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function startReview(ids: string[]) {
    if (ids.length === 0) return;
    setQueue(ids.slice(1));
    setOpenId(ids[0]);
  }

  /** After a letter is sent / discarded / replaced: move to the next one in the queue, or close. */
  function advance() {
    if (queue.length > 0) { setOpenId(queue[0]); setQueue(queue.slice(1)); }
    else { setOpenId(null); }
    load();
  }

  async function sendSelected() {
    const ids = Array.from(selected);
    if (!confirm(`Send ${ids.length} letter${ids.length === 1 ? '' : 's'} now without opening each one?\n\nOnly do this if you have already checked them.`)) return;
    setBusy(true);
    try {
      const out = await lettersApi.sendBatch(ids);
      const sent = out.filter((o: any) => o.status === 'SENT').length;
      const failed = out.length - sent;
      setNotice({ ok: failed === 0, text: failed === 0 ? `${sent} letter${sent === 1 ? '' : 's'} emailed.` : `${sent} emailed, ${failed} could not be sent — see the Failed tab.` });
      await load();
    } catch (e: any) {
      setNotice({ ok: false, text: e.message || 'Sending failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePreview(kind: Kind, on: boolean) {
    try {
      setSettings(await lettersApi.setPreview(kind, on));
    } catch (e: any) {
      setNotice({ ok: false, text: e.message || 'Could not change the setting.' });
    }
  }

  const waiting = counts.DRAFT ?? 0;

  return (
    <>
    <div className="lo fade-in">
      <div className="page-header">
        <div>
          <h1>Letter Outbox</h1>
          <p>Every offer letter, internship certificate and payslip waits here until you have looked at it. Nothing is emailed before you press Send.</p>
        </div>
        <div className="page-header-actions">
          {canChangeSettings && (
            <button className="btn btn-secondary" onClick={() => setShowSettings((v) => !v)}><Settings2 size={15} /> Preview settings</button>
          )}
          {actionable && letters.length > 0 && (
            <button className="btn btn-primary" onClick={() => startReview(selected.size ? Array.from(selected) : letters.map((l) => l.id))}>
              <ChevronRight size={15} /> Review {selected.size ? `selected (${selected.size})` : 'one by one'}
            </button>
          )}
        </div>
      </div>

      {notice && <div className={`lo-notice ${notice.ok ? 'ok' : 'bad'}`} role="status">{notice.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.text}</div>}

      {showSettings && settings && (
        <div className="card lo-settings">
          <h3>Ask for a preview before sending</h3>
          <p>Turn a type off and its letters are emailed immediately, as they were before the outbox existed.</p>
          {(Object.keys(KIND_META) as Kind[]).map((k) => (
            <label key={k} className="lo-switch">
              <input type="checkbox" checked={!!settings[k]} onChange={(e) => togglePreview(k, e.target.checked)} />
              <span>{KIND_META[k].plural}</span>
              <em>{settings[k] ? 'preview first' : 'sent immediately'}</em>
            </label>
          ))}
        </div>
      )}

      <div className="lo-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-on' : ''} onClick={() => setTab(t.key)}>
            {t.label}<span>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {actionable && selected.size > 0 && (
        <div className="lo-bar">
          <b>{selected.size} selected</b>
          <button className="btn btn-secondary" onClick={() => startReview(Array.from(selected))}>Review them one by one</button>
          <button className="btn btn-primary" onClick={sendSelected} disabled={busy}><Send size={14} /> {busy ? 'Sending…' : 'Send all selected'}</button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="lo-empty">Loading…</p>
        ) : error ? (
          <p className="lo-empty" style={{ color: '#b91c1c' }}>{error}</p>
        ) : letters.length === 0 ? (
          <p className="lo-empty">
            {tab === 'DRAFT' ? (waiting === 0 ? 'Nothing is waiting. New letters appear here the moment they are generated.' : '') : `No ${TABS.find((t) => t.key === tab)!.label.toLowerCase()} letters.`}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table lo-table">
              <thead>
                <tr>
                  {actionable && <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(letters.map((l) => l.id)))} /></th>}
                  <th>Letter</th><th>Recipient</th><th>Subject</th><th>{tab === 'SENT' ? 'Sent' : 'Prepared'}</th><th />
                </tr>
              </thead>
              <tbody>
                {letters.map((l) => {
                  const m = KIND_META[l.kind as Kind];
                  const Icon = m.icon;
                  return (
                    <tr key={l.id}>
                      {actionable && <td><input type="checkbox" aria-label={`Select ${l.toEmail}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>}
                      <td><span className="lo-kind" style={{ color: m.color }}><Icon size={15} /> {m.label}</span></td>
                      <td>
                        <div className="lo-name">{l.employee ? `${l.employee.firstName} ${l.employee.lastName}`.trim() : '—'}</div>
                        <div className="lo-sub">{l.toEmail || <span className="lo-err">No email address — add one, or download the PDF</span>}</div>
                      </td>
                      <td className="lo-subject">{l.subject}{l.status === 'FAILED' && l.error && <div className="lo-err">Failed: {l.error}</div>}</td>
                      <td className="lo-sub">{stamp(tab === 'SENT' && l.sentAt ? l.sentAt : l.createdAt)}{l.createdByName && tab !== 'SENT' ? <><br />by {l.createdByName}</> : null}{tab === 'SENT' && l.sentByName ? <><br />by {l.sentByName}</> : null}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setQueue([]); setOpenId(l.id); }}>{actionable ? 'Preview' : 'View'}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      <style>{`
.lo-notice{display:flex;gap:8px;align-items:center;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:14px;}
.lo-notice.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;} .lo-notice.bad{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}
.lo-settings{margin-bottom:16px;} .lo-settings h3{font-size:15px;margin:0 0 4px;} .lo-settings p{font-size:12.5px;color:var(--color-text-muted);margin:0 0 10px;}
.lo-switch{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:14px;} .lo-switch em{font-size:12px;color:var(--color-text-muted);font-style:normal;margin-left:auto;}
.lo-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
.lo-tabs button{border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text-secondary);padding:7px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;gap:8px;align-items:center;}
.lo-tabs button span{background:var(--color-border-light,#eef2f7);padding:0 8px;border-radius:999px;font-size:11.5px;font-variant-numeric:tabular-nums;}
.lo-tabs button.is-on{background:#2563eb;border-color:#2563eb;color:#fff;} .lo-tabs button.is-on span{background:rgba(255,255,255,.25);}
.lo-tabs button:focus-visible,.lo-table button:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
.lo-bar{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:10px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.25);margin-bottom:14px;flex-wrap:wrap;}
.lo-bar b{margin-right:auto;font-size:13px;}
.lo-empty{padding:36px 20px;text-align:center;color:var(--color-text-muted);font-size:14px;margin:0;}
.lo-kind{display:inline-flex;gap:6px;align-items:center;font-weight:700;font-size:12.5px;white-space:nowrap;}
.lo-name{font-weight:600;font-size:13.5px;} .lo-sub{font-size:12px;color:var(--color-text-muted);}
.lo-subject{max-width:340px;font-size:13px;overflow-wrap:anywhere;} .lo-err{color:#b91c1c;font-size:12px;margin-top:3px;}
`}</style>
    </div>
    {openId && (
      <LetterReview
        key={openId}
        id={openId}
        remaining={queue.length}
        onClose={() => { setOpenId(null); setQueue([]); load(); }}
        onDone={advance}
        onReplaced={(newId) => { setOpenId(newId); load(); }}
        setNotice={setNotice}
      />
    )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function LetterReview({ id, remaining, onClose, onDone, onReplaced, setNotice }: {
  id: string; remaining: number; onClose: () => void; onDone: () => void; onReplaced: (newId: string) => void;
  setNotice: (n: { text: string; ok: boolean }) => void;
}) {
  const [letter, setLetter] = useState<any>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    (async () => {
      try {
        const l = await lettersApi.get(id);
        if (!live) return;
        setLetter(l); setToEmail(l.toEmail); setSubject(l.subject);
        url = await lettersApi.pdfUrl(id);
        if (live) setPdf(url); else window.URL.revokeObjectURL(url);
      } catch (e: any) {
        if (live) setErr(e.message || 'Could not load this letter.');
      }
    })();
    return () => { live = false; if (url) window.URL.revokeObjectURL(url); };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const open = letter && (letter.status === 'DRAFT' || letter.status === 'FAILED');
  const dirty = letter && (toEmail !== letter.toEmail || subject !== letter.subject);

  async function run<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(name); setErr(null);
    try { return await fn(); }
    catch (e: any) { setErr(e.message || 'That did not work.'); return undefined; }
    finally { setBusy(null); }
  }

  const saveEdits = () => run('save', async () => {
    const l = await lettersApi.update(id, { toEmail, subject });
    setLetter((prev: any) => ({ ...prev, ...l }));
    setNotice({ ok: true, text: 'Changes saved.' });
  });

  async function send() {
    if (dirty && !(await saveEdits() !== undefined)) return;
    const r: any = await run('send', () => lettersApi.send(id));
    if (!r) return;
    if (r.status === 'SENT') { setNotice({ ok: true, text: `Emailed to ${toEmail}.` }); onDone(); }
    else { setErr(`The email could not be sent: ${r.error || 'unknown error'}. It stays in the Failed tab so you can retry.`); setLetter((p: any) => ({ ...p, status: 'FAILED', error: r.error })); }
  }

  async function discard() {
    if (!confirm('Discard this letter? It will not be emailed.')) return;
    const r = await run('discard', () => lettersApi.discard(id));
    if (r) { setNotice({ ok: true, text: 'Letter discarded.' }); onDone(); }
  }

  async function regenerate() {
    const r: any = await run('regen', () => lettersApi.regenerate(id));
    if (r?.newLetterId) { setNotice({ ok: true, text: 'Letter re-generated from the latest record.' }); onReplaced(r.newLetterId); }
  }

  const meta = letter ? KIND_META[letter.kind as Kind] : null;

  return (
    <div className="lr-back" onClick={() => !busy && onClose()} role="presentation">
      <div className="lr-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Review letter">
        <header className="lr-head">
          <div>
            <div className="lr-eyebrow">{meta ? meta.label : 'Letter'}{remaining > 0 ? ` · ${remaining} more to review after this` : ''}</div>
            <h2>{letter ? (letter.employee ? `${letter.employee.firstName} ${letter.employee.lastName}`.trim() : letter.subject) : 'Loading…'}</h2>
          </div>
          {letter && <span className={`lr-status ${letter.status}`}>{letter.status === 'DRAFT' ? 'Waiting for review' : letter.status === 'SENT' ? `Sent ${letter.sentAt ? stamp(letter.sentAt) : ''}` : letter.status === 'FAILED' ? 'Failed — retry' : 'Discarded'}</span>}
          <button className="lr-x" onClick={onClose} aria-label="Close" disabled={!!busy}><X size={18} /></button>
        </header>

        {err && <div className="lr-err" role="alert"><AlertCircle size={15} /> {err}</div>}
        {letter?.status === 'FAILED' && letter.error && !err && <div className="lr-err" role="alert"><AlertCircle size={15} /> Last attempt failed: {letter.error}</div>}

        <div className="lr-body">
          <section className="lr-pdf">
            {pdf ? <iframe src={pdf} title="Letter preview" /> : <p className="lr-dim" style={{ padding: 16 }}>{err ? '' : 'Loading the PDF…'}</p>}
          </section>
          <section className="lr-side">
            <label>To
              <input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} disabled={!open} placeholder="name@example.com" />
            </label>
            {open && !toEmail.trim() && (
              <p className="lr-noemail">No email address on file. Type one above to send it from here, or download the PDF and send it by hand.</p>
            )}
            <label>Subject
              <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!open} />
            </label>
            {open && dirty && <button className="btn btn-secondary" onClick={saveEdits} disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>}
            <div className="lr-mail-label"><Mail size={14} /> Email text</div>
            {letter && <iframe className="lr-mail" title="Email text" sandbox="" srcDoc={letter.htmlBody} />}
            {pdf && <a className="lr-open" href={pdf} target="_blank" rel="noreferrer">Open the PDF in a new tab</a>}
            {pdf && <a className="lr-open" href={pdf} download={letter?.attachmentName || 'letter.pdf'}>Download the PDF</a>}
            <p className="lr-dim">The PDF above is attached as <b>{letter?.attachmentName}</b>. Something wrong in it? Fix the record first, then press Re-generate.</p>
          </section>
        </div>

        <footer className="lr-foot">
          {open ? (
            <>
              <button className="btn btn-secondary lr-danger" onClick={discard} disabled={!!busy}><Trash2 size={14} /> Discard</button>
              <button className="btn btn-secondary" onClick={regenerate} disabled={!!busy}><RefreshCw size={14} /> {busy === 'regen' ? 'Re-generating…' : 'Re-generate'}</button>
              <button className="btn btn-primary" onClick={send} disabled={!!busy || !toEmail}><Send size={14} /> {busy === 'send' ? 'Sending…' : remaining > 0 ? 'Send & next' : 'Send'}</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          )}
        </footer>
      </div>
      <style>{`
.lr-back{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:14px;}
.lr-panel{background:var(--color-surface,#fff);color:var(--color-text-primary,#111);width:min(1180px,100%);height:min(92vh,860px);border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.28);}
.lr-head{display:flex;gap:14px;align-items:center;padding:14px 20px;border-bottom:1px solid var(--color-border,#e5e7eb);}
.lr-head>div{flex:1;min-width:0;} .lr-head h2{margin:2px 0 0;font-size:18px;overflow-wrap:anywhere;}
.lr-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;}
.lr-status{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;white-space:nowrap;}
.lr-status.SENT{background:#ecfdf5;color:#047857;border-color:#a7f3d0;} .lr-status.FAILED{background:#fef2f2;color:#b91c1c;border-color:#fecaca;} .lr-status.DISCARDED{background:#f1f5f9;color:#475569;border-color:#e2e8f0;}
.lr-x{border:none;background:none;cursor:pointer;color:var(--color-text-muted);padding:4px;border-radius:6px;}
.lr-x:focus-visible{outline:2px solid #2563eb;}
.lr-err{display:flex;gap:8px;align-items:flex-start;margin:10px 20px 0;padding:9px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:600;}
.lr-body{flex:1;display:grid;grid-template-columns:1.25fr 1fr;gap:16px;padding:14px 20px;min-height:0;}
@media (max-width:860px){.lr-body{grid-template-columns:1fr;overflow-y:auto;}.lr-pdf{min-height:420px;}}
.lr-pdf{border:1px solid var(--color-border,#e5e7eb);border-radius:10px;overflow:hidden;background:#f1f5f9;min-height:0;display:flex;}
.lr-pdf iframe{flex:1;width:100%;border:0;background:#fff;}
.lr-side{display:flex;flex-direction:column;gap:10px;min-height:0;overflow-y:auto;}
.lr-side label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:var(--color-text-secondary);}
.lr-side input{padding:9px 11px;border-radius:8px;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-primary,#111);font-size:14px;width:100%;box-sizing:border-box;}
.lr-side input:disabled{background:var(--color-background,#f8fafc);color:var(--color-text-muted);}
.lr-mail-label{display:flex;gap:6px;align-items:center;font-size:12.5px;font-weight:600;color:var(--color-text-secondary);margin-top:4px;}
.lr-mail{flex:1;min-height:200px;width:100%;border:1px solid var(--color-border,#e5e7eb);border-radius:8px;background:#fff;}
.lr-dim{font-size:12px;color:var(--color-text-muted);margin:0;}
.lr-open{font-size:12.5px;font-weight:600;color:#2563eb;}
.lr-noemail{font-size:12.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin:0;}
.lr-foot{display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid var(--color-border,#e5e7eb);flex-wrap:wrap;}
.lr-danger{margin-right:auto;color:#b91c1c;}
`}</style>
    </div>
  );
}
