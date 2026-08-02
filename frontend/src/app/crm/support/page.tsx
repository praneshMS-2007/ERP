'use client';

import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, Filter, MessageSquare, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customerId: '', subject: '', priority: 'MEDIUM', description: '' });
  const [filterStatus, setFilterStatus] = useState('');

  async function fetchAll() {
    try {
      const [ticketData, custData] = await Promise.all([
        crmApi.getSupportTickets(),
        crmApi.getCustomers(),
      ]);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setCustomers(Array.isArray(custData) ? custData : []);
    } catch (e) {
      console.error('Support ticket fetch error', e);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleCreateTicket() {
    if (!form.subject) return;
    await crmApi.createSupportTicket({
      subject: form.subject,
      priority: form.priority,
      description: form.description,
      customerId: form.customerId || undefined,
    });
    setShowModal(false);
    setForm({ customerId: '', subject: '', priority: 'MEDIUM', description: '' });
    fetchAll();
  }

  async function handleUpdateStatus(id: string, status: string) {
    await crmApi.updateSupportTicketStatus(id, status);
    fetchAll();
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#d97706';
      case 'MEDIUM': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'OPEN') return 'badge badge-warning';
    if (s === 'IN_PROGRESS') return 'badge badge-contacted';
    if (s === 'RESOLVED') return 'badge badge-healthy';
    return 'badge';
  };

  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;

  let filtered = [...tickets];
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Customer Support</h1>
          <p>Manage helpdesk tickets, respond to inquiries, and monitor service SLAs.</p>
        </div>
        <div className="page-header-actions">
          <select className="btn btn-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Ticket
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Open Tickets</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertCircle size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: openTickets > 0 ? '#dc2626' : undefined }}>{openTickets}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">In Progress</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{inProgressTickets}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Resolved</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle2 size={20} /></div>
          </div>
          <div className="kpi-card-value">{resolvedTickets}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Tickets</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><LifeBuoy size={20} /></div>
          </div>
          <div className="kpi-card-value">{tickets.length}</div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Helpdesk Tickets ({filtered.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Customer</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No support tickets found</td></tr>
            ) : filtered.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.subject}</td>
                <td>{t.customer?.name || 'Guest / Unassigned'}</td>
                <td>
                  <span style={{ color: priorityColor(t.priority), fontWeight: 700, fontSize: '12px' }}>
                    ● {t.priority}
                  </span>
                </td>
                <td><span className={statusBadge(t.status)}>{t.status}</span></td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                <td>
                  {t.status !== 'RESOLVED' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(t.id, 'RESOLVED')}>
                      Mark Resolved
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE TICKET MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Support Ticket">
        <FormField label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} required placeholder="e.g. System Access Issue" />
        <FormField label="Customer" type="select" value={form.customerId} onChange={(v) => setForm({ ...form, customerId: v })}
          options={customers.map(c => ({ label: `${c.name} (${c.company || 'Individual'})`, value: c.id }))} />
        <FormField label="Priority" type="select" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
          options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        <FormField label="Description" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe the issue..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateTicket}>Create Ticket</button>
        </div>
      </Modal>
    </div>
  );
}
