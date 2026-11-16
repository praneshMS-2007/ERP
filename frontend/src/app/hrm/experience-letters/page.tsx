'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Award,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Download,
  RefreshCw,
  Briefcase,
  Calendar,
  Code,
  CheckCircle2,
  Search,
  Sparkles,
  Layers,
  Eye,
  AlertCircle,
  Building2,
  ChevronRight,
  Zap,
  FolderKanban,
  Save,
  RotateCcw,
  ClipboardPaste,
} from 'lucide-react';
import { hrmApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import Modal, { FormField } from '@/components/Modal';
import PageGuard from '@/components/PageGuard';
import UserAvatar from '@/components/layout/UserAvatar';
import { useRefreshTick } from '@/lib/refresh';

interface EligibleEmployee {
  id: string;
  empCode: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  designation: string;
  department: string;
  empType: string;
  empTypeLabel: string;
  joinDate: string;
  status: string;
  personalEmail: string | null;
  avatarUrl: string | null;
  letterStatus: 'ISSUED' | null;
  letterIssuedAt: string | null;
  letterDocumentId: string | null;
}

interface Contribution {
  id: string;
  projectName: string;
  role: string | null;
  description: string | null;
  technologies: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface AutoProject {
  projectId: string;
  projectName: string;
  role: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  isManager: boolean;
  tasks: {
    total: number;
    done: number;
    titles: string[];
  };
}

interface EmployeeDetail extends EligibleEmployee {
  customContent: string | null;
  autoProjects: AutoProject[];
  contributions: Contribution[];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function calcTenure(joinDateIso: string): string {
  const start = new Date(joinDateIso);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return '—';
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--;
  if (months <= 0) return 'Less than 1 month';
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} mo${remMonths > 1 ? 's' : ''}`;
  if (remMonths === 0) return `${years} yr${years > 1 ? 's' : ''}`;
  return `${years} yr${years > 1 ? 's' : ''} ${remMonths} mo${remMonths > 1 ? 's' : ''}`;
}

export default function ExperienceLettersPageGuarded() {
  return (
    <PageGuard module="HR" action="WRITE">
      <ExperienceLettersPage />
    </PageGuard>
  );
}

function ExperienceLettersPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Exact letter content input (typed or pasted)
  const [letterContent, setLetterContent] = useState<string>('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'NOT_ISSUED'>('ALL');

  // Contribution Modal (Add / Edit)
  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [editingContribId, setEditingContribId] = useState<string | null>(null);
  const [contribForm, setContribForm] = useState({
    projectName: '',
    role: '',
    description: '',
    technologies: '',
    startDate: '',
    endDate: '',
  });

  // Delete Confirmation Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshTick = useRefreshTick();
  const authorised = hasPermission('HR', 'WRITE');

  // Load employee list
  const loadEmployees = async (keepSelection = true) => {
    try {
      setLoadingList(true);
      const data = await hrmApi.getExperienceLetterEmployees();
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);

      if (list.length > 0) {
        if (!keepSelection || !selectedId || !list.some((e: EligibleEmployee) => e.id === selectedId)) {
          setSelectedId(list[0].id);
        }
      } else {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load employee list', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (authorised) loadEmployees(true);
  }, [authorised, refreshTick]);

  // Load employee detail when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setLetterContent('');
      return;
    }
    let isCancelled = false;
    const loadDetail = async () => {
      try {
        setLoadingDetail(true);
        const data = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
        if (!isCancelled) {
          setDetail(data);
          setLetterContent(data.customContent || '');
        }
      } catch (err: any) {
        if (!isCancelled) showToast(err.message || 'Failed to load employee details', 'error');
      } finally {
        if (!isCancelled) setLoadingDetail(false);
      }
    };
    loadDetail();
    return () => {
      isCancelled = true;
    };
  }, [selectedId]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        emp.fullName.toLowerCase().includes(q) ||
        (emp.empCode && emp.empCode.toLowerCase().includes(q)) ||
        emp.department.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'ISSUED') return emp.letterStatus === 'ISSUED';
      if (statusFilter === 'NOT_ISSUED') return !emp.letterStatus;
      return true;
    });
  }, [employees, searchTerm, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const issued = employees.filter((e) => e.letterStatus === 'ISSUED').length;
    const pending = total - issued;
    return { total, issued, pending };
  }, [employees]);

  // Save Custom Letter Content
  const handleSaveContent = async () => {
    if (!selectedId) return;
    try {
      setActionLoading('save-content');
      await hrmApi.saveExperienceLetterContent(selectedId, letterContent);
      showToast('Certificate body content saved successfully!');
      if (detail) {
        setDetail({ ...detail, customContent: letterContent ? letterContent.trim() : null });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save certificate content', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Auto-Draft from Profile & Projects
  const handleAutoDraft = () => {
    if (!detail) return;
    const projectNames = detail.contributions.map((c) => c.projectName);
    const projSentence =
      projectNames.length > 0
        ? `During this tenure, ${detail.firstName} contributed with distinction across key enterprise initiatives including ${projectNames.join(', ')}.`
        : `During this tenure, ${detail.firstName} exhibited exemplary technical diligence, leadership, and professional excellence across assigned operations.`;

    const draft = `has successfully served as a ${detail.designation} in the ${detail.department} department at Shuroq Technologies from ${fmtDate(detail.joinDate)} to ${fmtDate(new Date().toISOString())}.\n\n${projSentence}\n\nWe appreciate their valuable service and wish them the very best in all future endeavors.`;
    setLetterContent(draft);
    showToast('Draft content composed from profile and projects');
  };

  // Reset to Standard Template Text
  const handleResetStandard = () => {
    if (!detail) return;
    const standard = `has successfully served as a ${detail.designation} in the ${detail.department} department at Shuroq Technologies from ${fmtDate(detail.joinDate)} to ${fmtDate(new Date().toISOString())}.\n\nDuring this tenure, ${detail.firstName} demonstrated exceptional dedication, high technical competence, and professional conduct across all assigned enterprise responsibilities.`;
    setLetterContent(standard);
    showToast('Standard certificate text applied');
  };

  // Open modal to Add Contribution
  const handleOpenAddContrib = () => {
    setEditingContribId(null);
    setContribForm({
      projectName: '',
      role: detail?.designation || '',
      description: '',
      technologies: '',
      startDate: detail?.joinDate ? detail.joinDate.split('T')[0] : '',
      endDate: '',
    });
    setContribModalOpen(true);
  };

  // Open modal to Edit Contribution
  const handleOpenEditContrib = (c: Contribution) => {
    setEditingContribId(c.id);
    setContribForm({
      projectName: c.projectName,
      role: c.role || '',
      description: c.description || '',
      technologies: c.technologies || '',
      startDate: c.startDate ? c.startDate.split('T')[0] : '',
      endDate: c.endDate ? c.endDate.split('T')[0] : '',
    });
    setContribModalOpen(true);
  };

  // Save Contribution
  const handleSaveContrib = async () => {
    if (!contribForm.projectName.trim()) {
      showToast('Project name is required', 'error');
      return;
    }
    if (!selectedId) return;

    try {
      setActionLoading('saving-contrib');
      if (editingContribId) {
        await hrmApi.updateExperienceContribution(editingContribId, contribForm);
        showToast('Project contribution updated successfully');
      } else {
        await hrmApi.addExperienceContribution(selectedId, contribForm);
        showToast('Project contribution added');
      }
      setContribModalOpen(false);
      const updated = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
      setDetail(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to save project contribution', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Contribution
  const handleDeleteContrib = async () => {
    if (!deleteTargetId || !selectedId) return;
    try {
      setActionLoading('deleting-contrib');
      await hrmApi.deleteExperienceContribution(deleteTargetId);
      showToast('Project contribution removed');
      setDeleteTargetId(null);
      const updated = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
      setDetail(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete contribution', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Auto-Fetch from Projects
  const handleAutoFetch = async () => {
    if (!selectedId) return;
    try {
      setActionLoading('auto-fetch');
      const res = await hrmApi.autoFetchExperienceContributions(selectedId);
      if (res.imported > 0) {
        showToast(`Imported ${res.imported} project(s) from Projects module!`);
      } else {
        showToast('All associated projects are already added as contributions.', 'success');
      }
      const updated = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
      setDetail(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to auto-fetch projects', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Add individual auto project
  const handleAddAutoProject = async (p: AutoProject) => {
    if (!selectedId) return;
    try {
      setActionLoading(`import-${p.projectId}`);
      await hrmApi.addExperienceContribution(selectedId, {
        projectName: p.projectName,
        role: p.role,
        startDate: p.startDate ? p.startDate.split('T')[0] : undefined,
        endDate: p.endDate ? p.endDate.split('T')[0] : undefined,
        description: p.tasks.titles.length > 0 ? `Completed tasks: ${p.tasks.titles.slice(0, 3).join(', ')}` : '',
      });
      showToast(`Added "${p.projectName}" to contributions!`);
      const updated = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
      setDetail(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to add project', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Generate / Re-generate Experience Letter
  const handleGenerate = async () => {
    if (!selectedId || !detail) return;
    try {
      setActionLoading('generate');
      const res = await hrmApi.generateExperienceLetter(selectedId, letterContent);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(
          res.pending
            ? 'Experience letter generated and queued in Letter Outbox for review!'
            : 'Experience letter successfully generated and issued!',
        );
      }
      const updated = await hrmApi.getExperienceLetterEmployeeDetail(selectedId);
      setDetail(updated);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === selectedId
            ? { ...e, letterStatus: 'ISSUED', letterIssuedAt: new Date().toISOString(), letterDocumentId: res.documentId }
            : e,
        ),
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to generate experience letter', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    if (!selectedId || !detail) return;
    try {
      setActionLoading('download');
      const safeName = detail.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await hrmApi.downloadExperienceLetter(selectedId, `${safeName}-experience-letter.pdf`);
      showToast('Experience letter downloaded');
    } catch (err: any) {
      showToast(err.message || 'Failed to download experience letter', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  padding: '8px',
                  borderRadius: '10px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={22} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', margin: 0 }}>
                Experience Letter Generation
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--color-text-muted, #64748b)' }}>
              Issue verified corporate experience letters with exact custom text and project contributions.
            </p>
          </div>

          <button
            onClick={() => loadEmployees(true)}
            disabled={loadingList}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 14px' }}
          >
            <RefreshCw size={15} className={loadingList ? 'spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Eligible Employees
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', marginTop: '4px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: '2px' }}>
              Active company staff (non-interns)
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Letters Issued
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
              {stats.issued}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: '2px' }}>
              Official letters generated
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Generation
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
              {stats.pending}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', marginTop: '2px' }}>
              Ready for contribution curation
            </div>
          </div>
        </div>
      </div>

      {/* Master-Detail Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 390px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Employee Selector & Filters */}
        <div className="card" style={{ padding: '18px', borderRadius: '12px', maxHeight: 'calc(100vh - 210px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0f172a)' }}>
              Employees ({filteredEmployees.length})
            </h2>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted, #64748b)' }}>Click to select</span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted, #94a3b8)' }} />
            <input
              type="text"
              placeholder="Search name, code, dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-input-bg, #f8fafc)',
                color: 'var(--color-text-main, #0f172a)',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            {(['ALL', 'ISSUED', 'NOT_ISSUED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: statusFilter === st ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === st ? 'var(--color-primary, #2563eb)' : 'var(--color-bg-muted, #f1f5f9)',
                  color: statusFilter === st ? '#ffffff' : 'var(--color-text-muted, #64748b)',
                  transition: 'all 0.15s ease',
                }}
              >
                {st === 'ALL' ? 'All' : st === 'ISSUED' ? 'Issued' : 'Not Issued'}
              </button>
            ))}
          </div>

          {/* Scrollable Employee List */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted, #94a3b8)', fontSize: '13px' }}>
                <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px auto' }} />
                Loading employee directory...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted, #94a3b8)', fontSize: '13px' }}>
                No employees matching filter
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === selectedId;
                const isIssued = emp.letterStatus === 'ISSUED';

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--color-primary, #2563eb)' : '1px solid var(--color-border, #e2e8f0)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.06)' : 'var(--color-surface, #ffffff)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <UserAvatar name={emp.fullName} avatarUrl={emp.avatarUrl} className="user-avatar-sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-main, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.fullName}
                        </span>
                        {isIssued ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', flexShrink: 0 }}>
                            ISSUED
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: 'var(--color-bg-muted, #f1f5f9)', color: '#64748b', flexShrink: 0 }}>
                            READY
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.designation || 'Staff'} &middot; {emp.department}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '2px' }}>
                        Joined: {fmtDate(emp.joinDate)} ({calcTenure(emp.joinDate)})
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: isSelected ? 'var(--color-primary, #2563eb)' : '#cbd5e1', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Employee Studio & Content Customization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!selectedId || !detail ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
              <Award size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>
                Select an Employee
              </div>
              <p style={{ margin: '6px auto 0 auto', maxWidth: '360px', fontSize: '13px' }}>
                Choose an employee from the left panel to review or paste their experience letter content and issue their official certificate.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '12px' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--color-primary, #2563eb)' }} />
              <div style={{ fontSize: '14px', color: 'var(--color-text-muted, #64748b)' }}>Loading employee profile...</div>
            </div>
          ) : (
            <>
              {/* Profile Card & Action Bar */}
              <div className="card" style={{ padding: '20px 24px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <UserAvatar name={detail.fullName} avatarUrl={detail.avatarUrl} className="user-avatar-lg" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0f172a)' }}>
                          {detail.fullName}
                        </h2>
                        {detail.empCode && (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'var(--color-bg-muted, #f1f5f9)', color: '#475569' }}>
                            {detail.empCode}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                          {detail.empTypeLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--color-text-muted, #64748b)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Briefcase size={14} /> {detail.designation}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={14} /> {detail.department}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={14} /> Joined {fmtDate(detail.joinDate)} ({calcTenure(detail.joinDate)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
                      title="Preview letter with exact template artwork"
                    >
                      <Eye size={15} />
                      <span>Preview Template</span>
                    </button>

                    {detail.letterStatus === 'ISSUED' && (
                      <button
                        onClick={handleDownload}
                        disabled={actionLoading === 'download'}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
                      >
                        <Download size={15} className={actionLoading === 'download' ? 'spin' : ''} />
                        <span>Download PDF</span>
                      </button>
                    )}

                    <button
                      onClick={handleGenerate}
                      disabled={actionLoading === 'generate'}
                      className="btn btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        padding: '8px 18px',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      {actionLoading === 'generate' ? (
                        <RefreshCw size={15} className="spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      <span>{detail.letterStatus === 'ISSUED' ? 'Re-generate Certificate' : 'Generate Experience Certificate'}</span>
                    </button>
                  </div>
                </div>

                {detail.letterStatus === 'ISSUED' && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12.5px',
                      color: '#065f46',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span>
                        Experience Certificate was issued on <strong>{fmtDate(detail.letterIssuedAt)}</strong>.
                        {detail.personalEmail ? ` Emailed to ${detail.personalEmail}.` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#047857' }}>
                      Edit content or contributions below and re-generate anytime to update the document.
                    </span>
                  </div>
                )}
              </div>

              {/* CARD: Exact Experience Letter Content Editor */}
              <div className="card" style={{ padding: '22px', borderRadius: '12px', border: '1.5px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ClipboardPaste size={18} color="#2563eb" />
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0f172a)' }}>
                        Certificate Body Content (Pasted or Custom Text)
                      </h3>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                        Appears Exactly on Certificate
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--color-text-muted, #64748b)' }}>
                      Type or paste the exact sentences/paragraphs to print on the Experience Certificate. If left blank, standard company wording is used.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleAutoDraft}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      title="Auto-compose draft using employee info & project list"
                    >
                      <Zap size={13} color="#f59e0b" />
                      <span>Auto-Draft from Projects</span>
                    </button>

                    <button
                      onClick={handleResetStandard}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      title="Insert standard corporate certification text"
                    >
                      <RotateCcw size={13} />
                      <span>Standard Text</span>
                    </button>

                    <button
                      onClick={handleSaveContent}
                      disabled={actionLoading === 'save-content'}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Save size={13} className={actionLoading === 'save-content' ? 'spin' : ''} />
                      <span>Save Content</span>
                    </button>
                  </div>
                </div>

                {/* Textarea for pasting exact text */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={6}
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    placeholder="Paste or write the exact text here (e.g. 'has successfully served as a Senior Developer in the Engineering department... During this period, they led development of the Shuroq Enterprise ERP...')"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '13.5px',
                      lineHeight: 1.6,
                      borderRadius: '8px',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      background: 'var(--color-input-bg, #ffffff)',
                      color: 'var(--color-text-main, #0f172a)',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'vertical',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '6px',
                      fontSize: '11.5px',
                      color: 'var(--color-text-muted, #64748b)',
                    }}
                  >
                    <span>
                      {letterContent.trim() ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>Custom text active &bull; will be printed verbatim</span>
                      ) : (
                        <span>Default company certification text will be used</span>
                      )}
                    </span>
                    <span>
                      {letterContent.length} characters &bull; {letterContent.trim() ? letterContent.trim().split(/\s+/).length : 0} words
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Project Contributions */}
              <div className="card" style={{ padding: '22px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="var(--color-primary, #2563eb)" />
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0f172a)' }}>
                        Project Contributions Logged ({detail.contributions.length})
                      </h3>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--color-text-muted, #64748b)' }}>
                      Individual project accomplishments and roles completed under the company.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={handleAutoFetch}
                      disabled={actionLoading === 'auto-fetch'}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 12px' }}
                      title="Pull all projects this employee is assigned to in ERP"
                    >
                      <Zap size={14} className={actionLoading === 'auto-fetch' ? 'spin' : ''} color="#f59e0b" />
                      <span>Auto-Sync from Projects</span>
                    </button>

                    <button
                      onClick={handleOpenAddContrib}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 14px' }}
                    >
                      <Plus size={14} />
                      <span>Add Project</span>
                    </button>
                  </div>
                </div>

                {detail.contributions.length === 0 ? (
                  <div
                    style={{
                      border: '1.5px dashed var(--color-border, #cbd5e1)',
                      borderRadius: '10px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      background: 'var(--color-input-bg, #f8fafc)',
                    }}
                  >
                    <FolderKanban size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>
                      No Project Contributions Added Yet
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted, #64748b)', margin: '4px auto 14px auto', maxWidth: '420px' }}>
                      Click <strong>Auto-Sync from Projects</strong> to automatically pull assignments from the ERP, or add custom completed project milestones manually.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button onClick={handleAutoFetch} className="btn btn-secondary" style={{ fontSize: '12.5px' }}>
                        <Zap size={14} color="#f59e0b" style={{ marginRight: '6px' }} />
                        Auto-Sync Now
                      </button>
                      <button onClick={handleOpenAddContrib} className="btn btn-primary" style={{ fontSize: '12.5px' }}>
                        <Plus size={14} style={{ marginRight: '4px' }} />
                        Add Manually
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {detail.contributions.map((c, idx) => (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid var(--color-border, #e2e8f0)',
                          borderRadius: '10px',
                          padding: '16px',
                          background: 'var(--color-surface, #ffffff)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '16px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                              {idx + 1}. {c.projectName}
                            </span>
                            {c.role && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
                                {c.role}
                              </span>
                            )}
                            {(c.startDate || c.endDate) && (
                              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={12} />
                                {fmtDate(c.startDate)} &ndash; {c.endDate ? fmtDate(c.endDate) : 'Present'}
                              </span>
                            )}
                          </div>

                          {c.description && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                              {c.description}
                            </p>
                          )}

                          {c.technologies && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                              <Code size={13} style={{ color: '#64748b' }} />
                              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Stack:</span>
                              {c.technologies.split(',').map((t, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    background: 'var(--color-bg-muted, #f1f5f9)',
                                    color: '#334155',
                                  }}
                                >
                                  {t.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => handleOpenEditContrib(c)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px' }}
                            title="Edit contribution"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', color: '#ef4444' }}
                            title="Delete contribution"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: ERP Projects Assigned */}
              <div className="card" style={{ padding: '22px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FolderKanban size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0f172a)' }}>
                    ERP Project Involvement ({detail.autoProjects.length})
                  </h3>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--color-text-muted, #64748b)' }}>
                  Live project assignments detected from the Shuroq Projects Module. Click "Add to Log" to track any unlisted project.
                </p>

                {detail.autoProjects.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No ERP projects assigned to this employee.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {detail.autoProjects.map((p) => {
                      const isAlreadyAdded = detail.contributions.some(
                        (c) => c.projectName.toLowerCase() === p.projectName.toLowerCase(),
                      );

                      return (
                        <div
                          key={p.projectId}
                          style={{
                            border: '1px solid var(--color-border, #e2e8f0)',
                            borderRadius: '8px',
                            padding: '14px',
                            background: 'var(--color-surface, #ffffff)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                                {p.projectName}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: p.status === 'COMPLETED' ? '#ecfdf5' : '#eff6ff',
                                  color: p.status === 'COMPLETED' ? '#059669' : '#2563eb',
                                }}
                              >
                                {p.status}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Role: <strong>{p.role}</strong>
                            </div>

                            {(p.startDate || p.endDate) && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                {fmtDate(p.startDate)} &ndash; {p.endDate ? fmtDate(p.endDate) : 'Present'}
                              </div>
                            )}

                            {p.tasks.total > 0 && (
                              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                                Tasks: {p.tasks.done}/{p.tasks.total} done
                              </div>
                            )}
                          </div>

                          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            {isAlreadyAdded ? (
                              <span style={{ fontSize: '11.5px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                <CheckCircle2 size={13} /> Included in log
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddAutoProject(p)}
                                disabled={actionLoading === `import-${p.projectId}`}
                                className="btn btn-secondary"
                                style={{ width: '100%', fontSize: '12px', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Plus size={13} />
                                <span>Add to Log</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: Add / Edit Project Contribution */}
      <Modal
        isOpen={contribModalOpen}
        onClose={() => setContribModalOpen(false)}
        title={editingContribId ? 'Edit Project Contribution' : 'Add Project Contribution'}
        width="560px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField
            label="Project Name"
            value={contribForm.projectName}
            onChange={(v) => setContribForm({ ...contribForm, projectName: v })}
            placeholder="e.g. Shuroq Enterprise ERP Platform"
            required
          />

          <FormField
            label="Role in Project"
            value={contribForm.role}
            onChange={(v) => setContribForm({ ...contribForm, role: v })}
            placeholder="e.g. Lead Software Engineer / Project Manager"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormField
              label="Start Date"
              type="date"
              value={contribForm.startDate}
              onChange={(v) => setContribForm({ ...contribForm, startDate: v })}
            />
            <FormField
              label="End Date (Blank if ongoing)"
              type="date"
              value={contribForm.endDate}
              onChange={(v) => setContribForm({ ...contribForm, endDate: v })}
            />
          </div>

          <FormField
            label="Technologies / Tools (Optional)"
            value={contribForm.technologies}
            onChange={(v) => setContribForm({ ...contribForm, technologies: v })}
            placeholder="e.g. React, Next.js, Node.js, PostgreSQL, Docker"
          />

          <FormField
            label="Work Done / Responsibilities Description"
            type="textarea"
            value={contribForm.description}
            onChange={(v) => setContribForm({ ...contribForm, description: v })}
            placeholder="Briefly describe what the employee accomplished on this project..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setContribModalOpen(false)}
              className="btn btn-secondary"
              style={{ fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveContrib}
              disabled={actionLoading === 'saving-contrib'}
              className="btn btn-primary"
              style={{ fontSize: '13px' }}
            >
              {actionLoading === 'saving-contrib' ? 'Saving...' : editingContribId ? 'Update Contribution' : 'Add Contribution'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Delete Confirmation */}
      <Modal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title="Remove Project Contribution"
        width="440px"
      >
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#475569' }}>
            Are you sure you want to remove this project contribution? This will not delete the project from the ERP.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setDeleteTargetId(null)} className="btn btn-secondary" style={{ fontSize: '13px' }}>
              Cancel
            </button>
            <button
              onClick={handleDeleteContrib}
              disabled={actionLoading === 'deleting-contrib'}
              className="btn"
              style={{ background: '#ef4444', color: '#ffffff', fontSize: '13px', border: 'none', borderRadius: '6px', padding: '8px 16px' }}
            >
              {actionLoading === 'deleting-contrib' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Exact Certificate Template Preview */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Experience Certificate — Exact Template Artwork Preview"
        width="680px"
      >
        {detail && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '595px',
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              fontFamily: "'Montserrat', sans-serif",
              color: '#0d0538',
              padding: '0',
            }}
          >
            {/* Top Wavy Ribbon Header */}
            <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0 }}>
              <img
                src="/experience-top-ribbon.png"
                alt="Top Ribbon"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            {/* Inner Content with exact layout */}
            <div style={{ padding: '16px 32px 14px 32px', textAlign: 'center', position: 'relative' }}>
              {/* Watermark in background */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -46%)',
                  width: '200px',
                  opacity: 0.06,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                <img
                  src="/experience-watermark.png"
                  alt="Watermark"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* Centered Logo */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <img src="/experience-logo.png" alt="Shuroq" style={{ height: '56px', width: 'auto', objectFit: 'contain' }} />
              </div>

              {/* Title: EXPERIENCE CERTIFICATE */}
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#0d0538',
                    letterSpacing: '0.08em',
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    textTransform: 'uppercase',
                  }}
                >
                  EXPERIENCE CERTIFICATE
                </div>
              </div>

              {/* Subheading: TO WHOMSOEVER IT MAY CONCERN */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0d0538',
                  letterSpacing: '0.03em',
                  marginBottom: '18px',
                }}
              >
                TO WHOMSOEVER IT MAY CONCERN
              </div>

              {/* Body Text Area */}
              <div style={{ position: 'relative', zIndex: 1, fontSize: '13px', lineHeight: 1.6, color: '#0d0538' }}>
                {letterContent.trim() ? (
                  <div style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                    {letterContent}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                    <p style={{ margin: 0 }}>
                      This is to certify that <strong>{detail.fullName}</strong> worked with Shuroq as an{' '}
                      <strong>{detail.designation || 'Engineer'}</strong> from{' '}
                      <strong>{fmtDate(detail.joinDate)}</strong> to{' '}
                      <strong>{fmtDate(new Date().toISOString())}</strong>.
                    </p>

                    <p style={{ margin: 0 }}>
                      During his tenure, he contributed to the design and development of AI/NLP solutions, including
                      NLP pipelines, intent classification, entity extraction, query understanding, clarification
                      engines, confidence and safety mechanisms, and speech-to-text integration.
                    </p>

                    <p style={{ margin: 0 }}>
                      He also worked on backend integration, AWS-based engineering, production deployment, and support
                      for an AI-powered service marketplace.
                    </p>

                    <p style={{ margin: 0 }}>
                      We appreciate his contributions and wish him all the best in his future career and endeavors.
                    </p>

                    <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>
                      For Shuroq
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: Signature, Seal & MSME */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '28px',
                  paddingTop: '6px',
                }}
              >
                {/* Left: Authorized Signature */}
                <div style={{ textAlign: 'center', width: '150px' }}>
                  <img
                    src="/experience-signature.png"
                    alt="Signature"
                    style={{ height: '68px', width: 'auto', objectFit: 'contain', margin: '0 auto 6px auto', display: 'block' }}
                  />
                  <div style={{ height: '1px', background: '#000000', width: '100%', marginBottom: '4px' }} />
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#545454', letterSpacing: '0.03em' }}>
                    AUTHORIZED SIGNATORY
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#545454', letterSpacing: '0.02em' }}>
                    shuroq
                  </div>
                </div>

                {/* Center-Right: Company Seal */}
                <div style={{ textAlign: 'center' }}>
                  <img
                    src="/experience-seal.png"
                    alt="Company Seal"
                    style={{ height: '70px', objectFit: 'contain' }}
                  />
                </div>

                {/* Right: MSME Logo */}
                <div style={{ textAlign: 'center' }}>
                  <img
                    src="/experience-msme.png"
                    alt="MSME"
                    style={{ height: '64px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Wavy Ribbon Footer */}
            <div style={{ width: '100%', overflow: 'hidden', lineHeight: 0 }}>
              <img
                src="/experience-bottom-ribbon.png"
                alt="Bottom Ribbon"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>
        )}
      </Modal>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .user-avatar-sm {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          color: #334155;
          flex-shrink: 0;
        }
        .user-avatar-lg {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: #334155;
          flex-shrink: 0;
        }
      `,
        }}
      />
    </div>
  );
}
