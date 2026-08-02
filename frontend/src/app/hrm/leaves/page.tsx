'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { hrmApi, exportApi } from '@/services/api';
import ExportButton from '@/components/ExportButton';
import { ChevronLeft, Check, X, Search } from 'lucide-react';

export default function HRMLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

  async function loadData() {
    setLoading(true);
    try {
      const data = await hrmApi.getLeaves();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLeaveAction(id: string, status: 'APPROVED' | 'REJECTED') {
    await hrmApi.updateLeaveStatus(id, status);
    loadData();
  }

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const historyLeaves = leaves.filter(l => l.status !== 'PENDING').sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const displayedLeaves = activeTab === 'PENDING' ? pendingLeaves : historyLeaves;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="badge badge-approved">APPROVED</span>;
    if (status === 'REJECTED') return <span className="badge badge-suspended">REJECTED</span>;
    return <span className="badge badge-pending">PENDING</span>;
  };

  const leaveTypeBadgeClass = (type: string) => {
    if (type === 'SICK_LEAVE') return 'badge badge-sick-leave';
    if (type === 'ANNUAL_LEAVE') return 'badge badge-vacation';
    return 'badge badge-vacation';
  };

  const formatLeaveType = (type: string) => {
    if (type === 'SICK_LEAVE') return 'SICK LEAVE';
    if (type === 'ANNUAL_LEAVE') return 'VACATION';
    return type?.replace(/_/g, ' ') || 'LEAVE';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link href="/hrm" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} /> Back to Overview
            </Link>
          </div>
          <h1>Leave Management</h1>
          <p>Review pending leave requests and view historical records.</p>
        </div>
        {activeTab === 'HISTORY' && (
          <div className="page-header-actions">
            <ExportButton onExport={(format) => exportApi.exportLeaves(format)} label="Export History" />
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)', background: '#f9fafb' }}>
          <button
            onClick={() => setActiveTab('PENDING')}
            style={{
              padding: '16px 24px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'PENDING' ? '#2563eb' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'PENDING' ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            Pending Requests ({pendingLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            style={{
              padding: '16px 24px', fontSize: '14px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
              color: activeTab === 'HISTORY' ? '#2563eb' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'HISTORY' ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            Leave History ({historyLeaves.length})
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Loading records...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Employee</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Department</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Type</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Dates</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>Reason</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>{activeTab === 'HISTORY' ? 'Action Time' : 'Status'}</th>
                  <th style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)' }}>{activeTab === 'HISTORY' ? 'Status' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                      No records found
                    </td>
                  </tr>
                ) : displayedLeaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.employee?.firstName} {l.employee?.lastName}</td>
                    <td>{l.employee?.department?.name || '-'}</td>
                    <td><span className={leaveTypeBadgeClass(l.leaveType)}>{formatLeaveType(l.leaveType)}</span></td>
                    <td>{formatDate(l.startDate)} - {formatDate(l.endDate)}</td>
                    <td style={{ maxWidth: '300px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>&ldquo;{l.reason || 'No reason provided'}&rdquo;</td>
                    <td>{activeTab === 'HISTORY' ? new Date(l.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : statusBadge(l.status)}</td>
                    <td>
                      {activeTab === 'HISTORY' ? (
                        statusBadge(l.status)
                      ) : (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleLeaveAction(l.id, 'REJECTED')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                            <X size={16} /> Reject
                          </button>
                          <button onClick={() => handleLeaveAction(l.id, 'APPROVED')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                            <Check size={16} /> Approve
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
