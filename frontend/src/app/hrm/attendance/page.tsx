'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, Calendar,
} from 'lucide-react';
import { hrmApi, exportApi } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';

export default function AttendancePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date());

  async function fetchData() {
    try {
      setLoading(true);
      const [empData, attData] = await Promise.all([
        hrmApi.getEmployees(),
        hrmApi.getAttendance(),
      ]);
      setEmployees(Array.isArray(empData) ? empData.filter((e: any) => e.status !== 'INACTIVE') : []);
      setAttendance(Array.isArray(attData) ? attData : []);
    } catch (e) {
      console.error('Failed to fetch attendance data:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Get attendance for the selected date
  function getAttendanceForEmployee(empId: string) {
    return attendance.find((a: any) => {
      const aDate = new Date(a.date);
      return a.employeeId === empId &&
        aDate.getFullYear() === selectedDate.getFullYear() &&
        aDate.getMonth() === selectedDate.getMonth() &&
        aDate.getDate() === selectedDate.getDate();
    });
  }

  // Mark attendance
  async function handleMarkAttendance(empId: string, status: string) {
    try {
      const dateStr = selectedDate.toISOString();
      await hrmApi.markAttendance({
        employeeId: empId,
        date: dateStr,
        status,
        checkIn: status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY' ? new Date().toISOString() : null,
      });
      fetchData();
    } catch (e) {
      console.error('Failed to mark attendance:', e);
    }
  }

  // Navigate date
  function changeDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  }

  const dateStr = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Stats
  const presentCount = employees.filter(e => {
    const att = getAttendanceForEmployee(e.id);
    return att && ['PRESENT', 'HALF_DAY', 'LATE'].includes(att.status);
  }).length;
  const absentCount = employees.length - presentCount;

  // Status badge colors
  function statusBadge(status: string | undefined) {
    if (!status) return { bg: '#f3f4f6', color: '#6b7280', label: 'Not Marked', icon: AlertCircle };
    const map: Record<string, { bg: string; color: string; label: string; icon: any }> = {
      PRESENT: { bg: '#dcfce7', color: '#16a34a', label: 'Present', icon: CheckCircle },
      ABSENT: { bg: '#fee2e2', color: '#dc2626', label: 'Absent', icon: XCircle },
      HALF_DAY: { bg: '#fef3c7', color: '#d97706', label: 'Half Day', icon: Clock },
      LATE: { bg: '#fff7ed', color: '#ea580c', label: 'Late', icon: AlertCircle },
    };
    return map[status] || { bg: '#f3f4f6', color: '#6b7280', label: status, icon: AlertCircle };
  }

  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#ec4899', '#14b8a6'];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Attendance Management</h1>
          <p>Track and manage employee attendance records.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportAttendance(format, selectedDate.getMonth() + 1, selectedDate.getFullYear())} label="Export" />
        </div>
      </div>

      {/* Date Navigator + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', marginBottom: '20px' }}>
        {/* Date Navigator */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => changeDate(-1)} className="btn btn-secondary btn-sm"><ChevronLeft size={16} /></button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{dateStr}</div>
            {isToday && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>TODAY</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isToday && (
              <button onClick={() => setSelectedDate(new Date())} className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }}>
                <Calendar size={14} style={{ marginRight: '4px' }} /> Today
              </button>
            )}
            <button onClick={() => changeDate(1)} className="btn btn-secondary btn-sm"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px 32px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb' }}>{presentCount}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Present</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px 32px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626' }}>{absentCount}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Absent</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px 32px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)' }}>{employees.length}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Employee Attendance Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', width: '40px' }}>S.No</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Employee</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Department</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Check In</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Check Out</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Status</th>
              <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
            ) : employees.map((emp, idx) => {
              const att = getAttendanceForEmployee(emp.id);
              const badge = statusBadge(att?.status);
              const StatusIcon = badge.icon;
              const color = colors[(emp.firstName.length + emp.lastName.length) % colors.length];
              const initials = `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase();

              return (
                <tr key={emp.id}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{idx + 1}</td>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar" style={{ background: color }}>{initials}</div>
                      <div>
                        <div className="employee-name">{emp.firstName} {emp.lastName}</div>
                        <div className="employee-id">ID: {emp.empCode || emp.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.department?.name || '-'}</td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {att?.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {att?.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: badge.bg, color: badge.color,
                    }}>
                      <StatusIcon size={13} /> {badge.label}
                    </span>
                  </td>
                  <td>
                    {!att ? (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleMarkAttendance(emp.id, 'PRESENT')} style={{ border: 'none', background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Present</button>
                        <button onClick={() => handleMarkAttendance(emp.id, 'ABSENT')} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Absent</button>
                        <button onClick={() => handleMarkAttendance(emp.id, 'HALF_DAY')} style={{ border: 'none', background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Half Day</button>
                        <button onClick={() => handleMarkAttendance(emp.id, 'LATE')} style={{ border: 'none', background: '#fff7ed', color: '#ea580c', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Late</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Marked</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
