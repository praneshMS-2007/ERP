'use client';

import { useEffect, useState } from 'react';
import {
  Users, Target, Briefcase, DollarSign, TrendingUp,
  Plus, Pencil, Mail, Phone, ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { crmApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [stats, setStats] = useState({ customers: 0, leads: 0, opportunities: 0, pipelineValue: 0 });
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: '' });

  async function fetchAll() {
    try {
      const [custData, leadData, oppData, fuData] = await Promise.all([
        crmApi.getCustomers(), crmApi.getLeads(), crmApi.getOpportunities(), crmApi.getFollowUps(),
      ]);
      const custList = Array.isArray(custData) ? custData : [];
      const leadList = Array.isArray(leadData) ? leadData : [];
      const oppList = Array.isArray(oppData) ? oppData : [];
      const fuList = Array.isArray(fuData) ? fuData : [];

      setCustomers(custList);
      setLeads(leadList);
      setOpportunities(oppList);
      setFollowUps(fuList);

      const pipelineValue = oppList.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
      setStats({ customers: custList.length, leads: leadList.length, opportunities: oppList.length, pipelineValue });

      if (leadList.length > 0 && !selectedLead) setSelectedLead(leadList[0]);
    } catch (e) { console.error('CRM fetch error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  // Pipeline values from real opportunities
  const stageValues: Record<string, { value: number; count: number }> = {};
  opportunities.forEach((o: any) => {
    const stage = o.stage || 'DISCOVERY';
    if (!stageValues[stage]) stageValues[stage] = { value: 0, count: 0 };
    stageValues[stage].value += o.value || 0;
    stageValues[stage].count++;
  });

  async function handleAddLead() {
    if (!form.name) return;
    await crmApi.createLead(form as any);
    setShowAddModal(false);
    setForm({ name: '', email: '', phone: '', company: '', source: '' });
    fetchAll();
  }

  async function handleConvertLead(id: string) {
    await crmApi.convertLead(id);
    fetchAll();
  }

  const formatCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  const badgeClass = (s: string) => {
    const map: Record<string, string> = {
      'NEGOTIATION': 'badge badge-negotiation', 'CONVERTED': 'badge badge-closed',
      'NEW': 'badge badge-contacted', 'CONTACTED': 'badge badge-contacted',
    };
    return map[s] || 'badge';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Customer Relationship Management</h1>
          <p>Track leads, manage opportunities, and monitor sales pipeline.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportCustomers(format)} label="Export Customers" />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      {/* KPI Grid — ALL LIVE */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">Total Customers</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.customers}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> Live from database</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Active Leads</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.leads}</div>
          <div className="kpi-card-trend up"><Users size={14} /> Tracking all incoming</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Open Opportunities</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{stats.opportunities}</div>
          <div className="kpi-card-trend up"><Target size={14} /> {formatCurrency(stats.pipelineValue)} Pipeline</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">Pipeline Value</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{formatCurrency(stats.pipelineValue)}</div>
          <div className="kpi-card-trend up"><DollarSign size={14} /> Total open deals</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pipeline — LIVE VALUES */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Active Sales Pipeline</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', background: 'var(--color-background)', padding: '4px 10px', borderRadius: '6px', color: 'var(--color-text-secondary)' }}>Live Data</span>
            </div>
            <div className="pipeline-grid">
              {[
                { label: 'DISCOVERY', color: '#2563eb' },
                { label: 'PROPOSAL', color: '#3b82f6' },
                { label: 'NEGOTIATION', color: '#f59e0b' },
                { label: 'CLOSED_WON', color: '#16a34a' },
              ].map((p) => {
                const sv = stageValues[p.label] || { value: 0, count: 0 };
                return (
                  <div key={p.label} className="pipeline-card">
                    <div className="pipeline-label" style={{ color: p.color }}>{p.label.replace('_', ' ')}</div>
                    <div className="pipeline-value">{formatCurrency(sv.value)}</div>
                    <div className="pipeline-sub">{sv.count} Deals</div>
                    <div style={{ height: '3px', background: p.color, borderRadius: '2px', marginTop: '12px', width: sv.count > 0 ? '60%' : '10%' }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leads Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Leads</h3>
            </div>
            <table className="data-table">
              <thead><tr><th>Lead</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No leads yet</td></tr>
                ) : leads.slice(0, 8).map((l) => (
                  <tr key={l.id} onClick={() => setSelectedLead(l)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar" style={{ background: '#6366f1' }}>{l.name?.substring(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="employee-name">{l.name}</div>
                          <div className="employee-id">{l.company || 'No company'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={badgeClass(l.status)}>{l.status}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                    <td>
                      {l.status !== 'CONVERTED' && (
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleConvertLead(l.id); }}>Convert</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column — DYNAMIC Lead Details */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Lead Details</h3>
          </div>

          {selectedLead ? (
            <>
              <div style={{ width: '100%', height: '100px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', marginBottom: '16px', display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
                <div style={{ color: 'white', fontSize: '11px', opacity: 0.8 }}>Lead Profile</div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#dc2626' }}>{selectedLead.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{selectedLead.company || 'No company'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Status</div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>{selectedLead.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Source</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedLead.source || 'N/A'}</div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Contact Info</div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>📧 {selectedLead.email || 'No email'}</div>
                <div style={{ fontSize: '13px' }}>📞 {selectedLead.phone || 'No phone'}</div>
              </div>

              {/* Live Next Action Items / Follow-ups */}
              <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border-light)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Next Action Items</div>
                {followUps.filter((f: any) => f.leadId === selectedLead.id || f.customer?.name === selectedLead.name).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No pending follow-up actions</div>
                ) : followUps.filter((f: any) => f.leadId === selectedLead.id || f.customer?.name === selectedLead.name).map((f: any) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
                    <input type="checkbox" defaultChecked={false} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.notes || 'Follow up with lead'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Due: {new Date(f.nextActionDate || f.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a href={selectedLead.email ? `mailto:${selectedLead.email}` : '#'} className="btn btn-primary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                  <Mail size={16} /> Send Email
                </a>
                <a href={selectedLead.phone ? `tel:${selectedLead.phone}` : '#'} className="btn btn-secondary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                  <Phone size={16} /> Call Lead
                </a>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>Click a lead to view details</div>
          )}
        </div>
      </div>

      {/* ADD LEAD MODAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Lead">
        <FormField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Sarah Jenkins" />
        <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="sarah@company.com" />
        <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 555-0123" />
        <FormField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Nova Kinetic Ltd" />
        <FormField label="Source" type="select" value={form.source} onChange={(v) => setForm({ ...form, source: v })}
          options={[{ label: 'Website', value: 'WEBSITE' }, { label: 'Referral', value: 'REFERRAL' }, { label: 'LinkedIn', value: 'LINKEDIN' }, { label: 'Cold Call', value: 'COLD_CALL' }, { label: 'Trade Show', value: 'TRADE_SHOW' }]} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddLead}>Create Lead</button>
        </div>
      </Modal>

      <Link href="/ai" className="ai-fab" aria-label="AI Assistant" style={{ textDecoration: 'none', color: 'white' }}>
        <Zap size={24} />
      </Link>
    </div>
  );
}
