'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { hrmApi } from '@/services/api';

export default function HRMLeaves() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Preloaded demo leave records
  const leaveRecords = [
    { id: 1, empName: 'Pranesh M S', type: 'Casual Leave', from: '2026-07-20', to: '2026-07-21', days: 2, reason: 'Personal work', status: 'Approved' },
    { id: 2, empName: 'Akshay Kumar', type: 'Sick Leave', from: '2026-07-18', to: '2026-07-19', days: 2, reason: 'Fever and cold', status: 'Approved' },
    { id: 3, empName: 'Priya Sharma', type: 'Annual Leave', from: '2026-07-25', to: '2026-07-30', days: 6, reason: 'Family vacation', status: 'Pending' },
    { id: 4, empName: 'Rahul Singh', type: 'Casual Leave', from: '2026-07-22', to: '2026-07-22', days: 1, reason: 'Doctor appointment', status: 'Approved' },
    { id: 5, empName: 'Deepa Nair', type: 'Maternity Leave', from: '2026-08-01', to: '2026-10-30', days: 91, reason: 'Maternity', status: 'Pending' },
  ];

  const statusColor = (s: string) => s === 'Approved' ? 'var(--green)' : s === 'Pending' ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave Management</h1>
          <p>Track and manage employee leave applications</p>
        </div>
        <div className="page-actions">
          <Link href="/hrm" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to HR
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Apply Leave
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">Leave Applications ({leaveRecords.length})</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaveRecords.map((l) => (
              <tr key={l.id}>
                <td style={{fontWeight: 600}}>{l.empName}</td>
                <td>{l.type}</td>
                <td>{l.from}</td>
                <td>{l.to}</td>
                <td>{l.days}</td>
                <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{l.reason}</td>
                <td>
                  <span className="badge" style={{ color: statusColor(l.status), backgroundColor: `${statusColor(l.status)}15` }}>{l.status}</span>
                </td>
                <td>
                  <div className="action-btns">
                    {l.status === 'Pending' && (
                      <>
                        <button className="act-btn act-edit" title="Approve" style={{color: 'var(--green)'}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </button>
                        <button className="act-btn act-delete" title="Reject">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
