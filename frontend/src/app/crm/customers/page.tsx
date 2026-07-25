'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { crmApi } from '@/services/api';

export default function CRMCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await crmApi.getCustomers();
        setCustomers(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = customers.filter((c: any) => 
    `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customers</h1>
          <p>Manage your customer relationships</p>
        </div>
        <div className="page-actions">
          <Link href="/crm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to CRM
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Customer
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">All Customers ({filtered.length})</div>
          <div className="table-controls">
            <div className="tbl-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input 
                type="text" 
                placeholder="Search name, email." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>Loading data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>No customers found</td></tr>
            ) : (
              filtered.map((c: any) => (
                <tr key={c.id}>
                  <td style={{fontWeight: 600}}>{c.name}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.company || '-'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="act-btn act-edit" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="act-btn act-delete" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
