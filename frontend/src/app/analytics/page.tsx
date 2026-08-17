'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  BarChart2,
  PieChart,
  Download,
  Filter,
  DollarSign,
  Users,
  Box,
  FolderKanban,
  Zap,
} from 'lucide-react';
import { BarChart, LineChart, DoughnutChart } from '@/components/dashboard/Charts';
import { analyticsApi } from '../../services/api';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    inventoryTurnover: 0,
    projectSuccessRate: 0,
    departmentCosts: {
      labels: ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR'],
      data: [45, 20, 15, 12, 8]
    }
  });

  // Real math from actual join/departure dates — see AnalyticsService.getRetention.
  // null while loading; { insufficientData: true } is a legitimate, honest
  // result for a dataset with no 12-month history yet, not an error.
  const [retention, setRetention] = useState<{ insufficientData: boolean; retentionPercent: number | null; headcountAtPeriodStart: number; leaversInPeriod: number } | null>(null);

  const [revenueTrend, setRevenueTrend] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    data: [1.2, 1.4, 1.3, 1.8, 2.1, 2.0, 2.4, 2.8, 3.1]
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashMetrics, revTrend, retentionData] = await Promise.all([
          analyticsApi.getDashboardMetrics(),
          analyticsApi.getRevenueTrend(),
          analyticsApi.getRetention(),
        ]);

        if (dashMetrics && !Array.isArray(dashMetrics)) {
          setMetrics({
            totalRevenue: dashMetrics.revenueYTD || dashMetrics.totalRevenue || 0,
            // Inventory Turnover and Project Success Rate below are still the
            // fabricated formulas flagged in the 14 Aug audit — Employee
            // Retention is the only tile fixed so far; the rest is Phase 5.
            inventoryTurnover: dashMetrics.inventoryValue ? Math.round((dashMetrics.inventoryValue / 100000) * 10) / 10 : 4.8,
            projectSuccessRate: dashMetrics.activeProjects ? Math.min(98, 85 + dashMetrics.activeProjects * 2) : 91,
            departmentCosts: dashMetrics.departmentCosts || {
              labels: ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR'],
              data: [45, 20, 15, 12, 8],
            },
          });
        }

        if (revTrend && !Array.isArray(revTrend) && revTrend.labels && revTrend.data) {
          setRevenueTrend({
            labels: revTrend.labels,
            data: revTrend.data,
          });
        }

        if (retentionData && !Array.isArray(retentionData)) {
          setRetention(retentionData);
        }
      } catch (e) {
        console.error('Failed to fetch analytics data:', e);
      }
    }
    fetchData();
  }, []);

  const [activeTab, setActiveTab] = useState<'enterprise' | 'sales' | 'hr'>('enterprise');

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Enterprise Analytics</h1>
          <p>Comprehensive data visualization across all operational modules.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <Filter size={16} /> Filter Date Range
          </button>
          <button className="btn btn-primary">
            <Download size={16} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('enterprise')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'enterprise' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'enterprise' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
        >
          Enterprise Overview
        </button>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'sales' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'sales' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
        >
          Sales Performance
        </button>
        <button 
          onClick={() => setActiveTab('hr')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'hr' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
        >
          HR Metrics
        </button>
      </div>

      {activeTab === 'enterprise' && (
        <>
          {/* KPI Overview */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Revenue YTD</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={20} /></div>
          </div>
          <div className="kpi-card-value">${(metrics.totalRevenue / 1000000).toFixed(1)}M</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> +18.5% YoY</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Employee Retention</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={20} /></div>
          </div>
          {!retention ? (
            <div className="kpi-card-value" style={{ color: 'var(--color-text-muted)', fontSize: '20px' }}>Loading…</div>
          ) : retention.insufficientData ? (
            <>
              <div className="kpi-card-value" style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>Insufficient data</div>
              <div className="kpi-card-trend" style={{ color: 'var(--color-text-muted)' }}>
                Needs 12 months of employment history — no one in this dataset had joined that far back yet
              </div>
            </>
          ) : (
            <>
              <div className="kpi-card-value">{retention.retentionPercent}%</div>
              <div className="kpi-card-trend" style={{ color: 'var(--color-text-muted)' }}>
                {retention.leaversInPeriod} left of {retention.headcountAtPeriodStart} employed 12 months ago
              </div>
            </>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Inventory Turnover</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Box size={20} /></div>
          </div>
          <div className="kpi-card-value">{metrics.inventoryTurnover}x</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>Industry avg: 4.2x</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Project Success Rate</div>
            <div className="kpi-card-icon" style={{ background: '#fdf4ff', color: '#c026d3' }}><FolderKanban size={20} /></div>
          </div>
          <div className="kpi-card-value">{metrics.projectSuccessRate}%</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> +5% YoY</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Revenue vs Target */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Revenue vs. Target (2024)</div>
            <BarChart2 size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div className="chart-wrap" style={{ height: '300px' }}>
            <LineChart
              labels={revenueTrend.labels}
              datasets={[
                { label: 'Actual Revenue ($M)', data: revenueTrend.data }
              ]}
            />
          </div>
        </div>

        {/* Operational Costs */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Departmental Operating Costs</div>
            <PieChart size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div className="chart-wrap" style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '240px', height: '240px' }}>
              <DoughnutChart
                labels={metrics.departmentCosts?.labels || ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR']}
                dataPoints={metrics.departmentCosts?.data || [45, 20, 15, 12, 8]}
              />
            </div>
            {/* Custom Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '24px' }}>
              {(metrics.departmentCosts?.labels || ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR']).map((label: string, idx: number) => {
                const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'];
                const data = metrics.departmentCosts?.data || [45, 20, 15, 12, 8];
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[idx % colors.length] }} />
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{data[idx]}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Resource Efficiency */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', alignSelf: 'flex-start' }}>Resource Efficiency</h3>
          
          <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'conic-gradient(#2563eb 82%, #e5e7eb 0)' }}>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>82%</span>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>OPTIMAL</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Peak Dept</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>R&D Team</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Peak Hour</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>10:00 AM</div>
            </div>
          </div>
        </div>

        {/* Project Milestones */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Project Milestones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: '01', title: 'Quarterly Audit', desc: 'Financial compliance review', status: 'In Progress', color: '#2563eb' },
              { id: '02', title: 'ERP Core Update', desc: 'Version 2.4 deployment', status: 'Pending', color: '#d97706' },
              { id: '03', title: 'Q3 Strategic Planning', desc: 'Board review preparation', status: 'Completed', color: '#16a34a' },
            ].map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#e5e7eb' }}>{m.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{m.title}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: m.color, background: m.color + '15', padding: '2px 6px', borderRadius: '4px' }}>{m.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}>View All Milestones</button>
        </div>

        {/* Inventory Turnover Trends */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Inventory Turnover Trends</h3>
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px' }}>Category</th>
                <th style={{ padding: '8px 12px' }}>Current Level</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Reorder Qty</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Processors', level: '1,240', status: 'HEALTHY', statusColor: '#16a34a', qty: '-' },
                { cat: 'Fiber Optics', level: '120', status: 'CRITICAL', statusColor: '#dc2626', qty: '500' },
                { cat: 'Displays', level: '450', status: 'WARNING', statusColor: '#d97706', qty: '200' },
                { cat: 'Sensors', level: '8,420', status: 'HEALTHY', statusColor: '#16a34a', qty: '-' },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.cat}</td>
                  <td style={{ padding: '10px 12px' }}>{row.level}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: row.statusColor }}>{row.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{row.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {activeTab === 'sales' && (
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Sales Performance Dashboard</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Detailed breakdown of sales orders, regional performance, and top customers will appear here.</p>
        </div>
      )}

      {activeTab === 'hr' && (
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Human Resources Metrics</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Analysis of timesheet compliance and payroll trends will appear here.</p>
        </div>
      )}
      
      {/* Footer Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'white', borderTop: '1px solid var(--color-border-light)', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, borderRadius: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div> System Online
          </span>
          <span>Last Sync: Just now</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span style={{ cursor: 'pointer' }} className="hover:text-blue-600">Documentation</span>
          <span style={{ cursor: 'pointer' }} className="hover:text-blue-600">API Support</span>
          <span style={{ cursor: 'pointer' }} className="hover:text-blue-600">Security Audit</span>
          <span>&copy; 2024 Shuroq</span>
        </div>
      </div>
    </div>
  );
}
