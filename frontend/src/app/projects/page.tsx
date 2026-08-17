'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2, Clock, AlertOctagon,
  Plus, MoreHorizontal, ChevronRight, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { projectApi, hrmApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export default function ProjectsPage() {
  const { user } = useAuth();
  // Matches the backend's canStaffProjects exactly: only these two roles may
  // create/delete a project or change its staffing — not even a system-wide
  // "Project Manager" role holder, since that role's PROJECTS:ALL grant is
  // deliberately not enough on its own for these specific actions.
  const canStaffProjects = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '',
    projectManagerId: '', teamEmployeeIds: [] as string[],
  });

  async function fetchAll() {
    try {
      const [data, empData] = await Promise.all([
        projectApi.getProjects(),
        hrmApi.getEmployees(),
      ]);
      const list = Array.isArray(data) ? data : [];
      const empList = Array.isArray(empData) ? empData.filter((e: any) => e.status !== 'INACTIVE') : [];
      setProjects(list);
      setEmployees(empList);
    } catch (e) { console.error('Projects error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  let filtered = [...projects];
  if (filterStatus) filtered = filtered.filter(p => p.status === filterStatus);

  async function handleCreate() {
    if (!form.name || !form.projectManagerId) {
      setCreateError('A project name and a Project Manager are both required.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setCreateError('A start date and a deadline are both required — status is computed automatically from them.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setCreateError('The deadline cannot be before the start date.');
      return;
    }
    setCreateError('');
    try {
      await projectApi.createProject({
        name: form.name, description: form.description, status: 'NOT_STARTED', priority: form.priority,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        projectManagerId: form.projectManagerId,
        teamEmployeeIds: form.teamEmployeeIds,
      });
      setShowAddModal(false);
      setForm({ name: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '', projectManagerId: '', teamEmployeeIds: [] });
      fetchAll();
    } catch (e: any) {
      setCreateError(e.message || 'Could not create this project.');
    }
  }

  function toggleTeamMember(employeeId: string) {
    setForm((prev) => ({
      ...prev,
      teamEmployeeIds: prev.teamEmployeeIds.includes(employeeId)
        ? prev.teamEmployeeIds.filter((id) => id !== employeeId)
        : [...prev.teamEmployeeIds, employeeId],
    }));
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this project?')) {
      setActionMenuId(null);
      try {
        await projectApi.deleteProject(id);
        fetchAll();
      } catch (e: any) {
        alert(e.message || 'Could not delete this project.');
      }
    }
  }

  const statusIcon = (s: string) => {
    if (s === 'COMPLETED') return <CheckCircle2 size={14} />;
    if (s === 'IN_PROGRESS' || s === 'ACTIVE') return <Clock size={14} />;
    if (s === 'ON_HOLD') return <AlertOctagon size={14} />;
    return <AlertOctagon size={14} />;
  };

  // Same palette as the project detail page — red/amber/gray/green reused
  // from the app's existing badge classes, not invented one-off colors.
  const STATUS_BADGE_CLASS: Record<string, string> = {
    NOT_STARTED: 'badge-critical', IN_PROGRESS: 'badge-warning', ACTIVE: 'badge-warning',
    ON_HOLD: 'badge-probation', COMPLETED: 'badge-healthy',
  };
  const STATUS_LABEL: Record<string, string> = {
    NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', ACTIVE: 'In Progress',
    ON_HOLD: 'On Hold', COMPLETED: 'Completed',
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Project Management</h1>
          <p>Browse and manage projects.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportProjects(format)} label="Export Projects" />
          <select className="btn btn-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Status</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
          {canStaffProjects && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Just the projects — no dashboard-style summary cards or capacity panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignContent: 'start', marginTop: '16px' }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>No projects found</div>
          ) : filtered.map((proj) => {
            const totalTasks = proj.tasks?.length || 0;
            const doneTasks = proj.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return (
              <div key={proj.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{proj.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>{proj.description || 'No description'}</p>
                    {proj.projectManager && (
                      <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        PM: {proj.projectManager.firstName} {proj.projectManager.lastName}
                      </p>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setActionMenuId(actionMenuId === proj.id ? null : proj.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      <MoreHorizontal size={16} />
                    </button>
                    {actionMenuId === proj.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 50,
                        background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px', minWidth: '120px',
                      }}>
                        <Link href={`/projects/${proj.id}`} onClick={() => setActionMenuId(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--color-text)', textDecoration: 'none', borderRadius: '6px' }}>
                          <ChevronRight size={14} /> View
                        </Link>
                        {canStaffProjects && (
                          <button onClick={() => handleDelete(proj.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span className={`badge ${STATUS_BADGE_CLASS[proj.status] || 'badge-warning'}`} style={{ gap: '4px' }}>
                    {statusIcon(proj.status)} {STATUS_LABEL[proj.status] || proj.status}
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                    {proj.priority || 'MEDIUM'}
                  </span>
                  {proj.myRole === 'PROJECT_MANAGER' && (
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#ede9fe', color: '#7c3aed' }}>
                      You manage this
                    </span>
                  )}
                  {proj.myRole === 'MEMBER' && (
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#dbeafe', color: '#2563eb' }}>
                      You're on this team
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    <span>{doneTasks}/{totalTasks} tasks</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progress}%`, background: progress === 100 ? '#16a34a' : '#2563eb' }} />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* CREATE PROJECT MODAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Project">
        {createError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            {createError}
          </div>
        )}
        <FormField label="Project Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Solar Grid Phase 3" />
        <FormField label="Description" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Brief project description..." />
        <FormField label="Priority" type="select" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
          options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
          <FormField label="Deadline" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
        </div>

        <FormField label="Project Manager" type="select" value={form.projectManagerId} onChange={(v) => setForm({ ...form, projectManagerId: v })} required
          options={employees.map((e: any) => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))} />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
            Team Members
          </label>
          <div style={{
            border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-background)',
            maxHeight: '160px', overflowY: 'auto', padding: '8px',
          }}>
            {employees.filter((e: any) => e.id !== form.projectManagerId).map((e: any) => (
              <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.teamEmployeeIds.includes(e.id)}
                  onChange={() => toggleTeamMember(e.id)}
                />
                {e.firstName} {e.lastName}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>Create Project</button>
        </div>
      </Modal>
    </div>
  );
}
