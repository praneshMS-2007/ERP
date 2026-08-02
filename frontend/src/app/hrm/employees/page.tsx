'use client';

import { useEffect, useState } from 'react';
import {
  Users, UserPlus, MoreVertical, ChevronLeft, ChevronRight,
  Trash2, Edit, Search,
} from 'lucide-react';
import { hrmApi, exportApi } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';
import Modal, { FormField } from '../../../components/Modal';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'FORMER'>('ACTIVE');

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 7;

  // Search / Filter / Sort
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', contact: '', departmentId: '', designationId: '', empType: 'FULL_TIME' });
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  async function fetchAll() {
    try {
      const [empData, attData] = await Promise.all([
        hrmApi.getEmployees(),
        hrmApi.getAttendance(),
      ]);
      const empList = Array.isArray(empData) ? empData : [];
      const attList = Array.isArray(attData) ? attData : [];
      setEmployees(empList);
      setAttendance(attList);

      // Extract departments/designations for the form
      const depts = [...new Map(empList.filter((e: any) => e.department).map((e: any) => [e.department.id, e.department])).values()];
      const desigs = [...new Map(empList.filter((e: any) => e.designation).map((e: any) => [e.designation.id, e.designation])).values()];
      setDepartments(depts);
      setDesignations(desigs);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // Separate active vs former
  const activeEmployees = employees.filter(e => e.status !== 'INACTIVE');
  const formerEmployees = employees.filter(e => e.status === 'INACTIVE');
  const baseList = activeTab === 'ACTIVE' ? activeEmployees : formerEmployees;

  // Search, filter, sort
  let filtered = [...baseList];
  if (searchTerm) {
    filtered = filtered.filter(e =>
      `${e.firstName} ${e.lastName} ${e.empCode || ''} ${e.department?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (filterDept) filtered = filtered.filter(e => e.department?.name === filterDept);
  if (sortBy === 'name') filtered.sort((a, b) => `${a.firstName}`.localeCompare(`${b.firstName}`));
  if (sortBy === 'dept') filtered.sort((a, b) => (a.department?.name || '').localeCompare(b.department?.name || ''));
  if (sortBy === 'type') filtered.sort((a, b) => (a.empType || '').localeCompare(b.empType || ''));

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Unique departments for filter
  const uniqueDepts = [...new Set(employees.map(e => e.department?.name).filter(Boolean))];

  // Today's date for attendance check
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function isPresent(empId: string): boolean {
    return attendance.some((a: any) => {
      const aDate = new Date(a.date);
      return a.employeeId === empId &&
        aDate.getFullYear() === today.getFullYear() &&
        aDate.getMonth() === today.getMonth() &&
        aDate.getDate() === today.getDate() &&
        ['PRESENT', 'HALF_DAY', 'LATE'].includes(a.status);
    });
  }

  // Format employment type
  function formatEmpType(type: string) {
    const map: Record<string, string> = {
      FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern',
    };
    return map[type] || type;
  }

  // Badge styling
  function empTypeBadgeClass(type: string) {
    if (type === 'FULL_TIME') return 'badge badge-active';
    if (type === 'PART_TIME') return 'badge badge-on-leave';
    if (type === 'CONTRACT') return 'badge badge-probation';
    return 'badge';
  }

  // Add Employee
  async function handleAddEmployee() {
    if (!form.firstName || !form.lastName) return;
    await hrmApi.createEmployee({ ...form } as any);
    setShowAddModal(false);
    setForm({ firstName: '', lastName: '', contact: '', departmentId: '', designationId: '', empType: 'FULL_TIME' });
    fetchAll();
  }

  // Delete employee
  async function handleDelete(id: string) {
    if (confirm('Delete this employee?')) {
      await fetch(`http://localhost:5000/api/hrm/employees/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setActionMenuId(null);
      fetchAll();
    }
  }

  // Avatar colors
  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#ec4899', '#14b8a6'];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Employee Directory</h1>
          <p>Manage employee records, profiles, and employment details.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportEmployees(format)} label="Export" />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        <button
          onClick={() => { setActiveTab('ACTIVE'); setPage(0); }}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: activeTab === 'ACTIVE' ? '#2563eb' : 'transparent',
            color: activeTab === 'ACTIVE' ? '#fff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Active Employees ({activeEmployees.length})
        </button>
        <button
          onClick={() => { setActiveTab('FORMER'); setPage(0); }}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: activeTab === 'FORMER' ? '#dc2626' : 'transparent',
            color: activeTab === 'FORMER' ? '#fff' : 'var(--color-text-muted)',
            transition: 'all 0.2s ease',
          }}
        >
          Former Employees ({formerEmployees.length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text" placeholder="Search employees..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                style={{
                  paddingLeft: '34px', padding: '8px 12px 8px 34px', border: '1px solid var(--color-border)', borderRadius: '8px',
                  background: 'var(--color-bg-secondary)', fontSize: '13px', color: 'var(--color-text)', width: '240px', outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="btn btn-secondary btn-sm" value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(0); }} style={{ fontSize: '12px' }}>
              <option value="">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="btn btn-secondary btn-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontSize: '12px' }}>
              <option value="name">Sort by Name</option>
              <option value="dept">Sort by Department</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>
        </div>

        {/* Employee Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em', width: '40px' }}>S.No</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Employee</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Department</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Position</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Type</th>
              {activeTab === 'ACTIVE' && (
                <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Today</th>
              )}
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={activeTab === 'ACTIVE' ? 7 : 6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No employees found</td></tr>
            ) : paginated.map((emp, idx) => {
              const color = colors[(emp.firstName.length + emp.lastName.length) % colors.length];
              const initials = `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase();
              const present = isPresent(emp.id);

              return (
                <tr key={emp.id}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{page * pageSize + idx + 1}</td>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar" style={{ background: color }}>{initials}</div>
                      <div>
                        <div className="employee-name">{emp.firstName} {emp.lastName}</div>
                        <div className="employee-id">ID: {emp.empCode || emp.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department?.name || 'Unassigned'}</td>
                  <td>{emp.designation?.title || '-'}</td>
                  <td><span className={empTypeBadgeClass(emp.empType)}>{formatEmpType(emp.empType)}</span></td>
                  {activeTab === 'ACTIVE' && (
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: present ? '#dcfce7' : '#fee2e2',
                        color: present ? '#16a34a' : '#dc2626',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: present ? '#16a34a' : '#dc2626' }}></span>
                        {present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  )}
                  <td style={{ position: 'relative' }}>
                    <button onClick={() => setActionMenuId(actionMenuId === emp.id ? null : emp.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      <MoreVertical size={16} />
                    </button>
                    {actionMenuId === emp.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 50,
                        background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px', minWidth: '120px',
                      }}>
                        <button onClick={() => setActionMenuId(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text)' }}>
                          <Edit size={14} /> Edit
                        </button>
                        {activeTab === 'ACTIVE' && (
                          <button onClick={() => handleDelete(emp.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Showing {filtered.length === 0 ? 0 : page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} employees
          </span>
          <div className="pagination-buttons">
            <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
            <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Employee">
        <FormField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required placeholder="e.g. John" />
        <FormField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required placeholder="e.g. Smith" />
        <FormField label="Contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="+1 555-0123" />
        <FormField label="Department" type="select" value={form.departmentId} onChange={(v) => setForm({ ...form, departmentId: v })}
          options={departments.map((d: any) => ({ label: d.name, value: d.id }))} />
        <FormField label="Designation" type="select" value={form.designationId} onChange={(v) => setForm({ ...form, designationId: v })}
          options={designations.map((d: any) => ({ label: d.title, value: d.id }))} />
        <FormField label="Employment Type" type="select" value={form.empType} onChange={(v) => setForm({ ...form, empType: v })}
          options={[{ label: 'Full Time', value: 'FULL_TIME' }, { label: 'Part Time', value: 'PART_TIME' }, { label: 'Contract', value: 'CONTRACT' }, { label: 'Intern', value: 'INTERN' }]} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddEmployee}>Add Employee</button>
        </div>
      </Modal>
    </div>
  );
}
