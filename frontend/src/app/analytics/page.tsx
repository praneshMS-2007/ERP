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
    employeeRetention: 0,
    inventoryTurnover: 0,
    projectSuccessRate: 0,
    departmentCosts: {
      labels: ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR'],
      data: [45, 20, 15, 12, 8]
    }
  });

  const [revenueTrend, setRevenueTrend] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    data: [1.2, 1.4, 1.3, 1.8, 2.1, 2.0, 2.4, 2.8, 3.1]
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashMetrics, revTrend] = await Promise.all([
          analyticsApi.getDashboardMetrics(),
          analyticsApi.getRevenueTrend(),
        ]);

        if (dashMetrics) {
          // Add default fallback objects if metrics are empty arrays
          const m = Array.isArray(dashMetrics) && dashMetrics.length === 0 ? 
            { totalRevenue: 12400000, employeeRetention: 94.2, inventoryTurnover: 4.8, projectSuccessRate: 91, departmentCosts: { labels: ['Engineering', 'Marketing', 'Sales', 'Operations', 'HR'], data: [45, 20, 15, 12, 8] } } 
            : dashMetrics;
            
          setMetrics(m as any);
        }
        
        if (revTrend && !Array.isArray(revTrend)) {
           setRevenueTrend(revTrend as any);
        }
      } catch (e) {
        console.error('Failed to fetch analytics data:', e);
      }
    }
    fetchData();
  }, []);

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
          <div className="kpi-card-value">{metrics.employeeRetention}%</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> +2.1% from Q2</div>
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
                labels={metrics.departmentCosts.labels}
                dataPoints={metrics.departmentCosts.data}
              />
            </div>
            {/* Custom Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '24px' }}>
              {metrics.departmentCosts.labels.map((label: string, idx: number) => {
                const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'];
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[idx % colors.length] }} />
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{metrics.departmentCosts.data[idx]}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Resource Allocation */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Resource Allocation Matrix</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Product Development', pct: 40, color: '#2563eb' },
              { label: 'Client Delivery', pct: 35, color: '#16a34a' },
              { label: 'Internal Operations', pct: 15, color: '#f59e0b' },
              { label: 'R&D / Innovation', pct: 10, color: '#8b5cf6' },
            ].map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{r.label}</span>
                  <span>{r.pct}%</span>
                </div>
                <div className="progress-bar-track" style={{ height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Traffic / Usage */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>System Usage by Region</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'North America', value: '14,204', trend: '+12%' },
              { label: 'Europe (EMEA)', value: '8,401', trend: '+4%' },
              { label: 'Asia Pacific (APAC)', value: '5,920', trend: '+28%' },
              { label: 'Latin America', value: '1,204', trend: '-2%' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: i < 3 ? '1px solid var(--color-border-light)' : 'none' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{r.value}</div>
                  <div style={{ fontSize: '11px', color: r.trend.startsWith('+') ? '#16a34a' : '#dc2626' }}>{r.trend}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={20} style={{ color: '#fbbf24' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>AI Insights</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#bfdbfe' }}>Revenue Alert</div>
              <div style={{ fontSize: '13px', lineHeight: 1.4 }}>Projected Q4 revenue is <strong>12% above</strong> target based on current pipeline acceleration.</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', color: '#bfdbfe' }}>Inventory Warning</div>
              <div style={{ fontSize: '13px', lineHeight: 1.4 }}>Fiber Optic stock depletion rate has doubled. Recommend initiating PO immediately.</div>
            </div>
          </div>
          <button style={{ width: '100%', padding: '10px', marginTop: '16px', background: 'white', color: '#1d4ed8', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            Generate Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
