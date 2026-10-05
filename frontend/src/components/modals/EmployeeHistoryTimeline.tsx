'use client';

import { useEffect, useState } from 'react';
import {
  UserPlus, FileText, Sparkles, Briefcase, Building2, IndianRupee, Activity, MapPin, Users,
  CalendarRange, Award, XCircle, LogOut, Download, ArrowRight,
} from 'lucide-react';
import { hrmApi, selfApi } from '../../services/api';

const EVENT_META: Record<string, { icon: any; color: string; label: string }> = {
  JOINED: { icon: UserPlus, color: '#2563eb', label: 'Joined' },
  OFFER_LETTER_ISSUED: { icon: FileText, color: '#0891b2', label: 'Offer letter' },
  ROLE_CONVERTED: { icon: Sparkles, color: '#7c3aed', label: 'Intern hired' },
  EMPLOYMENT_TYPE_CHANGED: { icon: Briefcase, color: '#7c3aed', label: 'Employment type' },
  DESIGNATION_CHANGED: { icon: Briefcase, color: '#4f46e5', label: 'Designation' },
  DEPARTMENT_CHANGED: { icon: Building2, color: '#0d9488', label: 'Department' },
  COMPENSATION_CHANGED: { icon: IndianRupee, color: '#059669', label: 'Pay' },
  STATUS_CHANGED: { icon: Activity, color: '#d97706', label: 'Status' },
  WORK_MODE_CHANGED: { icon: MapPin, color: '#64748b', label: 'Work mode' },
  REPORTING_CHANGED: { icon: Users, color: '#64748b', label: 'Reporting' },
  ENGAGEMENT_DATES_CHANGED: { icon: CalendarRange, color: '#64748b', label: 'Dates' },
  INTERNSHIP_CERTIFICATE_ISSUED: { icon: Award, color: '#059669', label: 'Certificate' },
  INTERNSHIP_CERTIFICATE_REJECTED: { icon: XCircle, color: '#dc2626', label: 'Certificate' },
  EXITED: { icon: LogOut, color: '#dc2626', label: 'Exit' },
  REHIRED: { icon: UserPlus, color: '#16a34a', label: 'Re-hired' },
  TEAM_CHANGED: { icon: Users, color: '#2563eb', label: 'Team' },
};

const TYPE_LABEL: Record<string, string> = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern' };

const DOC_LABEL: Record<string, string> = {
  OFFER_LETTER: 'Offer letter',
  COMPLETION_CERTIFICATE: 'Completion certificate',
  PAYSLIP: 'Payslip',
};

/** Event dates are date-only values stored as UTC midnight — read them in UTC. */
function fmtDay(v: any): string {
  const d = new Date(v);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function fmtStamp(v: any): string {
  const d = new Date(v);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tenure(days: number): string {
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  if (y) return `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo` : ''}`;
  if (m) return `${m} month${m > 1 ? 's' : ''}`;
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** HR view of anyone (`employeeId`), or the signed-in person's own timeline (`self`). */
export default function EmployeeHistoryTimeline({ employeeId, refreshKey, self = false }: { employeeId?: string; refreshKey?: string; self?: boolean }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'role' | 'pay' | 'documents'>('all');

  useEffect(() => {
    setError(null);
    (self ? selfApi.getHistory() : hrmApi.getEmployeeHistory(employeeId!))
      .then(setData)
      .catch((e) => setError(e.message || 'Could not load the history.'));
  }, [employeeId, refreshKey, self]);

  if (error) return <p className="eht-err">{error}</p>;
  if (!data) return <p className="eht-dim">Loading history…</p>;

  const events = data.events.filter((e: any) =>
    filter === 'all' ? true
      : filter === 'role' ? ['JOINED', 'ROLE_CONVERTED', 'EMPLOYMENT_TYPE_CHANGED', 'DESIGNATION_CHANGED', 'DEPARTMENT_CHANGED', 'EXITED', 'REHIRED', 'TEAM_CHANGED'].includes(e.type)
      : filter === 'pay' ? (e.changes ?? []).some((c: any) => c.sensitive)
      : !!e.document,
  );

  async function download(doc: any) {
    try {
      await hrmApi.downloadOfferLetter(doc.id, doc.fileName);
    } catch (e: any) {
      setError(e.message || 'Download failed.');
    }
  }

  return (
    <div className="eht">
      <div className="eht-summary">
        <div className="eht-role">
          <b>{data.employee.designation?.title ?? '—'}</b>
          <span>{TYPE_LABEL[data.employee.empType] ?? data.employee.empType}{data.employee.department?.name ? ` · ${data.employee.department.name}` : ''}</span>
        </div>
        <div><b>{fmtDay(data.employee.joinDate)}</b><span>joined</span></div>
        <div><b>{tenure(data.summary.tenureDays)}</b><span>{data.employee.status === 'INACTIVE' ? 'total tenure' : 'with the company'}</span></div>
        <div><b>{data.summary.roleChanges}</b><span>role change{data.summary.roleChanges === 1 ? '' : 's'}</span></div>
        <div><b>{data.summary.documents}</b><span>document{data.summary.documents === 1 ? '' : 's'} issued</span></div>
        {data.employee.convertedFromInternAt && (
          <div className="eht-hired"><b>Ex-intern</b><span>hired {fmtDay(data.employee.convertedFromInternAt)}</span></div>
        )}
      </div>

      <div className="eht-filters" role="tablist">
        {([['all', 'Everything'], ['role', 'Role changes'], ['pay', 'Pay'], ['documents', 'Documents']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="eht-dim">Nothing recorded in this view yet.</p>
      ) : (
        <ol className="eht-list">
          {events.map((ev: any) => {
            const meta = EVENT_META[ev.type] ?? { icon: Activity, color: '#64748b', label: ev.type };
            const Icon = meta.icon;
            return (
              <li key={ev.id} className="eht-item">
                <span className="eht-dot" style={{ background: meta.color }}><Icon size={14} /></span>
                <div className="eht-card">
                  <div className="eht-top">
                    <span className="eht-tag" style={{ color: meta.color }}>{meta.label}</span>
                    <time className="eht-date">{fmtDay(ev.effectiveDate)}</time>
                  </div>
                  <div className="eht-title">{ev.title}</div>
                  {ev.changes?.length > 0 && (
                    <table className="eht-changes">
                      <tbody>
                        {ev.changes.map((c: any, i: number) => (
                          <tr key={i}>
                            <td>{c.label}</td>
                            <td>{c.from ?? '—'}</td>
                            <td aria-hidden><ArrowRight size={12} /></td>
                            <td><b>{c.to ?? '—'}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {ev.note && <p className="eht-note">{ev.note}</p>}
                  <div className="eht-meta">
                    <span>{ev.actorName ? `by ${ev.actorName}` : 'recorded automatically'} · {fmtStamp(ev.createdAt)}</span>
                    {ev.document && (
                      <button className="eht-doc" onClick={() => download(ev.document)}>
                        <Download size={12} /> {DOC_LABEL[ev.document.kind] ?? 'Document'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <style>{`
.eht{display:flex;flex-direction:column;gap:14px;}
.eht-dim{color:var(--color-text-muted,#6b7280);font-size:13px;}
.eht-err{color:#b91c1c;font-size:13px;font-weight:600;}
.eht-summary{display:flex;flex-wrap:wrap;gap:10px;}
.eht-summary>div{flex:1;min-width:110px;padding:10px 12px;border:1px solid var(--color-border,#e5e7eb);border-radius:10px;background:var(--color-background,#f8fafc);display:flex;flex-direction:column;}
.eht-summary b{font-size:15px;font-variant-numeric:tabular-nums;color:var(--color-text-primary,#111);}
.eht-summary span{font-size:11.5px;color:var(--color-text-muted,#6b7280);}
.eht-summary .eht-role{flex:2;min-width:180px;}
.eht-summary .eht-hired{border-color:#ddd6fe;background:rgba(124,58,237,.07);}
.eht-summary .eht-hired b{color:#6d28d9;}
.eht-filters{display:flex;gap:6px;flex-wrap:wrap;}
.eht-filters button{border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:var(--color-text-secondary,#475569);padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;}
.eht-filters button.is-on{background:#2563eb;border-color:#2563eb;color:#fff;}
.eht-filters button:focus-visible,.eht-doc:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
.eht-list{list-style:none;margin:0;padding:0 0 0 4px;position:relative;}
.eht-list::before{content:"";position:absolute;left:17px;top:6px;bottom:6px;width:2px;background:var(--color-border,#e5e7eb);}
.eht-item{position:relative;display:flex;gap:12px;padding-bottom:14px;}
.eht-dot{position:relative;z-index:1;flex:0 0 28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 0 0 3px var(--color-surface,#fff);}
.eht-card{flex:1;border:1px solid var(--color-border,#e5e7eb);border-radius:10px;padding:10px 12px;background:var(--color-surface,#fff);min-width:0;}
.eht-top{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.eht-tag{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
.eht-date{font-size:12px;font-weight:600;color:var(--color-text-secondary,#475569);font-variant-numeric:tabular-nums;}
.eht-title{font-size:13.5px;font-weight:600;color:var(--color-text-primary,#111);margin-top:2px;overflow-wrap:anywhere;}
.eht-changes{margin-top:8px;border-collapse:collapse;font-size:12.5px;width:100%;}
.eht-changes td{padding:3px 6px 3px 0;vertical-align:top;color:var(--color-text-secondary,#475569);}
.eht-changes td:first-child{white-space:nowrap;color:var(--color-text-muted,#6b7280);width:1%;padding-right:12px;}
.eht-changes td:nth-child(3){color:#94a3b8;width:1%;}
.eht-changes b{color:var(--color-text-primary,#111);font-weight:600;}
.eht-note{margin:8px 0 0;font-size:12.5px;padding:6px 10px;border-left:3px solid #c4b5fd;background:var(--color-background,#f8fafc);border-radius:4px;color:var(--color-text-secondary,#475569);}
.eht-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:11.5px;color:var(--color-text-muted,#6b7280);flex-wrap:wrap;}
.eht-doc{display:inline-flex;gap:4px;align-items:center;border:1px solid var(--color-border,#d1d5db);background:var(--color-surface,#fff);color:#2563eb;padding:3px 9px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;}
`}</style>
    </div>
  );
}
