'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Target,
  Briefcase,
  DollarSign,
  TrendingUp,
  Plus,
  Pencil,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { crmApi } from '../../services/api';

export default function CRMPage() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    customers: 0,
    leads: 0,
    opportunities: 0,
    pipelineValue: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [customers, leads, opps] = await Promise.all([
          crmApi.getCustomers(),
          crmApi.getLeads(),
          crmApi.getOpportunities(),
        ]);

        const pipelineValue = opps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

        setStats({
          customers: customers.length || 0,
          leads: leads.length || 0,
          opportunities: opps.length || 0,
          pipelineValue,
        });

        // Combine recent activity (just an example of transforming real data for the UI)
        const recentEngagements = leads.slice(0, 5).map((l: any) => ({
          initials: l.name.substring(0, 2).toUpperCase(),
          color: '#6366f1',
          company: l.company || l.name,
          contact: l.name,
          status: l.status,
          lastActivity: new Date(l.createdAt).toLocaleDateString(),
          value: '$--', // Leads don't have value yet
        }));
        
        setEngagements(recentEngagements);
      } catch (e) {
        console.error('Failed to load CRM data', e);
      }
    }
    fetchData();
  }, []);

  const badgeClass = (s: string) => {
    const map: Record<string, string> = {
      'NEGOTIATION': 'badge badge-negotiation',
      'CLOSED_WON': 'badge badge-closed',
      'LEAD': 'badge badge-lead',
      'NEW': 'badge badge-contacted',
      'CONTACTED': 'badge badge-contacted',
    };
    return map[s] || 'badge';
  };

  return (
    <div className="fade-in">
      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">Total Customers</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.customers}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> +12% vs last month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Active Leads</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.leads}</div>
          <div className="kpi-card-trend up"><Users size={14} /> Tracking all incoming</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Open Opportunities</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.opportunities}</div>
          <div className="kpi-card-trend up"><Target size={14} /> ${(stats.pipelineValue / 1000).toFixed(1)}K Pipeline value</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Monthly Revenue</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>$428K</div>
          <div className="kpi-card-trend up"><DollarSign size={14} /> 84% of quota</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Sales Pipeline */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Active Sales Pipeline</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: 'var(--color-background)', padding: '4px 10px', borderRadius: '6px', color: 'var(--color-text-secondary)' }}>Quarterly View</span>
            </div>
            <div className="pipeline-grid">
              {[
                { label: 'LEAD', value: stats.leads.toString(), sub: 'In Progress', color: '#2563eb' },
                { label: 'OPPORTUNITY', value: stats.opportunities.toString(), sub: 'In Discussion', color: '#3b82f6' },
                { label: 'NEGOTIATION', value: '45', sub: 'Pending Sign', color: '#f59e0b' },
                { label: 'CLOSED', value: stats.customers.toString(), sub: 'Won', color: '#6b7280' },
              ].map((p) => (
                <div key={p.label} className="pipeline-card">
                  <div className="pipeline-label" style={{ color: p.color }}>{p.label}</div>
                  <div className="pipeline-value">{p.value}</div>
                  <div className="pipeline-sub">{p.sub}</div>
                  <div style={{ height: '3px', background: p.color, borderRadius: '2px', marginTop: '12px', width: '40%' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Engagements */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Leads</h3>
              <Link href="/crm/leads" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {engagements.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Loading or no data...</td></tr>
                ) : engagements.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar" style={{ background: e.color }}>{e.initials}</div>
                        <div>
                          <div className="employee-name">{e.company}</div>
                          <div className="employee-id">{e.contact}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={badgeClass(e.status)}>{e.status}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{e.lastActivity}</td>
                    <td style={{ fontWeight: 700 }}>{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column — Lead Details */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Lead Details</h3>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Pencil size={16} /></button>
          </div>

          {/* Lead Hero Image Placeholder */}
          <div style={{ width: '100%', height: '140px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', marginBottom: '16px', display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
            <div style={{ color: 'white', fontSize: '11px', opacity: 0.8 }}>City Skyline View</div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626' }}>Sarah Jenkins</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>CTO at Nova Kinetic Ltd</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Probability</div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>75%</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Expected Close</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Nov 15, 2023</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Next Action Items</div>
            {[
              { task: 'Review contract terms', due: 'Due tomorrow at 10:00 AM' },
              { task: 'Follow up on technical specs', due: 'Due Oct 20' },
              { task: 'Prepare final presentation', due: 'Due Oct 25' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid var(--color-border)', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.task}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.due}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <Mail size={16} /> Send Email
            </button>
            <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <Phone size={16} /> Call Lead
            </button>
          </div>
        </div>
      </div>

      {/* AI FAB */}
      <button className="ai-fab" aria-label="AI Assistant">
        <Zap size={24} />
      </button>
    </div>
  );
}
