'use client';

import {
  Building2,
  FolderKanban,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  FolderPlus,
  UserCheck,
  PackagePlus,
  ShoppingCart,
  CheckSquare,
  Users,
  PackageX,
  Headphones,
} from 'lucide-react';
import { BarChart } from '@/components/dashboard/Charts';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p>Real-time oversight of global operations and key performance metrics.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Report
          </button>
          <button className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + New Entry
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {/* Total Employees */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div>
              <div className="kpi-card-label">Total Employees</div>
            </div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="kpi-card-value">1,284</div>
          <div className="kpi-card-trend up">
            <TrendingUp size={14} /> +12%
          </div>
        </div>

        {/* Active Projects */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div>
              <div className="kpi-card-label">Active Projects</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>48 Active</div>
            </div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <FolderKanban size={20} />
            </div>
          </div>
          <div className="kpi-card-value">156</div>
        </div>

        {/* Revenue */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div>
              <div className="kpi-card-label">Revenue</div>
            </div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-card-value">$4.2M</div>
          <div className="kpi-card-trend up">
            <TrendingUp size={14} /> +8.4%
          </div>
        </div>

        {/* Inventory Status */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div>
              <div className="kpi-card-label">Inventory Status</div>
            </div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-card-value">92%</div>
          <div className="kpi-card-trend down">
            <AlertTriangle size={14} /> Low Stock
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Revenue Trend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Revenue Trend</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--color-background)', padding: '4px 10px', borderRadius: '6px' }}>Last 6 Months</span>
          </div>
          <div className="chart-wrap" style={{ height: '240px' }}>
            <BarChart
              labels={['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN']}
              datasets={[{ label: 'Revenue ($)', data: [320000, 480000, 460000, 680000, 580000, 540000] }]}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link href="/hrm" className="quick-action-btn">
              <UserPlus className="qa-icon" />
              <span className="qa-label">Add Employee</span>
            </Link>
            <Link href="/projects" className="quick-action-btn">
              <FolderPlus className="qa-icon" />
              <span className="qa-label">Create Project</span>
            </Link>
            <Link href="/crm" className="quick-action-btn">
              <UserCheck className="qa-icon" />
              <span className="qa-label">Add Customer</span>
            </Link>
            <Link href="/inventory" className="quick-action-btn">
              <PackagePlus className="qa-icon" />
              <span className="qa-label">Add Product</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* Employee Performance */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Employee Performance</h3>
          {[
            { dept: 'ENGINEERING', pct: 94, color: '#1d4ed8' },
            { dept: 'MARKETING', pct: 82, color: '#6b7280' },
            { dept: 'SALES', pct: 88, color: '#ea580c' },
          ].map((d) => (
            <div key={d.dept} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                <span>{d.dept}</span>
                <span>{d.pct}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Inventory Overview (Doughnut placeholder) */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Inventory Overview</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" strokeWidth="8" strokeDasharray="150 251" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#9ca3af" strokeWidth="8" strokeDasharray="60 251" strokeDashoffset="-150" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#d1d5db" strokeWidth="8" strokeDasharray="41 251" strokeDashoffset="-210" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>1.2k</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Units</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Electronics', color: '#2563eb' },
                { label: 'Raw Material', color: '#9ca3af' },
                { label: 'Fulfillment', color: '#d1d5db' },
              ].map((cat) => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                  {cat.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Activity</h3>
            <Link href="#" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
          </div>
          <div className="activity-feed">
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ShoppingCart size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-title">New Sales Order #SO-9234</div>
                <div className="activity-desc">Acme Corp purchased 50x Industrial Sensors.</div>
                <div className="activity-time">2 minutes ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <CheckSquare size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Project Milestone Reached</div>
                <div className="activity-desc">Solar Grid phase 2 completed successfully by Engineering team.</div>
                <div className="activity-time">45 minutes ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <Users size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-title">New Employee Onboarded</div>
                <div className="activity-desc">David Miller joined as Senior Systems Architect.</div>
                <div className="activity-time">2 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <PackageX size={18} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Inventory Alert</div>
                <div className="activity-desc">Micro-processors SKU-92 below threshold levels.</div>
                <div className="activity-time">5 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat FAB */}
      <button className="ai-fab" aria-label="AI Assistant">
        <Headphones size={24} />
      </button>
    </div>
  );
}
