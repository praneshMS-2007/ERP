'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, CheckCircle2, User, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { hrmApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal, { FormField } from '../../components/Modal';

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'VACATION', startDate: '', endDate: '', reason: '' });

  async function fetchData() {
    try {
      const [attData, leaveData, empData] = await Promise.all([
        hrmApi.getAttendance(),
        hrmApi.getLeaves(),
        hrmApi.getEmployees()
      ]);
      if (attData && Array.isArray(attData)) setAttendances(attData);
      if (leaveData && Array.isArray(leaveData)) setLeaves(leaveData);
      if (empData && Array.isArray(empData)) setEmployees(empData);
    } catch (e) {
      console.error('Portal fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleClockIn() {
    const currentEmp = employees.length > 0 ? employees[0] : null;
    if (currentEmp) {
      await hrmApi.markAttendance({
        employeeId: currentEmp.id,
        date: new Date().toISOString(),
        status: 'PRESENT',
        checkIn: new Date().toISOString(),
      });
      setClockedIn(true);
      fetchData();
    }
  }

  async function handleRequestLeave() {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) return;
    await hrmApi.requestLeave({
      employeeId: leaveForm.employeeId,
      type: leaveForm.type,
      startDate: new Date(leaveForm.startDate).toISOString(),
      endDate: new Date(leaveForm.endDate).toISOString(),
      reason: leaveForm.reason,
    });
    setShowLeaveModal(false);
    setLeaveForm({ employeeId: '', type: 'VACATION', startDate: '', endDate: '', reason: '' });
    fetchData();
  }

  const userEmail = user?.email || 'pranesh@shuroq.com';
  const userName = userEmail.split('@')[0].toUpperCase();

  return (
    <div className="fade-in">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', padding: '32px', borderRadius: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'white', fontSize: '24px', marginBottom: '8px' }}>Welcome back, {userName}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Role: {typeof user?.role === 'object' ? (user?.role as any)?.name : (user?.role || 'SUPER_ADMIN')} • Self-Service Portal</p>
        </div>
        <div className="page-header-actions">
          <button className="btn" onClick={handleClockIn} disabled={clockedIn} style={{ background: clockedIn ? '#10b981' : 'white', color: clockedIn ? 'white' : '#1e3a8a', border: 'none' }}>
            <Clock size={16} /> {clockedIn ? 'Clocked In' : 'Clock In Now'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setShowLeaveModal(true)} className="btn btn-secondary" style={{ justifyContent: 'center', height: '80px', flexDirection: 'column', gap: '8px' }}>
                <Calendar size={20} color="#2563eb" />
                <span>Request Leave</span>
              </button>
              <Link href="/hrm/payroll" className="btn btn-secondary" style={{ justifyContent: 'center', height: '80px', flexDirection: 'column', gap: '8px', textDecoration: 'none' }}>
                <FileText size={20} color="#16a34a" />
                <span>Payslips</span>
              </Link>
              <Link href="/projects/timesheets" className="btn btn-secondary" style={{ justifyContent: 'center', height: '80px', flexDirection: 'column', gap: '8px', textDecoration: 'none' }}>
                <Clock size={20} color="#d97706" />
                <span>Timesheet</span>
              </Link>
              <Link href="/hrm" className="btn btn-secondary" style={{ justifyContent: 'center', height: '80px', flexDirection: 'column', gap: '8px', textDecoration: 'none' }}>
                <User size={20} color="#9333ea" />
                <span>My Directory</span>
              </Link>
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Leave Requests ({leaves.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaves.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>No leave requests submitted</div>
              ) : leaves.slice(0, 4).map((l, i) => (
                <div key={l.id || i} style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>{l.type}</span>
                    <span className={l.status === 'APPROVED' ? 'badge badge-healthy' : 'badge badge-warning'}>{l.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Recent Attendance */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Attendance Logs</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>No attendance records found</td></tr>
                ) : attendances.slice(0, 6).map((record, i) => (
                  <tr key={record.id || i}>
                    <td style={{ fontWeight: 600 }}>{record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Employee'}</td>
                    <td>{new Date(record.date || record.createdAt).toLocaleDateString()}</td>
                    <td><span className={`badge ${record.status === 'PRESENT' ? 'badge-healthy' : 'badge-warning'}`}>{record.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Company Announcements */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Company Announcements</h3>
            <div style={{ padding: '16px', background: '#f3f4f6', borderRadius: '8px', borderLeft: '4px solid #2563eb', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>System Upgrade Completed</div>
              <div style={{ fontSize: '12px', color: '#4b5563' }}>All ERP modules have been upgraded with live database integration and RBAC security.</div>
            </div>
          </div>

        </div>
      </div>

      {/* REQUEST LEAVE MODAL */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Submit Leave Request">
        <FormField label="Select Employee Profile" type="select" value={leaveForm.employeeId} onChange={(v) => setLeaveForm({ ...leaveForm, employeeId: v })} required
          options={employees.map(e => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))} />
        <FormField label="Leave Type" type="select" value={leaveForm.type} onChange={(v) => setLeaveForm({ ...leaveForm, type: v })}
          options={[
            { label: 'Vacation', value: 'VACATION' },
            { label: 'Sick Leave', value: 'SICK' },
            { label: 'Personal', value: 'PERSONAL' },
            { label: 'Maternity/Paternity', value: 'PARENTAL' },
          ]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Start Date" type="date" value={leaveForm.startDate} onChange={(v) => setLeaveForm({ ...leaveForm, startDate: v })} required />
          <FormField label="End Date" type="date" value={leaveForm.endDate} onChange={(v) => setLeaveForm({ ...leaveForm, endDate: v })} required />
        </div>
        <FormField label="Reason / Notes" type="textarea" value={leaveForm.reason} onChange={(v) => setLeaveForm({ ...leaveForm, reason: v })} placeholder="Reason for leave..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRequestLeave}>Submit Request</button>
        </div>
      </Modal>
    </div>
  );
}
