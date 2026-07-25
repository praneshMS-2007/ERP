'use client';

import {
  ShieldCheck,
  Users,
  Server,
  Activity,
  Key,
  Database,
  Lock,
  Plus,
  Settings,
  MoreVertical,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const users = [
    { name: 'Pranesh M S', email: 'pranesh@shuroq.com', role: 'Super Admin', status: 'Active', lastLog: '2 mins ago', mfa: true },
    { name: 'Sarah Jenkins', email: 'sarah.j@shuroq.com', role: 'HR Manager', status: 'Active', lastLog: '1 hour ago', mfa: true },
    { name: 'Marcus Thorne', email: 'm.thorne@shuroq.com', role: 'Project Admin', status: 'Locked', lastLog: '2 days ago', mfa: false },
    { name: 'Arthur Vance', email: 'a.vance@shuroq.com', role: 'Finance Admin', status: 'Active', lastLog: '5 hours ago', mfa: true },
    { name: 'Elena Choi', email: 'elena.c@shuroq.com', role: 'User', status: 'Pending', lastLog: 'Never', mfa: false },
  ];

  const auditLogs = [
    { action: 'Role Updated', user: 'Pranesh M S', target: 'Marcus Thorne', time: '10:42 AM', status: 'Success' },
    { action: 'Failed Login', user: 'Unknown IP', target: 'System', time: '09:15 AM', status: 'Blocked' },
    { action: 'Database Backup', user: 'System', target: 'DB-Prod-01', time: '02:00 AM', status: 'Success' },
    { action: 'API Key Generated', user: 'Sarah Jenkins', target: 'HR Integration', time: 'Yesterday', status: 'Success' },
  ];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>System Administration</h1>
          <p>Manage users, roles, security policies, and system configuration.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <Settings size={16} /> Global Settings
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Invite User
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active Users</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={20} /></div>
          </div>
          <div className="kpi-card-value">1,248</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>36 licenses remaining</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">System Health</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Activity size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: '#16a34a' }}>99.9%</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>All systems operational</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Security Alerts</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><ShieldCheck size={20} /></div>
          </div>
          <div className="kpi-card-value">3</div>
          <div className="kpi-card-trend down">Failed login attempts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Database Storage</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Database size={20} /></div>
          </div>
          <div className="kpi-card-value">64%</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>1.2TB / 2.0TB Used</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        
        {/* Left Column - User Directory */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>User Management</h3>
            <div className="search-bar" style={{ width: '250px', background: 'var(--color-background)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
              <input type="text" placeholder="Search users..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', width: '100%' }} />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>MFA</th>
                <th>Status</th>
                <th>Last Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{u.email}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px',
                      background: u.role === 'Super Admin' ? '#fef2f2' : 'var(--color-background)',
                      color: u.role === 'Super Admin' ? '#dc2626' : 'var(--color-text-primary)'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.mfa ? <Check size={16} style={{ color: '#16a34a' }} /> : <X size={16} style={{ color: '#dc2626' }} />}
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'Active' ? 'badge-active' : u.status === 'Locked' ? 'badge-critical' : 'badge-warning'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{u.lastLog}</td>
                  <td>
                    <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column - Audit & System */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Audit Logs */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Security Audit Log</h3>
              <Link href="#" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View Full</Link>
            </div>
            
            <div className="timeline">
              {auditLogs.map((log, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-dot" style={{ background: log.status === 'Success' ? '#16a34a' : '#dc2626' }} />
                  <div className="timeline-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{log.action}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{log.time}</span>
                  </div>
                  <div className="timeline-desc">By: {log.user}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Target: {log.target}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Config Links */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Configuration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Role Permissions Matrix', icon: Key },
                { label: 'SSO & Identity Providers', icon: Lock },
                { label: 'Infrastructure Status', icon: Server },
                { label: 'Email Server Settings', icon: AlertCircle },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                    background: 'var(--color-background)', border: '1px solid var(--color-border-light)', 
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s'
                  }} className="hover:border-blue-500 hover:shadow-sm">
                    <Icon size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
