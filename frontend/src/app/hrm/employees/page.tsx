'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { hrmApi } from '@/services/api';

export default function HRMEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await hrmApi.getEmployees();
        setEmployees(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = employees.filter((e: any) => 
    `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Employees</h1>
          <p>Manage employee records and profiles</p>
        </div>
        <div className="page-actions">
          <Link href="/hrm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to HR
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">All Employees ({filtered.length})</div>
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
              <th>Employee Name</th>
              <th>Status</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>Loading data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>No employees found</td></tr>
            ) : (
              filtered.map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <div style={{fontWeight: 600}}>{e.firstName} {e.lastName}</div>
                    <div style={{fontSize: '11.5px', color: 'var(--text-muted)'}}>{e.email || '-'}</div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>{e.status}</span>
                  </td>
                  <td>{e.department?.name || '-'}</td>
                  <td>{e.designation?.title || '-'}</td>
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
