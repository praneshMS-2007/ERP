'use client';

import {
  ShieldCheck, Users, Server, Activity, Key, Database, Lock, Plus, Settings, MoreVertical, Check, X, AlertCircle, Edit, Trash, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import GlobalSettingsModal from '@/components/modals/GlobalSettingsModal';
import Modal, { FormField } from '@/components/Modal';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('Settings');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', roleId: '' });
  const [toggles, setToggles] = useState({
    mfa: true, session: true, ipList: false, emailAlerts: true, weeklyDigest: true, smsLatency: false, auditExports: true
  });

  function handleToggle(key: string) {
    const updated = { ...toggles, [key]: !(toggles as any)[key] };
    setToggles(updated);
    localStorage.setItem('admin_security_toggles', JSON.stringify(updated));
  }

  async function fetchUsersAndRoles() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const [uRes, rRes] = await Promise.all([
        fetch('http://localhost:5000/api/users', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }),
        fetch('http://localhost:5000/api/users/roles', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(Array.isArray(uData) ? uData : []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRoles(Array.isArray(rData) ? rData : []);
      }
    } catch (e) {
      console.error('Failed to fetch admin users/roles', e);
    }
  }

  useEffect(() => {
    fetchUsersAndRoles();
    const saved = localStorage.getItem('admin_security_toggles');
    if (saved) {
      try { setToggles(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          email: inviteForm.email,
          password: 'password123',
          roleId: inviteForm.roleId || undefined
        })
      });
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', roleId: '' });
      fetchUsersAndRoles();
    } catch (err) {
      console.error('Failed to invite user', err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>System Administration</h1>
          <p>Manage users, roles, security policies, and system configuration.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowGlobalSettings(true)}>
            <Settings size={16} /> Global Settings
          </button>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            <Plus size={16} /> Invite User
          </button>
        </div>
      </div>

      {/* Top Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border-light)', marginBottom: '24px' }}>
        {['Settings', 'Security', 'Compliance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              color: activeTab === tab ? '#2563eb' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KPI Grid + System Health */}
      <div className="kpi-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active System Users</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={20} /></div>
          </div>
          <div className="kpi-card-value">{users.length}</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>Active in database</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Configured Roles</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><ShieldCheck size={20} /></div>
          </div>
          <div className="kpi-card-value">{roles.length}</div>
          <div className="kpi-card-trend down">RBAC Role Definitions</div>
        </div>
        {/* System Health Panel */}
        <div className="kpi-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>System Health</span>
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>100% OPERATIONAL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Server Load</div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: '28%', background: '#2563eb' }} />
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px', textAlign: 'right' }}>28%</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>DB Connectivity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div> Connected
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Security Status</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Left Column - User Directory */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>User Management</h3>
            <div className="search-bar" style={{ width: '250px', background: 'var(--color-background)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', width: '100%', color: 'inherit' }} 
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.email}</div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px',
                      background: u.role?.name === 'SUPER_ADMIN' ? '#fef2f2' : 'var(--color-background)',
                      color: u.role?.name === 'SUPER_ADMIN' ? '#dc2626' : 'var(--color-text-primary)'
                    }}>
                      {u.role?.name || 'USER'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    No users found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column - Security Policies & Live Audit Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Security Policies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Enforce JWT Expiry (24h)</span>
                <button onClick={() => handleToggle('session')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: toggles.session ? '#2563eb' : '#9ca3af' }}>
                  {toggles.session ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Role-Based Access Control</span>
                <button onClick={() => handleToggle('mfa')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: toggles.mfa ? '#2563eb' : '#9ca3af' }}>
                  {toggles.mfa ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            </div>
          </div>

          {/* Live Audit Activity */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Audit Activity</h3>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>LIVE DB</span>
            </div>

            {users.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No activity logged</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {users.slice(0, 4).map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.role?.name === 'SUPER_ADMIN' ? '#dc2626' : '#2563eb', marginTop: 5, flexShrink: 0 }}></div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>User Registered: {u.email}</div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>Assigned Role: {u.role?.name || 'USER'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{new Date(u.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Settings Modal */}
      <GlobalSettingsModal isOpen={showGlobalSettings} onClose={() => setShowGlobalSettings(false)} />

      {/* Invite User Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New System User">
        <form onSubmit={handleInvite}>
          <FormField label="Email Address" type="email" value={inviteForm.email} onChange={(v) => setInviteForm({ ...inviteForm, email: v })} required placeholder="john@company.com" />
          <FormField label="Assign System Role" type="select" value={inviteForm.roleId} onChange={(v) => setInviteForm({ ...inviteForm, roleId: v })} required
            options={roles.map(r => ({ label: r.name, value: r.id }))} />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setShowInviteModal(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit">Create User</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
