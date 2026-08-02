'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, Search, Filter, Plus, FileText } from 'lucide-react';
import { projectApi, hrmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ employeeId: '', projectId: '', hours: '8', description: '', date: '' });
  const [search, setSearch] = useState('');

  async function fetchData() {
    try {
      const [tsData, projData, empData] = await Promise.all([
        projectApi.getTimesheets(),
        projectApi.getProjects(),
        hrmApi.getEmployees(),
      ]);
      if (tsData && Array.isArray(tsData)) setTimesheets(tsData);
      if (projData && Array.isArray(projData)) setProjects(projData);
      if (empData && Array.isArray(empData)) setEmployees(empData);
    } catch (e) {
      console.error('Timesheets fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleLogTime() {
    if (!form.employeeId || !form.projectId || !form.hours) return;
    await projectApi.createTimeLog({
      employeeId: form.employeeId,
      projectId: form.projectId,
      hours: parseFloat(form.hours),
      description: form.description,
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
    });
    setShowModal(false);
    setForm({ employeeId: '', projectId: '', hours: '8', description: '', date: '' });
    fetchData();
  }

  const totalHours = timesheets.reduce((s, t) => s + (t.hours || 0), 0);

  const filteredTimesheets = timesheets.filter(t => {
    const name = `${t.employee?.firstName || ''} ${t.employee?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Time Tracking & Timesheets</h1>
          <p>Monitor employee hours, review timesheet submissions, and track project capacity.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Log Hours
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Hours Logged</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{totalHours} hrs</div>
          <div className="kpi-card-trend up">Across all projects</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Entries</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><CheckCircle size={20} /></div>
          </div>
          <div className="kpi-card-value">{timesheets.length}</div>
          <div className="kpi-card-trend neutral">Logs recorded</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active Team Members</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Calendar size={20} /></div>
          </div>
          <div className="kpi-card-value">{employees.length}</div>
          <div className="kpi-card-trend up">Logged in database</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Timesheet Logs ({filteredTimesheets.length})</h3>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}/>
              <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '6px 12px 6px 30px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Project</th>
              <th>Date</th>
              <th>Hours</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimesheets.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No timesheet logs found</td></tr>
            ) : filteredTimesheets.map((t, i) => (
              <tr key={t.id || i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{t.employee?.firstName} {t.employee?.lastName}</div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{t.project?.name || 'Project'}</td>
                <td>{new Date(t.date || t.createdAt).toLocaleDateString()}</td>
                <td style={{ fontWeight: 700 }}>{t.hours} hrs</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{t.description || 'General Work'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LOG HOURS MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Working Hours">
        <FormField label="Employee" type="select" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required
          options={employees.map(e => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))} />
        <FormField label="Project" type="select" value={form.projectId} onChange={(v) => setForm({ ...form, projectId: v })} required
          options={projects.map(p => ({ label: p.name, value: p.id }))} />
        <FormField label="Hours Worked" type="number" value={form.hours} onChange={(v) => setForm({ ...form, hours: v })} required placeholder="8" />
        <FormField label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
        <FormField label="Description / Tasks Completed" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Implemented feature XYZ..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleLogTime}>Log Hours</button>
        </div>
      </Modal>
    </div>
  );
}
