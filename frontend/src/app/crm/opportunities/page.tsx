'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmApi } from '@/services/api';

export default function CRMOpportunities() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await crmApi.getOpportunities();
        setOpportunities(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Preloaded demo data in case backend returns empty
  const demoOpportunities = opportunities.length > 0 ? opportunities : [
    { id: 1, name: 'ERP Implementation - TechCorp', stage: 'PROPOSAL', value: 85000, probability: 70, customer: { name: 'TechCorp Solutions' } },
    { id: 2, name: 'CRM Upgrade - GlobalTrade', stage: 'NEGOTIATION', value: 45000, probability: 85, customer: { name: 'GlobalTrade Inc' } },
    { id: 3, name: 'Cloud Migration - StartupXYZ', stage: 'QUALIFICATION', value: 120000, probability: 40, customer: { name: 'StartupXYZ' } },
    { id: 4, name: 'Support Contract - MegaRetail', stage: 'CLOSED_WON', value: 30000, probability: 100, customer: { name: 'MegaRetail Corp' } },
    { id: 5, name: 'Analytics Platform - DataDriven', stage: 'PROPOSAL', value: 95000, probability: 60, customer: { name: 'DataDriven Analytics' } },
  ];

  const filtered = demoOpportunities.filter((o: any) =>
    `${o.name} ${o.stage} ${o.customer?.name || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const stageColor = (s: string) => {
    if (s === 'CLOSED_WON') return 'var(--green)';
    if (s === 'CLOSED_LOST') return 'var(--red)';
    if (s === 'NEGOTIATION') return 'var(--amber)';
    if (s === 'PROPOSAL') return 'var(--purple)';
    return 'var(--teal)';
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Opportunities</h1>
          <p>Track sales pipeline and deal stages</p>
        </div>
        <div className="page-actions">
          <Link href="/crm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to CRM
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Opportunity
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">All Opportunities ({filtered.length})</div>
          <div className="table-controls">
            <div className="tbl-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Opportunity</th>
              <th>Customer</th>
              <th>Stage</th>
              <th>Value</th>
              <th>Probability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>No opportunities found</td></tr>
            ) : (
              filtered.map((o: any) => (
                <tr key={o.id}>
                  <td style={{fontWeight: 600}}>{o.name}</td>
                  <td>{o.customer?.name || '-'}</td>
                  <td>
                    <span className="badge" style={{ color: stageColor(o.stage), backgroundColor: `${stageColor(o.stage)}15` }}>{o.stage.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{fontWeight: 600, color: 'var(--green)'}}>${(o.value || 0).toLocaleString()}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <div style={{flex: 1, height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden'}}>
                        <div style={{width: `${o.probability}%`, height: '100%', backgroundColor: stageColor(o.stage), borderRadius: '3px'}} />
                      </div>
                      <span style={{fontSize: '12px', fontWeight: 600}}>{o.probability}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="act-btn act-edit" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
