'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit2, Save, Users, ListTodo, FileText, Megaphone, Clock,
  Plus, Upload, X, Trash2, ChevronLeft, Download, CalendarOff,
  FileImage, FileSpreadsheet, Presentation, File as FileIcon, Flag, Check,
} from 'lucide-react';
import { projectApi, hrmApi, uploadApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Modal, { FormField } from '../../../components/Modal';
import { formatDate } from '../../../lib/date';

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', REVIEW: 'In Review', DONE: 'Completed',
};
const STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'];
const PROJECT_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold', COMPLETED: 'Completed',
};
// Reuses the app's existing badge palette rather than inventing new colors —
// same red/amber/green already used for other statuses elsewhere.
const PROJECT_STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'badge-critical', IN_PROGRESS: 'badge-warning', ON_HOLD: 'badge-probation', COMPLETED: 'badge-healthy',
};
// File format is read straight off the extension — nobody has to declare it,
// and it stays honest even if someone names a file badly.
const FILE_FORMATS: Record<string, { label: string; icon: any; bg: string; color: string }> = {
  pdf: { label: 'PDF', icon: FileText, bg: '#fee2e2', color: '#dc2626' },
  doc: { label: 'Word', icon: FileText, bg: '#dbeafe', color: '#2563eb' },
  docx: { label: 'Word', icon: FileText, bg: '#dbeafe', color: '#2563eb' },
  ppt: { label: 'PowerPoint', icon: Presentation, bg: '#ffedd5', color: '#c2410c' },
  pptx: { label: 'PowerPoint', icon: Presentation, bg: '#ffedd5', color: '#c2410c' },
  xls: { label: 'Excel', icon: FileSpreadsheet, bg: '#dcfce7', color: '#16a34a' },
  xlsx: { label: 'Excel', icon: FileSpreadsheet, bg: '#dcfce7', color: '#16a34a' },
  csv: { label: 'Excel', icon: FileSpreadsheet, bg: '#dcfce7', color: '#16a34a' },
  jpg: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  jpeg: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  png: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  gif: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  webp: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  svg: { label: 'Image', icon: FileImage, bg: '#f3e8ff', color: '#9333ea' },
  txt: { label: 'Text', icon: FileText, bg: '#f1f5f9', color: '#475569' },
  zip: { label: 'Archive', icon: FileIcon, bg: '#f1f5f9', color: '#475569' },
  rar: { label: 'Archive', icon: FileIcon, bg: '#f1f5f9', color: '#475569' },
};
function getFileFormat(fileName: string) {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : '';
  return FILE_FORMATS[ext] || { label: ext ? ext.toUpperCase() : 'File', icon: FileIcon, bg: '#f1f5f9', color: '#475569' };
}
const TABS = [
  { key: 'overview', label: 'Overview', icon: Users },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'milestones', label: 'Milestones', icon: Flag },
  { key: 'timesheet', label: 'Timesheet', icon: Clock },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const canStaffProjects = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const [tab, setTab] = useState<TabKey>('overview');
  const [project, setProject] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const isManager = project ? (project.myRole === 'PROJECT_MANAGER' || canStaffProjects) : false;

  async function fetchAll() {
    try {
      setLoadError('');
      const [proj, empData] = await Promise.all([
        projectApi.getProjectById(id),
        hrmApi.getEmployees(),
      ]);
      setProject(proj);
      setEmployees(Array.isArray(empData) ? empData.filter((e: any) => e.status !== 'INACTIVE') : []);
      const [ann, docs, ms] = await Promise.all([
        projectApi.getAnnouncements(id).catch(() => []),
        projectApi.getDocuments(id).catch(() => []),
        projectApi.getMilestones(id).catch(() => []),
      ]);
      setAnnouncements(Array.isArray(ann) ? ann : []);
      setDocuments(Array.isArray(docs) ? docs : []);
      setMilestones(Array.isArray(ms) ? ms : []);
    } catch (e: any) {
      setLoadError(e.message || 'Could not load this project.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    try {
      await projectApi.updateProjectStatus(id, status);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not update the project status.');
    }
  }

  if (loading) return <div className="fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading project…</div>;
  if (loadError) return (
    <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ color: '#dc2626', marginBottom: '16px' }}>{loadError}</p>
      <button className="btn btn-secondary" onClick={() => router.push('/projects')}><ArrowLeft size={14} /> Back to Projects</button>
    </div>
  );
  if (!project) return null;

  const teamRosterOptions = [
    ...(project.projectManager ? [project.projectManager] : []),
    ...(project.assignments || []).map((a: any) => a.employee),
  ];
  // Projects seeded before this feature existed can have no PM and no team
  // at all — several tab actions are meaningless until HR/Admin staff it.
  const hasRoster = teamRosterOptions.length > 0;

  return (
    <div className="fade-in">
      <button onClick={() => router.push('/projects')} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
        <ArrowLeft size={14} /> Back to Projects
      </button>

      {/* Header — always visible, independent of the active tab */}
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              className={`badge ${PROJECT_STATUS_BADGE[project.status] || 'badge-warning'}`}
              title="Not Started / In Progress / Completed are computed automatically from the start date and deadline"
            >
              {PROJECT_STATUS_LABEL[project.status] || project.status}
            </span>
            {canStaffProjects && (
              project.status === 'ON_HOLD' ? (
                <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('RESUME')}>Resume</button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange('ON_HOLD')}>Put on Hold</button>
              )
            )}
            <span>{project.priority} priority</span>
            {project.myRole && (
              <span style={{ fontWeight: 600, color: '#7c3aed' }}>
                {project.myRole === 'PROJECT_MANAGER' ? '— you manage this project' : "— you're on this team"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Section switcher */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: tab === t.key ? '#2563eb' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--color-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          project={project} employees={employees} isManager={isManager} canStaffProjects={canStaffProjects}
          onChanged={fetchAll}
        />
      )}
      {tab === 'documents' && (
        <DocumentsTab projectId={id} documents={documents} isManager={isManager} hasRoster={hasRoster} onChanged={fetchAll} />
      )}
      {tab === 'tasks' && (
        <TasksTab
          projectId={id} project={project} teamRosterOptions={teamRosterOptions} isManager={isManager}
          hasRoster={hasRoster} onChanged={fetchAll}
        />
      )}
      {tab === 'milestones' && (
        <MilestonesTab projectId={id} milestones={milestones} isManager={isManager} onChanged={fetchAll} />
      )}
      {tab === 'timesheet' && (
        <TimesheetTab
          projectId={id} isManager={isManager} myRole={project.myRole}
          members={(project.assignments || []).map((a: any) => a.employee)}
        />
      )}
      {tab === 'announcements' && (
        <AnnouncementsTab
          projectId={id} announcements={announcements} teamRosterOptions={teamRosterOptions}
          isManager={isManager} hasRoster={hasRoster} onChanged={fetchAll}
        />
      )}
    </div>
  );
}

// ================= OVERVIEW =================

function OverviewTab({ project, employees, isManager, canStaffProjects, onChanged }: any) {
  const [editingOverview, setEditingOverview] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [startDraft, setStartDraft] = useState('');
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [showStaffingModal, setShowStaffingModal] = useState(false);
  const [staffingForm, setStaffingForm] = useState({ projectManagerId: '', teamEmployeeIds: [] as string[] });
  const [staffingError, setStaffingError] = useState('');

  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');

  function startEdit() {
    setDescDraft(project.description || '');
    setStartDraft(project.startDate ? project.startDate.slice(0, 10) : '');
    setDeadlineDraft(project.endDate ? project.endDate.slice(0, 10) : '');
    setEditingOverview(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await projectApi.updateProjectOverview(project.id, {
        description: descDraft,
        ...(canStaffProjects ? {
          startDate: startDraft ? new Date(startDraft).toISOString() : null,
          endDate: deadlineDraft ? new Date(deadlineDraft).toISOString() : null,
        } : {}),
      });
      setEditingOverview(false);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not save the overview.');
    } finally {
      setSaving(false);
    }
  }

  function openStaffingModal() {
    setStaffingForm({
      projectManagerId: project.projectManagerId || '',
      teamEmployeeIds: (project.assignments || []).map((a: any) => a.employeeId),
    });
    setStaffingError('');
    setShowStaffingModal(true);
  }

  function toggleStaffingMember(employeeId: string) {
    setStaffingForm((prev: any) => ({
      ...prev,
      teamEmployeeIds: prev.teamEmployeeIds.includes(employeeId)
        ? prev.teamEmployeeIds.filter((id2: string) => id2 !== employeeId)
        : [...prev.teamEmployeeIds, employeeId],
    }));
  }

  async function handleSaveStaffing() {
    if (!staffingForm.projectManagerId) {
      setStaffingError('A Project Manager must be selected.');
      return;
    }
    try {
      await projectApi.updateProjectStaffing(project.id, staffingForm);
      setShowStaffingModal(false);
      onChanged();
    } catch (e: any) {
      setStaffingError(e.message || 'Could not update staffing.');
    }
  }

  async function handleSaveRole(employeeId: string) {
    try {
      await projectApi.updateMemberRole(project.id, employeeId, roleDraft);
      setEditingRoleFor(null);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not update this role.');
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Overview</h3>
          {isManager && !editingOverview && (
            <button className="btn btn-secondary btn-sm" onClick={startEdit}><Edit2 size={13} /> Edit</button>
          )}
        </div>

        {editingOverview ? (
          <>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Purpose &amp; scope of work</label>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={4}
              placeholder="What's this project's purpose and overall scope of work?"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none', marginBottom: '14px' }}
            />
            {canStaffProjects ? (
              <>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                  Status (Not Started / In Progress / Completed) is computed automatically from these two dates.
                </p>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Start date</label>
                    <input
                      type="date" value={startDraft} onChange={(e) => setStartDraft(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Deadline</label>
                    <input
                      type="date" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                Only HR and administrators can change the start date or deadline.
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingOverview(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}><Save size={13} /> Save</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
              {project.description || 'No overview written yet.'}
            </p>
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', display: 'flex', gap: '18px' }}>
              <span><b style={{ color: 'var(--color-text-secondary)' }}>Start date:</b> {formatDate(project.startDate, 'Not set')}</span>
              <span><b style={{ color: 'var(--color-text-secondary)' }}>Deadline:</b> {formatDate(project.endDate, 'Not set')}</span>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ height: 'fit-content' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}><Users size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Team</h3>
          {canStaffProjects && (
            <button className="btn btn-secondary btn-sm" onClick={openStaffingModal}><Edit2 size={13} /> Add / Remove</button>
          )}
        </div>
        {project.projectManager ? (
          <div style={{ padding: '10px', borderRadius: '8px', background: '#ede9fe', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Project Manager</div>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{project.projectManager.firstName} {project.projectManager.lastName}</div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No Project Manager assigned.</p>
        )}
        {(project.assignments || []).length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No team members yet.</p>
        ) : (project.assignments || []).map((a: any) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', fontSize: '13.5px' }}>
            <span>{a.employee.firstName} {a.employee.lastName}</span>
            {editingRoleFor === a.employeeId ? (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  value={roleDraft} onChange={(e) => setRoleDraft(e.target.value)} placeholder="e.g. Frontend" autoFocus
                  style={{ width: '90px', padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)' }}
                />
                <button aria-label="Save role" onClick={() => handleSaveRole(a.employeeId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a' }}><Save size={13} /></button>
              </div>
            ) : (
              <span
                onClick={() => isManager && (setEditingRoleFor(a.employeeId), setRoleDraft(a.role || ''))}
                style={{ fontSize: '11.5px', color: a.role ? '#2563eb' : 'var(--color-text-muted)', background: a.role ? '#dbeafe' : 'var(--color-background)', padding: '3px 8px', borderRadius: '999px', cursor: isManager ? 'pointer' : 'default' }}
              >
                {a.role || (isManager ? 'Set role' : 'No role set')}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* STAFFING MODAL */}
      <Modal isOpen={showStaffingModal} onClose={() => setShowStaffingModal(false)} title="Add or Remove Team Members">
        {staffingError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{staffingError}</div>
        )}
        <FormField label="Project Manager" type="select" value={staffingForm.projectManagerId} onChange={(v) => setStaffingForm({ ...staffingForm, projectManagerId: v })} required
          options={employees.map((e: any) => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))} />
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Team Members</label>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-background)', maxHeight: '160px', overflowY: 'auto', padding: '8px' }}>
            {employees.filter((e: any) => e.id !== staffingForm.projectManagerId).map((e: any) => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={staffingForm.teamEmployeeIds.includes(e.id)} onChange={() => toggleStaffingMember(e.id)} />
                {e.firstName} {e.lastName}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowStaffingModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveStaffing}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

// ================= DOCUMENTS =================

// ================= MILESTONES =================
// Project-level checkpoints — simpler than Tasks (no assignee, no
// priority): just a title, an optional due date, and PENDING/REACHED.

function MilestonesTab({ projectId, milestones, isManager, onChanged }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) { setError('A title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await projectApi.createMilestone({ projectId, title: title.trim(), dueDate: dueDate || undefined });
      setShowAdd(false);
      setTitle('');
      setDueDate('');
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Could not create this milestone.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReached(m: any) {
    try {
      await projectApi.updateMilestoneStatus(m.id, m.status === 'REACHED' ? 'PENDING' : 'REACHED');
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not update this milestone.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this milestone?')) return;
    try {
      await projectApi.deleteMilestone(id);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not delete this milestone.');
    }
  }

  const sorted = [...milestones].sort((a: any, b: any) => (a.status === b.status ? 0 : a.status === 'REACHED' ? 1 : -1));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Milestones</h3>
        {isManager && (
          <button className="btn btn-primary btn-sm" onClick={() => { setTitle(''); setDueDate(''); setError(''); setShowAdd(true); }}>
            <Plus size={13} /> Add Milestone
          </button>
        )}
      </div>
      {sorted.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No milestones set for this project yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', opacity: m.status === 'REACHED' ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: m.status === 'REACHED' ? '#dcfce7' : '#f3f4f6', color: m.status === 'REACHED' ? '#16a34a' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.status === 'REACHED' ? <Check size={15} /> : <Flag size={14} />}
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, textDecoration: m.status === 'REACHED' ? 'line-through' : 'none' }}>{m.title}</div>
                  {m.dueDate && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Due {formatDate(m.dueDate)}</div>}
                </div>
              </div>
              {isManager && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggleReached(m)}>
                    {m.status === 'REACHED' ? 'Mark Pending' : 'Mark Reached'}
                  </button>
                  <button onClick={() => handleDelete(m.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Milestone">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField label="Title" value={title} onChange={setTitle} placeholder="e.g. MVP shipped" required />
        <FormField label="Due Date (optional)" type="date" value={dueDate} onChange={setDueDate} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Add Milestone'}</button>
        </div>
      </Modal>
    </div>
  );
}

// ================= DOCUMENTS =================

function DocumentsTab({ projectId, documents, isManager, hasRoster, onChanged }: any) {
  const [showUpload, setShowUpload] = useState(false);
  const [docName, setDocName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function nameWithoutExtension(fileName: string) {
    const dot = fileName.lastIndexOf('.');
    return dot > 0 ? fileName.slice(0, dot) : fileName;
  }

  function handleChooseFile(file: File) {
    setPendingFile(file);
    if (!docName.trim()) setDocName(nameWithoutExtension(file.name));
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadApi.uploadFile(pendingFile);
      const ext = pendingFile.name.includes('.') ? pendingFile.name.slice(pendingFile.name.lastIndexOf('.')) : '';
      const typedName = docName.trim() || nameWithoutExtension(pendingFile.name);
      const fileName = typedName.toLowerCase().endsWith(ext.toLowerCase()) || !ext ? typedName : `${typedName}${ext}`;
      await projectApi.uploadDocument(projectId, { kind: 'OTHER', fileUrl: uploaded.url, fileName });
      setShowUpload(false);
      setDocName('');
      setPendingFile(null);
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await projectApi.deleteDocument(projectId, docId);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not delete this document.');
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Documents</h3>
        {isManager && (
          <button
            className="btn btn-primary btn-sm" disabled={!hasRoster}
            style={!hasRoster ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            onClick={() => { setDocName(''); setPendingFile(null); setError(''); setShowUpload(true); }}
          >
            <Upload size={13} /> Upload
          </button>
        )}
      </div>
      {isManager && !hasRoster && (
        <div style={{ padding: '10px 14px', marginBottom: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', fontSize: '13px' }}>
          This project has no team yet — add people in the Overview tab first.
        </div>
      )}
      {documents.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No files uploaded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documents.map((d: any) => {
            const format = getFileFormat(d.fileName);
            const FormatIcon = format.icon;
            return (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: format.bg, color: format.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FormatIcon size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{d.fileName}</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: format.color, background: format.bg, padding: '2px 7px', borderRadius: '999px' }}>{format.label}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {d.uploader?.firstName} {d.uploader?.lastName} · {formatDate(d.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => uploadApi.downloadFile(d.fileUrl, d.fileName).catch((e: any) => alert(e.message || 'Download failed.'))} className="btn btn-secondary btn-sm"><Download size={13} /> Download</button>
                  {isManager && (
                    <button onClick={() => handleDelete(d.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField label="Document Name" value={docName} onChange={setDocName} placeholder="e.g. Login Flow Wireframes" />
        <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: uploading ? 'not-allowed' : 'pointer', marginTop: '4px', marginBottom: '14px' }}>
          <Upload size={14} /> {pendingFile ? pendingFile.name : 'Choose file'}
          <input type="file" style={{ display: 'none' }} disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChooseFile(f); e.target.value = ''; }} />
        </label>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowUpload(false)} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!pendingFile || !docName.trim() || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ================= TASKS =================

function TasksTab({ projectId, project, teamRosterOptions, isManager, hasRoster, onChanged }: any) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
  const [taskError, setTaskError] = useState('');

  const tasks = project.tasks || [];

  if (!isManager) {
    // A plain member only ever has one relevant "member" to look at:
    // themselves — the backend already scopes project.tasks to just their
    // own, so no drill-down list is needed here at all.
    const myTasks = tasks;
    return (
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>My Role &amp; Daily Tasks</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Role on this project: <b style={{ color: 'var(--color-text-secondary)' }}>{project.myRoleLabel || 'Not set'}</b>
        </p>
        {myTasks.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No tasks assigned to you yet.</p>
        ) : (
          <TaskSheet tasks={myTasks} editable={false} />
        )}
      </div>
    );
  }

  // Manager view: pick a team member, then see their role + daily sheet.
  const selectedMember = teamRosterOptions.find((e: any) => e.id === selectedMemberId);
  const selectedAssignment = (project.assignments || []).find((a: any) => a.employeeId === selectedMemberId);
  const isSelectedThePM = project.projectManagerId === selectedMemberId;
  const memberTasks = tasks.filter((t: any) => t.assignedEmployeeId === selectedMemberId);

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
    setTaskError('');
    setShowTaskModal(true);
  }

  function openEditTask(task: any) {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title, description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '', priority: task.priority,
    });
    setTaskError('');
    setShowTaskModal(true);
  }

  async function handleSaveTask() {
    if (!taskForm.title || !taskForm.dueDate) {
      setTaskError('A title and a date are both required for a daily task.');
      return;
    }
    try {
      if (editingTaskId) {
        await projectApi.updateTask(editingTaskId, {
          title: taskForm.title, description: taskForm.description,
          dueDate: new Date(taskForm.dueDate).toISOString(), priority: taskForm.priority,
        });
      } else {
        await projectApi.createTask({
          projectId, assignedEmployeeId: selectedMemberId, title: taskForm.title, description: taskForm.description,
          dueDate: new Date(taskForm.dueDate).toISOString(), priority: taskForm.priority, status: 'NOT_STARTED',
        });
      }
      setShowTaskModal(false);
      onChanged();
    } catch (e: any) {
      setTaskError(e.message || 'Could not save this task.');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      await projectApi.deleteTask(taskId);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not delete this task.');
    }
  }

  async function handleStatus(taskId: string, status: string) {
    try {
      await projectApi.updateTaskStatus(taskId, status);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not update this task.');
    }
  }

  if (!hasRoster) {
    return (
      <div className="card">
        <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', fontSize: '13px' }}>
          This project has no team yet — add people in the Overview tab before assigning tasks.
        </div>
      </div>
    );
  }

  if (!selectedMemberId) {
    return (
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Select a team member</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {teamRosterOptions.map((e: any) => {
            const count = tasks.filter((t: any) => t.assignedEmployeeId === e.id).length;
            const isPM = project.projectManagerId === e.id;
            return (
              <button key={e.id} onClick={() => setSelectedMemberId(e.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{e.firstName} {e.lastName} {isPM && <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '11px' }}>(Project Manager)</span>}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{count} task{count === 1 ? '' : 's'}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <button onClick={() => setSelectedMemberId(null)} className="btn btn-secondary btn-sm" style={{ marginBottom: '14px' }}>
        <ChevronLeft size={13} /> All members
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedMember?.firstName} {selectedMember?.lastName}</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Role: <b style={{ color: 'var(--color-text-secondary)' }}>{isSelectedThePM ? 'Project Manager' : (selectedAssignment?.role || 'Not set')}</b>
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreateTask}><Plus size={13} /> Add Task</button>
      </div>

      {memberTasks.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No tasks assigned yet.</p>
      ) : (
        <TaskSheet tasks={memberTasks} editable onEdit={openEditTask} onDelete={handleDeleteTask} onStatus={handleStatus} />
      )}

      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title={editingTaskId ? 'Edit Task' : `Add Task for ${selectedMember?.firstName}`}>
        {taskError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{taskError}</div>
        )}
        <FormField label="Task" value={taskForm.title} onChange={(v) => setTaskForm({ ...taskForm, title: v })} required placeholder="e.g. Wire up SSO login" />
        <FormField label="Description" type="textarea" value={taskForm.description} onChange={(v) => setTaskForm({ ...taskForm, description: v })} placeholder="What needs to be done..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Date" type="date" value={taskForm.dueDate} onChange={(v) => setTaskForm({ ...taskForm, dueDate: v })} required />
          <FormField label="Priority" type="select" value={taskForm.priority} onChange={(v) => setTaskForm({ ...taskForm, priority: v })}
            options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveTask}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

function TaskSheet({ tasks, editable, onEdit, onDelete, onStatus }: any) {
  const sorted = [...tasks].sort((a: any, b: any) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Task</th>
          <th>Status</th>
          {editable && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map((t: any) => (
          <tr key={t.id}>
            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.dueDate, '—')}</td>
            <td>{t.title}</td>
            <td>
              {editable ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatus(t.id, s)}
                      className={`badge ${t.status === s ? (s === 'DONE' ? 'badge-healthy' : s === 'IN_PROGRESS' ? 'badge-warning' : '') : ''}`}
                      style={{ border: t.status === s ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', opacity: t.status === s ? 1 : 0.5 }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`badge ${t.status === 'DONE' ? 'badge-healthy' : t.status === 'IN_PROGRESS' ? 'badge-warning' : ''}`}>{STATUS_LABEL[t.status] || t.status}</span>
              )}
            </td>
            {editable && (
              <td>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => onEdit(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ================= TIMESHEET =================
// Lives inside the project now, not a standalone sidebar page. A plain team
// member fills in their own entry, today only. HR/Admin/PM never fill one
// in — for themselves or anyone else — only view, same "pick a person"
// pattern as the Tasks tab.

function TimesheetTab({ projectId, isManager, myRole, members }: any) {
  if (isManager) return <ManagerTimesheetView projectId={projectId} members={members} />;
  if (myRole === 'MEMBER') return <MyTimesheetView projectId={projectId} />;
  return (
    <div className="card">
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>
        You're not staffed on this project.
      </p>
    </div>
  );
}

function MyTimesheetView({ projectId }: any) {
  const [data, setData] = useState<{ today: any; history: any[]; projectStatus?: string; timesheetActive?: boolean } | null>(null);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchData() {
    try {
      const d = await projectApi.getMyTimesheet(projectId);
      setData(d);
      setHours(d.today ? String(d.today.hours) : '');
      setDescription(d.today ? (d.today.description || '') : '');
    } catch (e: any) {
      setError(e.message || 'Could not load your timesheet.');
    }
  }

  useEffect(() => { fetchData(); }, [projectId]);

  async function handleSave() {
    const h = parseFloat(hours);
    if (!h || h <= 0 || h > 24) {
      setError('Enter a real number of hours, between 0 and 24.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await projectApi.upsertMyTimesheet(projectId, { hours: h, description });
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Could not save your timesheet.');
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <div className="card">Loading…</div>;

  const today = new Date();
  const weekday = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const todayLabel = `${weekday}, ${formatDate(today)}`;
  const inactiveReason = data.projectStatus === 'NOT_STARTED'
    ? "This project hasn't started yet — timesheet entry opens once it's in progress."
    : data.projectStatus === 'ON_HOLD'
      ? 'This project is on hold — timesheet entry is paused until it resumes.'
      : data.projectStatus === 'COMPLETED'
        ? 'This project is complete — timesheet entry is closed.'
        : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Today — {todayLabel}</h3>
        {!data.timesheetActive ? (
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{inactiveReason}</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              You can fill this in or change it any time today. Once the day is over, it's locked.
            </p>
            {error && (
              <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
            )}
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Hours worked</label>
            <input
              type="number" min="0" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none', marginBottom: '14px' }}
            />
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>What did you work on?</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Brief summary of today's work..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none', marginBottom: '14px' }}
            />
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {data.today ? 'Update' : 'Save'}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>My History</h3>
        {data.history.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Nothing logged yet before today.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '440px', overflowY: 'auto' }}>
            {data.history.map((h: any) => (
              <div key={h.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                  <span>{formatDate(h.date)}</span>
                  <span>{h.hours} hrs</span>
                </div>
                {h.description && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{h.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerTimesheetView({ projectId, members }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryData, setEntryData] = useState<any>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: new Date().toISOString().slice(0, 10), title: '' });
  const [holidayError, setHolidayError] = useState('');

  async function fetchHolidays() {
    try {
      const h = await projectApi.getHolidays(projectId);
      setHolidays(Array.isArray(h) ? h : []);
    } catch { /* not staffed / no access — leave empty */ }
  }
  useEffect(() => { fetchHolidays(); }, [projectId]);

  async function fetchEntry(employeeId: string, d: string) {
    setLoadingEntry(true);
    try {
      const data = await projectApi.getMemberTimesheet(projectId, employeeId, d);
      setEntryData(data);
    } catch {
      setEntryData(null);
    } finally {
      setLoadingEntry(false);
    }
  }

  useEffect(() => {
    if (selectedId) fetchEntry(selectedId, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, date]);

  async function handleCreateHoliday() {
    if (!holidayForm.title.trim()) {
      setHolidayError('Give the holiday a title.');
      return;
    }
    try {
      await projectApi.createHoliday(projectId, holidayForm);
      setShowHolidayModal(false);
      setHolidayForm({ date: new Date().toISOString().slice(0, 10), title: '' });
      fetchHolidays();
      if (selectedId) fetchEntry(selectedId, date);
    } catch (e: any) {
      setHolidayError(e.message || 'Could not save this holiday.');
    }
  }

  async function handleDeleteHoliday(id: string) {
    if (!confirm('Remove this holiday?')) return;
    try {
      await projectApi.deleteHoliday(projectId, id);
      fetchHolidays();
      if (selectedId) fetchEntry(selectedId, date);
    } catch (e: any) {
      alert(e.message || 'Could not remove this holiday.');
    }
  }

  if (!selectedId) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Select a team member</h3>
          {members.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No team members yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((e: any) => (
                <button key={e.id} onClick={() => setSelectedId(e.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{e.firstName} {e.lastName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}><CalendarOff size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Holidays</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setHolidayForm({ date: new Date().toISOString().slice(0, 10), title: '' }); setHolidayError(''); setShowHolidayModal(true); }}>
              <Plus size={13} /> Add
            </button>
          </div>
          {holidays.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>None declared for this project.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {holidays.map((h: any) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{h.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{formatDate(h.date)}</div>
                  </div>
                  <button onClick={() => handleDeleteHoliday(h.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} title="Mark a Holiday">
          {holidayError && (
            <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{holidayError}</div>
          )}
          <FormField label="Date" type="date" value={holidayForm.date} onChange={(v) => setHolidayForm({ ...holidayForm, date: v })} required />
          <FormField label="Title" value={holidayForm.title} onChange={(v) => setHolidayForm({ ...holidayForm, title: v })} required placeholder="e.g. Independence Day" />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowHolidayModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateHoliday}>Save</button>
          </div>
        </Modal>
      </div>
    );
  }

  const selectedMember = members.find((e: any) => e.id === selectedId);

  return (
    <div className="card">
      <button onClick={() => setSelectedId(null)} className="btn btn-secondary btn-sm" style={{ marginBottom: '14px' }}>
        <ChevronLeft size={13} /> All members
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedMember?.firstName} {selectedMember?.lastName}</h3>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '13px', color: 'var(--color-text)' }}
        />
      </div>

      {loadingEntry ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : entryData?.entry ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="badge badge-healthy">Logged</span>
            <span style={{ fontWeight: 700 }}>{entryData.entry.hours} hrs</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>{entryData.entry.description || 'No description given.'}</p>
        </div>
      ) : entryData?.isWeekend ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <span className="badge">Weekend</span>
        </div>
      ) : entryData?.holiday ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <span className="badge badge-healthy">Holiday: {entryData.holiday.title}</span>
        </div>
      ) : !entryData?.timesheetActive ? (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <span className="badge">
            {entryData?.projectStatus === 'NOT_STARTED' ? 'Not Started' : entryData?.projectStatus === 'ON_HOLD' ? 'On Hold' : 'Completed'}
          </span>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            The timesheet wasn't running on this date — not counted as absent.
          </p>
        </div>
      ) : (
        <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
          <span className="badge badge-critical">Absent</span>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '8px' }}>No timesheet entry was filled in for this date.</p>
        </div>
      )}
    </div>
  );
}

// ================= ANNOUNCEMENTS =================

function AnnouncementsTab({ projectId, announcements, teamRosterOptions, isManager, hasRoster, onChanged }: any) {
  const [showCompose, setShowCompose] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', body: '', audienceEmployeeId: '' });
  const [annFile, setAnnFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [annError, setAnnError] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [announcements.length]);

  async function handleFile(file: File) {
    setUploadingFile(true);
    try {
      const res = await uploadApi.uploadFile(file);
      setAnnFile({ url: res.url, name: file.name });
    } catch (e: any) {
      alert(e.message || 'File upload failed.');
    } finally {
      setUploadingFile(false);
    }
  }

  async function handlePost() {
    if (!annForm.title || !annForm.body) {
      setAnnError('A title and message are both required.');
      return;
    }
    try {
      await projectApi.createAnnouncement(projectId, {
        title: annForm.title, body: annForm.body,
        fileUrl: annFile?.url, fileName: annFile?.name,
        audienceEmployeeId: annForm.audienceEmployeeId || undefined,
      });
      setShowCompose(false);
      setAnnForm({ title: '', body: '', audienceEmployeeId: '' });
      setAnnFile(null);
      onChanged();
    } catch (e: any) {
      setAnnError(e.message || 'Could not post this announcement.');
    }
  }

  async function handleDelete(annId: string) {
    if (!confirm('Delete this message?')) return;
    try {
      await projectApi.deleteAnnouncement(projectId, annId);
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Could not delete this message.');
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Announcements</h3>
        {isManager && (
          <button
            title="New announcement" disabled={!hasRoster}
            onClick={() => { setAnnForm({ title: '', body: '', audienceEmployeeId: '' }); setAnnFile(null); setAnnError(''); setShowCompose(true); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: hasRoster ? '#2563eb' : 'var(--color-border)', color: '#fff', cursor: hasRoster ? 'pointer' : 'not-allowed' }}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      {isManager && !hasRoster && (
        <div style={{ padding: '10px 14px', marginBottom: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', fontSize: '13px' }}>
          This project has no team yet — add people in the Overview tab first.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
        {announcements.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Nothing posted yet.</p>
        ) : announcements.map((a: any) => (
          <div key={a.id} style={{ alignSelf: 'flex-start', maxWidth: '75%', padding: '10px 14px', borderRadius: '12px', background: a.audienceEmployeeId ? '#ede9fe' : 'var(--color-background)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{a.title}</span>
              {isManager && (
                <button onClick={() => handleDelete(a.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Trash2 size={13} /></button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0' }}>{a.body}</p>
            {a.fileUrl && (
              <button onClick={() => uploadApi.downloadFile(a.fileUrl, a.fileName).catch((e: any) => alert(e.message || 'Download failed.'))} style={{ fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', padding: 0 }}>📎 {a.fileName || 'Attachment'}</button>
            )}
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              {a.author?.firstName} {a.author?.lastName} · {a.audienceEmployee ? `To: ${a.audienceEmployee.firstName} ${a.audienceEmployee.lastName}` : 'To: Everyone'} · {new Date(a.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="New Announcement">
        {annError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{annError}</div>
        )}
        <FormField label="Title" value={annForm.title} onChange={(v) => setAnnForm({ ...annForm, title: v })} required placeholder="e.g. Project kickoff" />
        <FormField label="Message" type="textarea" value={annForm.body} onChange={(v) => setAnnForm({ ...annForm, body: v })} required placeholder="What do you want to share..." />
        <FormField label="Audience" type="select" value={annForm.audienceEmployeeId} onChange={(v) => setAnnForm({ ...annForm, audienceEmployeeId: v })}
          options={[{ label: 'Everyone on the team', value: '' }, ...teamRosterOptions.map((e: any) => ({ label: e.firstName + ' ' + e.lastName, value: e.id }))]} />
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Attachment (optional)</label>
          {annFile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}>
              <span>📎 {annFile.name}</span>
              <button onClick={() => setAnnFile(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>
            </div>
          ) : (
            <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: uploadingFile ? 'not-allowed' : 'pointer' }}>
              <Upload size={14} /> {uploadingFile ? 'Uploading…' : 'Choose file'}
              <input type="file" style={{ display: 'none' }} disabled={uploadingFile}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePost}>Post</button>
        </div>
      </Modal>
    </div>
  );
}
