'use client';

import { useEffect, useState } from 'react';
import {
  FolderKanban, CheckCircle2, Clock, AlertOctagon,
  Plus, Filter, MoreHorizontal, ChevronRight, TrendingUp, Edit, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { projectApi, hrmApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, overdue: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '' });

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
      setStats({
        total: list.length,
        active: list.filter((p: any) => p.status === 'IN_PROGRESS' || p.status === 'ACTIVE').length,
        completed: list.filter((p: any) => p.status === 'COMPLETED').length,
        overdue: list.filter((p: any) => p.endDate && new Date(p.endDate) < new Date() && p.status !== 'COMPLETED').length,
      });
    } catch (e) { console.error('Projects error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  // Compute live Team Capacity per employee from real DB assignments
  const teamCapacity = employees.slice(0, 5).map(emp => {
    const assignedProjects = projects.filter(p => p.assignments?.some((a: any) => a.employeeId === emp.id));
    const activeCount = assignedProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'ACTIVE').length;
    const pct = Math.min(100, Math.max(25, activeCount * 30 || 25));
    let statusText = 'Optimal capacity';
    if (pct >= 80) statusText = `Over capacity: ${activeCount} active projects`;
    else if (pct <= 40) statusText = `High availability: ${activeCount} active project`;
    else statusText = `Optimal: ${activeCount} active projects`;
    return { id: emp.id, name: `${emp.firstName} ${emp.lastName}`, pct, statusText, activeCount };
  });

  let filtered = [...projects];
  if (filterStatus) filtered = filtered.filter(p => p.status === filterStatus);

  async function handleCreate() {
    if (!form.name) return;
    await projectApi.createProject({
      name: form.name, description: form.description, priority: form.priority,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    } as any);
    setShowAddModal(false);
    setForm({ name: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '' });
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this project?')) {
      await fetch(`http://localhost:5000/api/projects/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setActionMenuId(null);
      fetchAll();
    }
  }

  const statusIcon = (s: string) => {
    if (s === 'COMPLETED') return <CheckCircle2 size={14} style={{ color: '#16a34a' }} />;
    if (s === 'IN_PROGRESS' || s === 'ACTIVE') return <Clock size={14} style={{ color: '#2563eb' }} />;
    return <AlertOctagon size={14} style={{ color: '#d97706' }} />;
  };

  const statusColor = (s: string) => {
    if (s === 'COMPLETED') return '#dcfce7';
    if (s === 'IN_PROGRESS' || s === 'ACTIVE') return '#dbeafe';
    return '#fef3c7';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Project Management</h1>
          <p>Track initiatives, monitor team capacity, and ensure timely delivery.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportProjects(format)} label="Export Projects" />
          <select className="btn btn-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Status</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="PLANNING">Planning</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* KPI Grid — LIVE */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Projects</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><FolderKanban size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active</div>
            <div className="kpi-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.active}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Completed</div>
            <div className="kpi-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.completed}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Overdue</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertOctagon size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: stats.overdue > 0 ? '#dc2626' : undefined }}>{stats.overdue}</div>
        </div>
      </div>

      {/* Main Content Grid — Projects + Live Team Capacity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px', marginTop: '16px' }}>

        {/* Left Column: Projects Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', alignContent: 'start' }}>
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
                        <button onClick={() => handleDelete(proj.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: statusColor(proj.status), display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {statusIcon(proj.status)} {proj.status}
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                    {proj.priority || 'MEDIUM'}
                  </span>
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

        {/* Right Column: Live Team Capacity */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Team Capacity</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Live DB</span>
          </div>

          {teamCapacity.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No active team members</div>
          ) : teamCapacity.map((item) => (
            <div key={item.id} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                <span>{item.name}</span>
                <span style={{ color: item.pct >= 80 ? '#dc2626' : item.pct <= 40 ? '#2563eb' : '#16a34a' }}>{item.pct}%</span>
              </div>
              <div className="progress-bar-track" style={{ height: '6px', marginBottom: '4px' }}>
                <div className="progress-bar-fill" style={{ width: `${item.pct}%`, background: item.pct >= 80 ? '#dc2626' : item.pct <= 40 ? '#2563eb' : '#16a34a', borderRadius: '4px' }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.statusText}</div>
            </div>
          ))}
        </div>

      </div>

      {/* CREATE PROJECT MODAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Project">
        <FormField label="Project Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Solar Grid Phase 3" />
        <FormField label="Description" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Brief project description..." />
        <FormField label="Priority" type="select" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
          options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
          <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>Create Project</button>
        </div>
      </Modal>
    </div>
  );
}
