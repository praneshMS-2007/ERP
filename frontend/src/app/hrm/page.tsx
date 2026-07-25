'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  UserX,
  Star,
  TrendingUp,
  Download,
  UserPlus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import { hrmApi } from '../../services/api';

export default function HRManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    onLeave: 0,
    openPositions: 15, // Mock value since we don't have recruitment data
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [empData] = await Promise.all([
          hrmApi.getEmployees(),
        ]);

        let onLeave = 0;

        const formattedEmployees = empData.map((e: any) => {
          let status = 'ACTIVE';
          
          if (e.status === 'INACTIVE') {
            status = 'PROBATION';
          }
          
          // Generate a color based on department or name length for variety
          const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#ec4899', '#14b8a6'];
          const color = colors[(e.firstName.length + e.lastName.length) % colors.length];

          return {
            initials: `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`.toUpperCase(),
            name: `${e.firstName} ${e.lastName}`,
            id: `ERP-${e.id.substring(0, 4)}`,
            dept: e.department?.name || 'Unassigned',
            position: e.position,
            status,
            color,
          };
        });

        // Add some mock data to show leaves because there's no leave logic built out
        if (formattedEmployees.length > 1) {
          formattedEmployees[1].status = 'ON LEAVE';
          onLeave++;
        }

        setStats({
          total: empData.length,
          onLeave,
          openPositions: 15,
        });

        setEmployees(formattedEmployees);
      } catch (e) {
        console.error('Failed to fetch HRM data:', e);
      }
    }
    fetchData();
  }, []);

  const badgeClass = (s: string) => {
    if (s === 'ACTIVE') return 'badge badge-active';
    if (s === 'ON LEAVE') return 'badge badge-on-leave';
    if (s === 'PROBATION') return 'badge badge-probation';
    return 'badge';
  };

  const attendanceCalendar = [
    { day: 28, type: 'inactive' }, { day: 29, type: 'inactive' }, { day: 30, type: 'inactive' },
    { day: 1, type: 'present' }, { day: 2, type: 'today' }, { day: 3, type: 'present' }, { day: 4, type: '' },
    { day: 5, type: '' }, { day: 6, type: 'present' }, { day: 7, type: 'holiday' }, { day: 8, type: 'present' },
    { day: 9, type: 'present' }, { day: 10, type: 'present' }, { day: 11, type: '' },
  ];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Employee Management</h1>
          <p>Monitor workforce performance, attendance, and organizational growth.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary">
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Workforce</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.total}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> Tracking organization</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active Leave</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CalendarCheck size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.onLeave}</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>8 pending approval</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Open Positions</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><UserX size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.openPositions}</div>
          <div className="kpi-card-trend down"><span>3 high priority</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Avg Performance</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Star size={20} /></div>
          </div>
          <div className="kpi-card-value">4.8</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>☆ Excellent rating</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Employee Directory */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Employee Directory</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm">Filters</button>
              <button className="btn btn-secondary btn-sm">Sort</button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading or no data...</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar" style={{ background: emp.color }}>{emp.initials}</div>
                      <div>
                        <div className="employee-name">{emp.name}</div>
                        <div className="employee-id">ID: {emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{emp.dept}</td>
                  <td>{emp.position}</td>
                  <td><span className={badgeClass(emp.status)}>{emp.status}</span></td>
                  <td><button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><MoreVertical size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <span>Showing {Math.min(4, employees.length)} of {employees.length} employees</span>
            <div className="pagination-buttons">
              <button className="pagination-btn"><ChevronLeft size={14} /></button>
              <button className="pagination-btn"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Attendance Calendar */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Attendance</h3>
              <span className="badge badge-in-progress">MAY 2024</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '12px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', padding: '6px 0' }}>{d}</div>
              ))}
              {attendanceCalendar.map((d, i) => (
                <div key={i} style={{
                  padding: '6px 0',
                  fontSize: '13px',
                  fontWeight: d.type === 'today' ? 700 : 500,
                  color: d.type === 'inactive' ? '#d1d5db' : d.type === 'today' ? 'white' : d.type === 'holiday' ? '#dc2626' : '#111827',
                  background: d.type === 'today' ? '#2563eb' : d.type === 'present' ? '#eff6ff' : 'transparent',
                  borderRadius: '6px',
                }}>
                  {d.day}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Present</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>94.2%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Absent</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>5.8%</div>
              </div>
            </div>
          </div>

          {/* Leave Requests */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Leave Requests</h3>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><ExternalLink size={16} /></button>
            </div>

            {/* Leave 1 */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px' }}>Liam Peterson</span>
                <span className="badge badge-sick-leave">SICK LEAVE</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>&ldquo;Medical recovery from flu symptoms...&rdquo;</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>May 24 - May 26</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={18} /></button>
                  <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a' }}><Check size={18} /></button>
                </div>
              </div>
            </div>

            {/* Leave 2 */}
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px' }}>Sarah Jenkins</span>
                <span className="badge badge-vacation">VACATION</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>&ldquo;Family trip to coastal region...&rdquo;</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Jun 10 - Jun 17</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={18} /></button>
                  <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a' }}><Check size={18} /></button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                View All Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
