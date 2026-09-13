'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { selfApi } from '../../services/api';
import Modal, { FormField } from '../../components/Modal';
import { formatDate } from '../../lib/date';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK_LEAVE: 'Sick Leave',
  CASUAL_LEAVE: 'Casual Leave',
};

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'badge-healthy',
  PENDING: 'badge-warning',
  REJECTED: 'badge-danger',
};

interface LeaveBalance {
  accrued: number;
  used: number;
  remaining: number;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState<{ sick: LeaveBalance; casual: LeaveBalance; flexCredit: LeaveBalance } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ leaveType: 'CASUAL_LEAVE', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const [leaveData, balanceData] = await Promise.all([selfApi.getLeaves(), selfApi.getLeaveBalance()]);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setBalance(balanceData || null);
    } catch (e: any) {
      setError(e?.message || 'Could not load your leave data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit() {
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError('Start date, end date, and a reason are all required.');
      return;
    }
    setError('');
    try {
      await selfApi.requestLeave({
        leaveType: form.leaveType,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason,
      });
      setShowModal(false);
      setForm({ leaveType: 'CASUAL_LEAVE', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Leave request failed.');
    }
  }

  const sickAvailable = balance ? balance.sick.remaining + balance.flexCredit.remaining : 0;
  const casualAvailable = balance ? balance.casual.remaining + balance.flexCredit.remaining : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Leave Management</h1>
          <p>Request leave and track your own leave history — nobody else's is shown here.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setForm({ leaveType: sickAvailable === 0 && casualAvailable > 0 ? 'CASUAL_LEAVE' : 'SICK_LEAVE', startDate: '', endDate: '', reason: '' }); setError(''); setShowModal(true); }}>
            <Plus size={16} /> Request Leave
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">SICK LEAVE REMAINING</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><CalendarDays size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : sickAvailable}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{balance ? `${balance.sick.accrued} accrued this year, ${balance.sick.used} used` : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">CASUAL LEAVE REMAINING</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><CalendarDays size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : casualAvailable}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{balance ? `${balance.casual.accrued} accrued this year, ${balance.casual.used} used` : ''}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">FLEXIBLE CREDIT</div>
            <div className="kpi-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><CalendarDays size={20} /></div>
          </div>
          <div className="kpi-card-value">{loading ? '—' : balance?.flexCredit.remaining ?? 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Usable for either type, from this partial month</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>My Leave Requests</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No leave requests yet</td></tr>
            ) : leaves.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</td>
                <td style={{ fontSize: '13px' }}>{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{l.reason}</td>
                <td><span className={`badge ${STATUS_BADGE[l.status] || ''}`}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField
          label="Leave Type"
          type="select"
          value={form.leaveType}
          onChange={(v) => setForm({ ...form, leaveType: v })}
          options={[
            { label: `Sick Leave (${sickAvailable} available)`, value: 'SICK_LEAVE' },
            { label: `Casual Leave (${casualAvailable} available)`, value: 'CASUAL_LEAVE' },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
          <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
        </div>
        <FormField label="Reason" type="textarea" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} placeholder="Reason for leave..." required />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Submit Request</button>
        </div>
      </Modal>
    </div>
  );
}
