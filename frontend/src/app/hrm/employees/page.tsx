'use client';

import { useEffect, useState } from 'react';
import {
  Users, UserPlus, MoreVertical, ChevronLeft, ChevronRight,
  Trash2, Edit, Search, Eye, EyeOff,
} from 'lucide-react';
import { hrmApi, exportApi, API_ORIGIN } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';
import Modal, { FormField } from '../../../components/Modal';
import EmployeeDetailModal from '../../../components/modals/EmployeeDetailModal';
import { useAuth } from '../../../context/AuthContext';

export default function EmployeeDirectory() {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Create/edit/remove all hit HR:WRITE server-side (only SUPER_ADMIN/
  // HR_MANAGER hold it) — the page used to render these buttons for every
  // logged-in user regardless of role, so a plain EMPLOYEE saw "Add
  // Employee" and a Remove option that would only fail once clicked.
  const canManageEmployees = hasPermission('HR', 'WRITE');
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

  // Detail / edit modal
  const [detailId, setDetailId] = useState<string | null>(null);

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Management Account vs Employee Account — every Employee Account gets the
  // same uniform EMPLOYEE-tier access; a Management Account is the only way
  // to grant one of the elevated system roles (Super Admin only, enforced
  // server-side too). Project Manager is deliberately not selectable here —
  // that stays project-scoped, assigned only via project staffing.
  const [accountKind, setAccountKind] = useState<'EMPLOYEE' | 'MANAGEMENT'>('EMPLOYEE');
  const [form, setForm] = useState({
    firstName: '', lastName: '', personalEmail: '', contact: '',
    department: '', designation: '', empType: 'FULL_TIME', workMode: 'ONSITE', joinDate: '', engagementEndDate: '', roleName: '',
    username: '', password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const MANAGEMENT_ROLES = [
    { label: 'Super Admin', value: 'SUPER_ADMIN' },
    { label: 'HR Manager', value: 'HR_MANAGER' },
    { label: 'Finance Manager', value: 'FINANCE_MANAGER' },
    { label: 'Sales Manager', value: 'SALES_MANAGER' },
    { label: 'Inventory Manager', value: 'INVENTORY_MANAGER' },
  ];
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  // Remove Employee — asks for a real last working day rather than assuming
  // "today," since offboarding is often processed after the fact.
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

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

  // Add Employee — also provisions their ERP login. The API throws with a
  // specific message (e.g. "email is required") rather than failing silently,
  // so surface whatever it says instead of just giving up.
  async function handleAddEmployee() {
    if (!form.firstName || !form.lastName) return;
    if (!form.department.trim() || !form.designation.trim()) {
      setAddError('Department and designation are both required.');
      return;
    }
    if (accountKind === 'MANAGEMENT' && !form.roleName) {
      setAddError('Choose which management role this account should have.');
      return;
    }
    if (form.empType === 'INTERN' && !form.engagementEndDate) {
      setAddError('Internship end date is required for interns — it drives the Duration line on their offer letter.');
      return;
    }
    if (!form.username.trim()) {
      setAddError('Choose a username for this account.');
      return;
    }
    if (form.password.length < 8) {
      setAddError('Password must be at least 8 characters long.');
      return;
    }
    setAddError(null);
    setAdding(true);
    try {
      await hrmApi.createEmployee({
        ...form,
        username: form.username.trim(),
        roleName: accountKind === 'MANAGEMENT' ? form.roleName : undefined,
      });
      setShowAddModal(false);
      setAccountKind('EMPLOYEE');
      setForm({ firstName: '', lastName: '', personalEmail: '', contact: '', department: '', designation: '', empType: 'FULL_TIME', workMode: 'ONSITE', joinDate: '', engagementEndDate: '', roleName: '', username: '', password: '' });
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Could not add this employee.');
    } finally {
      setAdding(false);
    }
  }

  // Remove employee — moves them to Former Employees and revokes their ERP
  // login. Not a delete: their record, payroll and leave history stay intact.
  function handleRemove(id: string, name: string) {
    setActionMenuId(null);
    setRemoveError(null);
    setLastWorkingDay(new Date().toISOString().slice(0, 10));
    setRemoveTarget({ id, name });
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await hrmApi.removeEmployee(removeTarget.id, lastWorkingDay);
      setRemoveTarget(null);
      fetchAll();
    } catch (e: any) {
      setRemoveError(e.message || 'Could not remove this employee.');
    } finally {
      setRemoving(false);
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
          {canManageEmployees && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <UserPlus size={16} /> Add Employee
            </button>
          )}
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
                <tr
                  key={emp.id}
                  onClick={() => setDetailId(emp.id)}
                  style={{ cursor: 'pointer' }}
                  title="Open full record"
                >
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{page * pageSize + idx + 1}</td>
                  <td>
                    <div className="employee-cell">
                      {emp.avatarUrl ? (
                        <img
                          src={`${API_ORIGIN}${emp.avatarUrl}`}
                          alt=""
                          className="employee-avatar"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="employee-avatar" style={{ background: color }}>{initials}</div>
                      )}
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
                  <td style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    {canManageEmployees ? (
                      <>
                        <button onClick={() => setActionMenuId(actionMenuId === emp.id ? null : emp.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                          <MoreVertical size={16} />
                        </button>
                        {actionMenuId === emp.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 50,
                            background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '4px', minWidth: '120px',
                          }}>
                            <button onClick={() => { setActionMenuId(null); setDetailId(emp.id); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text)' }}>
                              <Edit size={14} /> Edit
                            </button>
                            {activeTab === 'ACTIVE' && (
                              <button onClick={() => handleRemove(emp.id, `${emp.firstName} ${emp.lastName}`)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                                <Trash2 size={14} /> Remove
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>View only</span>
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

      {/* ADD EMPLOYEE MODAL — this also provisions the ERP login, referencing
          the standard onboarding fields until the team lead's exact form
          arrives (see the "type" column below, already wired to empType). */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddError(null); setAccountKind('EMPLOYEE'); }} title="Add New Employee">
        {addError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            {addError}
          </div>
        )}

        {/* Account kind — stacked vertically, Management Account only offered
            to a Super Admin (also enforced server-side). Everything below
            this is the same shared form either way; only the role differs. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setAccountKind('MANAGEMENT')}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                border: accountKind === 'MANAGEMENT' ? '2px solid #2563eb' : '1px solid var(--color-border)',
                background: accountKind === 'MANAGEMENT' ? '#eff6ff' : 'var(--color-background)',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: accountKind === 'MANAGEMENT' ? '#2563eb' : 'var(--color-text)' }}>Management Account</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Grant one of the elevated system roles — Super Admin, HR, Finance, Sales, or Inventory Manager.
              </div>
            </button>
          )}
          <button
            type="button"
            onClick={() => setAccountKind('EMPLOYEE')}
            style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
              border: accountKind === 'EMPLOYEE' ? '2px solid #2563eb' : '1px solid var(--color-border)',
              background: accountKind === 'EMPLOYEE' ? '#eff6ff' : 'var(--color-background)',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: accountKind === 'EMPLOYEE' ? '#2563eb' : 'var(--color-text)' }}>Employee Account</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Standard access — every employee gets the same permissions here. (A person only ever gains
              Project Manager controls by being staffed as one on a specific project.)
            </div>
          </button>
        </div>

        {accountKind === 'MANAGEMENT' && (
          <FormField label="Management Role" type="select" value={form.roleName} onChange={(v) => setForm({ ...form, roleName: v })}
            required options={MANAGEMENT_ROLES} />
        )}

        <FormField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required placeholder="e.g. John" />
        <FormField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required placeholder="e.g. Smith" />
        <FormField label="Email" type="email" value={form.personalEmail} onChange={(v) => setForm({ ...form, personalEmail: v })} required placeholder="the address they applied from" />
        <FormField label="Contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="+91 98765 43210" />
        <FormField label="Date of Joining" type="date" value={form.joinDate} onChange={(v) => setForm({ ...form, joinDate: v })} />
        <FormField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} required placeholder="e.g. Engineering" />
        <FormField label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} required placeholder="e.g. Full Stack Developer" />
        <FormField label="Employment Type" type="select" value={form.empType} onChange={(v) => setForm({ ...form, empType: v })}
          options={[{ label: 'Full Time', value: 'FULL_TIME' }, { label: 'Part Time', value: 'PART_TIME' }, { label: 'Contract', value: 'CONTRACT' }, { label: 'Intern', value: 'INTERN' }]} />
        <FormField label="Work Mode" type="select" value={form.workMode} onChange={(v) => setForm({ ...form, workMode: v })}
          options={[{ label: 'Onsite', value: 'ONSITE' }, { label: 'Remote', value: 'REMOTE' }, { label: 'Hybrid', value: 'HYBRID' }]} />
        {form.empType === 'INTERN' && (
          <FormField label="Internship End Date" type="date" value={form.engagementEndDate} onChange={(v) => setForm({ ...form, engagementEndDate: v })} required />
        )}

        <div style={{ borderTop: '1px solid var(--color-border)', margin: '16px 0', paddingTop: '16px' }}>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            ERP login — set this person's username and password now; nothing is generated automatically.
          </p>
          <FormField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required placeholder="e.g. jane.doe" />
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
            Password <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters" autoComplete="new-password"
              style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', fontSize: '14px', color: 'var(--color-text)', outline: 'none' }}
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => { setShowAddModal(false); setAddError(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddEmployee} disabled={adding}>
            {adding ? 'Creating…' : 'Add Employee'}
          </button>
        </div>
      </Modal>

      {/* REMOVE EMPLOYEE — asks for a real last working day */}
      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title={`Remove ${removeTarget?.name ?? ''}`} width="440px">
        {removeError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            {removeError}
          </div>
        )}
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {removeTarget?.name} will move to Former Employees and immediately lose access to the ERP —
          any session they have open stops working on their very next request.
        </p>
        <FormField
          label="Last working day"
          type="date"
          value={lastWorkingDay}
          onChange={setLastWorkingDay}
          required
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setRemoveTarget(null)} disabled={removing}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmRemove} disabled={removing || !lastWorkingDay}
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}>
            {removing ? 'Removing…' : 'Remove employee'}
          </button>
        </div>
      </Modal>

      {/* EMPLOYEE DETAIL / EDIT */}
      <EmployeeDetailModal
        employeeId={detailId}
        onClose={() => setDetailId(null)}
        onSaved={fetchAll}
        departments={departments}
        designations={designations}
      />
    </div>
  );
}
