'use client';

import { useEffect, useState } from 'react';
import { Award, CheckCircle2, XCircle, Clock, Mail, AlertCircle, FileText, Hourglass, Pencil, Download, Briefcase, BadgeCheck } from 'lucide-react';
import { hrmApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Modal, { FormField } from '../../../components/Modal';
import PageGuard from '../../../components/PageGuard';
import InternConversionModal from '../../../components/modals/InternConversionModal';
import { useRefreshTick } from '@/lib/refresh';

interface InternCert {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  personalEmail: string | null;
  designation: string;
  department: string;
  joinDate: string;
  engagementEndDate: string | null;
  workMode: string;
  isDurationComplete: boolean;
  certStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  certSentAt: string | null;
  certDocumentId: string | null;
  hasEmail: boolean;
  status: string;
  canConvert: boolean;
  conversion: {
    effectiveDate: string;
    empType: string;
    empTypeLabel: string;
    designation: string | null;
    offerLetterSentAt: string | null;
    offerLetterDocumentId: string | null;
  } | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

export default function InternshipCertificatesPageGuarded() {
  return (
    <PageGuard module="HR" action="WRITE">
      <InternshipCertificatesPage />
    </PageGuard>
  );
}

function InternshipCertificatesPage() {
  const { hasPermission } = useAuth();
  const [interns, setInterns] = useState<InternCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN_PROGRESS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED'>('ALL');
  const [convertTarget, setConvertTarget] = useState<string | null>(null);

  // Editing an intern's join/end date right from this page — no need to
  // leave and go find them in the Employee Directory just to fix a date.
  const [editTarget, setEditTarget] = useState<InternCert | null>(null);
  const [editForm, setEditForm] = useState({ joinDate: '', engagementEndDate: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const authorised = hasPermission('HR', 'WRITE');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrmApi.getInternshipCertificates();
      setInterns(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Could not load internship certificates.');
    } finally {
      setLoading(false);
    }
  }

  const refreshTick = useRefreshTick();
  useEffect(() => {
    if (authorised) load();
  }, [authorised, refreshTick]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleApprove(intern: InternCert) {
    if (!intern.hasEmail) {
      showToast(`Cannot send certificate — ${intern.fullName} has no personal email on file.`, 'error');
      return;
    }
    setActionLoading(intern.id);
    try {
      const result = await hrmApi.approveInternshipCertificate(intern.id);
      if (result.pending) {
        showToast(`Certificate for ${intern.fullName} is ready — review it in Letter Outbox before it is emailed.`, 'success');
      } else if (result.emailed) {
        showToast(`Certificate sent to ${intern.fullName} at ${intern.personalEmail}`, 'success');
      } else if (result.documentId) {
        showToast(`Certificate generated for ${intern.fullName}, but email failed: ${result.error || 'Unknown error'}`, 'error');
      } else {
        showToast(`Failed: ${result.error || 'Unknown error'}`, 'error');
      }
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to approve certificate.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(intern: InternCert) {
    setActionLoading(intern.id);
    try {
      await hrmApi.rejectInternshipCertificate(intern.id);
      showToast(`Certificate rejected for ${intern.fullName}`, 'success');
      await load();
    } catch (e: any) {
      showToast(e.message || 'Failed to reject.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadCertificate(intern: InternCert) {
    const targetId = intern.id || intern.certDocumentId;
    if (!targetId) {
      showToast('Certificate not found.', 'error');
      return;
    }
    setDownloadingId(intern.id);
    try {
      const sanitizedName = (intern.fullName || 'Intern').trim().replace(/\s+/g, '_');
      await hrmApi.downloadInternshipCertificate(
        targetId,
        `${sanitizedName}_Internship_Completion_Certificate.pdf`
      );
      showToast(`Downloading certificate for ${intern.fullName}...`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to download certificate.', 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  function openEditDates(intern: InternCert) {
    setEditTarget(intern);
    setEditForm({
      joinDate: intern.joinDate ? intern.joinDate.slice(0, 10) : '',
      engagementEndDate: intern.engagementEndDate ? intern.engagementEndDate.slice(0, 10) : '',
    });
    setEditError('');
  }

  async function handleSaveDates() {
    if (!editTarget) return;
    if (!editForm.joinDate) {
      setEditError('Date of joining is required.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await hrmApi.updateEmployee(editTarget.id, {
        joinDate: editForm.joinDate,
        engagementEndDate: editForm.engagementEndDate || null,
      });
      setEditTarget(null);
      showToast(`Dates updated for ${editTarget.fullName}`, 'success');
      await load();
    } catch (e: any) {
      setEditError(e.message || 'Could not save these dates.');
    } finally {
      setEditSaving(false);
    }
  }

  const filtered = filterStatus === 'ALL' ? interns
    : filterStatus === 'IN_PROGRESS' ? interns.filter((i) => !i.isDurationComplete)
    : filterStatus === 'CONVERTED' ? interns.filter((i) => !!i.conversion)
    : interns.filter((i) => i.isDurationComplete && i.certStatus === filterStatus);

  const counts = {
    total: interns.length,
    inProgress: interns.filter((i) => !i.isDurationComplete).length,
    pending: interns.filter((i) => i.isDurationComplete && i.certStatus === 'PENDING').length,
    approved: interns.filter((i) => i.isDurationComplete && i.certStatus === 'APPROVED').length,
    rejected: interns.filter((i) => i.isDurationComplete && i.certStatus === 'REJECTED').length,
    converted: interns.filter((i) => !!i.conversion).length,
  };

  async function handleDownloadOfferLetter(intern: InternCert) {
    const docId = intern.conversion?.offerLetterDocumentId;
    if (!docId) return;
    const base = intern.fullName.trim().split(/\s+/).join('_');
    try {
      await hrmApi.downloadOfferLetter(docId, `${base}_${intern.conversion!.empTypeLabel.split(' ').join('_')}_Offer_Letter.pdf`);
    } catch (e: any) {
      showToast(e.message || 'Failed to download the offer letter.', 'error');
    }
  }

  if (!authorised) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center" style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-danger)' }} />
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: 18, fontWeight: 600 }}>Access Denied</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>You do not have permission to manage internship certificates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9999,
            padding: '14px 22px', borderRadius: 10, maxWidth: 420,
            background: toast.type === 'success' ? '#059669' : '#dc2626',
            color: '#fff', fontWeight: 500, fontSize: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            animation: 'slideInRight 0.3s ease-out',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={28} style={{ color: 'var(--color-primary)' }} />
          Internship Completion Certificates
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
          Every intern in the company — approve or reject their completion certificate once their internship has ended, then offer a part-time or full-time role to the ones you want to keep.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Interns', value: counts.total, icon: FileText, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'In Progress', value: counts.inProgress, icon: Hourglass, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Pending Review', value: counts.pending, icon: Clock, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Approved & Sent', value: counts.approved, icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Hired as Employees', value: counts.converted, icon: Briefcase, color: '#7c3aed', bg: '#f5f3ff' },
        ].map((card) => (
          <div
            key={card.label}
            className="card"
            style={{
              background: 'var(--color-surface)', borderRadius: 12, padding: '20px 18px',
              border: '1px solid var(--color-border-light)',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: card.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'ALL', label: 'All', count: null },
          { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
          { key: 'PENDING', label: 'Pending', count: counts.pending },
          { key: 'APPROVED', label: 'Approved', count: counts.approved },
          { key: 'REJECTED', label: 'Rejected', count: counts.rejected },
          { key: 'CONVERTED', label: 'Hired', count: counts.converted },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
              border: filterStatus === key ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: filterStatus === key ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterStatus === key ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {label}
            {count !== null && <span style={{ marginLeft: 6, opacity: 0.8 }}>({count})</span>}
          </button>
        ))}
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="card" style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid var(--color-border-light)' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>Loading intern data…</div>
        </div>
      )}
      {error && (
        <div className="card" style={{ background: '#fef2f2', borderRadius: 12, padding: 20, border: '1px solid #fecaca' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="card" style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid var(--color-border-light)' }}>
          <Award size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 600 }}>No interns found</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
            {filterStatus === 'ALL'
              ? 'No interns in the company yet.'
              : filterStatus === 'IN_PROGRESS'
              ? 'No interns currently mid-internship.'
              : filterStatus === 'CONVERTED'
              ? 'No interns have been offered a role yet.'
              : `No completed interns with "${filterStatus.toLowerCase()}" status.`}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="card" style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border-light)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border-light)' }}>
                  {['Intern', 'Designation', 'Department', 'Internship Period', 'Duration', 'Status', 'Sent Date', 'Actions', ''].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                      color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((intern) => {
                  const months = intern.engagementEndDate && intern.joinDate
                    ? monthsBetween(intern.joinDate, intern.engagementEndDate)
                    : null;
                  const isActioning = actionLoading === intern.id;

                  return (
                    <tr key={intern.id} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-background)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name + Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{intern.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} />
                          {intern.personalEmail || 'No email'}
                        </div>
                      </td>

                      {/* Designation */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-primary)' }}>{intern.designation}</td>

                      {/* Department */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>{intern.department}</td>

                      {/* Period */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(intern.joinDate)} → {fmtDate(intern.engagementEndDate)}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)' }}>
                        {months !== null && months > 0 ? `${months} month${months === 1 ? '' : 's'}` : '—'}
                      </td>

                      {/* Status Badge — "In Progress" overrides certStatus entirely until the duration actually ends */}
                      <td style={{ padding: '14px 16px' }}>
                        {intern.conversion ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', whiteSpace: 'nowrap',
                          }}>
                            <BadgeCheck size={12} /> Hired · {intern.conversion.empTypeLabel}
                          </span>
                        ) : !intern.isDurationComplete ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe',
                          }}>
                            <Hourglass size={12} /> In Progress
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            ...(intern.certStatus === 'PENDING' ? { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' } :
                              intern.certStatus === 'APPROVED' ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' } :
                                { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }),
                          }}>
                            {intern.certStatus === 'PENDING' && <Clock size={12} />}
                            {intern.certStatus === 'APPROVED' && <CheckCircle2 size={12} />}
                            {intern.certStatus === 'REJECTED' && <XCircle size={12} />}
                            {intern.certStatus === 'PENDING' ? 'Pending' : intern.certStatus === 'APPROVED' ? 'Approved & Sent' : 'Rejected'}
                          </span>
                        )}
                      </td>

                      {/* Sent Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {intern.certSentAt ? fmtDate(intern.certSentAt) : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        {!intern.isDurationComplete ? (
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {intern.engagementEndDate ? `Not completed yet — ends ${fmtDate(intern.engagementEndDate)}` : 'No end date set'}
                          </span>
                        ) : intern.certStatus === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleApprove(intern)}
                              disabled={isActioning}
                              style={{
                                padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                background: '#059669', color: '#fff', border: 'none', cursor: 'pointer',
                                opacity: isActioning ? 0.6 : 1, transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                              }}
                            >
                              <CheckCircle2 size={13} />
                              {isActioning ? 'Processing…' : 'Approve & Send'}
                            </button>
                            <button
                              onClick={() => handleReject(intern)}
                              disabled={isActioning}
                              style={{
                                padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer',
                                opacity: isActioning ? 0.6 : 1, transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                              }}
                            >
                              <XCircle size={13} />
                              Reject
                            </button>
                          </div>
                        ) : intern.certStatus === 'APPROVED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {intern.conversion ? (
                              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                  {intern.conversion.designation} · from {fmtDate(intern.conversion.effectiveDate)}
                                </div>
                                {intern.conversion.offerLetterDocumentId && (
                                  <button
                                    onClick={() => handleDownloadOfferLetter(intern)}
                                    style={{ marginTop: 3, padding: 0, border: 'none', background: 'none', color: '#6d28d9', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' }}
                                  >
                                    <Download size={12} /> Offer letter{intern.conversion.offerLetterSentAt ? ` · emailed ${fmtDate(intern.conversion.offerLetterSentAt)}` : ' · not emailed'}
                                  </button>
                                )}
                              </div>
                            ) : intern.canConvert ? (
                              <button
                                onClick={() => setConvertTarget(intern.id)}
                                title={`Offer ${intern.fullName} a part-time or full-time role`}
                                style={{
                                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                  background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}
                              >
                                <Briefcase size={13} /> Offer Job
                              </button>
                            ) : null}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              color: '#059669',
                              fontWeight: 600,
                            }}>
                              <CheckCircle2 size={13} /> Issued
                            </span>
                            <button
                              onClick={() => handleDownloadCertificate(intern)}
                              disabled={downloadingId === intern.id}
                              title={`Download ${intern.fullName}'s Completion Certificate`}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                cursor: downloadingId === intern.id ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                transition: 'all 0.15s ease',
                                opacity: downloadingId === intern.id ? 0.7 : 1,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#0369a1')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#0284c7')}
                            >
                              <Download size={13} />
                              {downloadingId === intern.id ? 'Downloading…' : 'Download PDF'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Declined</span>
                        )}
                      </td>

                      {/* Edit dates */}
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => openEditDates(intern)}
                          title="Edit join / end date"
                          style={{
                            padding: '6px 8px', borderRadius: 7, border: '1px solid var(--color-border)',
                            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InternConversionModal
        employeeId={convertTarget}
        onClose={() => setConvertTarget(null)}
        onConverted={() => { load(); }}
      />

      {/* EDIT DATES MODAL */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Dates — ${editTarget?.fullName ?? ''}`} width="420px">
        {editError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>
        )}
        <FormField label="Date of Joining" type="date" value={editForm.joinDate} onChange={(v) => setEditForm({ ...editForm, joinDate: v })} required />
        <FormField label="Internship End Date" type="date" value={editForm.engagementEndDate} onChange={(v) => setEditForm({ ...editForm, engagementEndDate: v })} />
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
          Leaving the end date blank means this internship has no set completion date yet — it'll stay "In Progress" here until one is added.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveDates} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      {/* Toast slide-in animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
