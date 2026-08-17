'use client';

import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, AlertCircle, Clock, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

const emptyForm = { customerId: '', subject: '', priority: 'MEDIUM', description: '', startDate: '', endDate: '' };

// "2026-08-20T10:00:00.000Z" -> "2026-08-20", so a date input can show it
const toDateInputValue = (iso?: string) => (iso ? iso.slice(0, 10) : '');

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('');
  const [formError, setFormError] = useState('');

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState('');

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
    if (!form.subject) { setFormError('Subject is required.'); return; }
    if (!form.startDate || !form.endDate) { setFormError('Start date and end date are both required.'); return; }
    if (form.endDate < form.startDate) { setFormError('End date cannot be before the start date.'); return; }
    setFormError('');
    try {
      await crmApi.createSupportTicket({
        subject: form.subject,
        priority: form.priority,
        description: form.description,
        customerId: form.customerId || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      setShowModal(false);
      setForm(emptyForm);
      fetchAll();
    } catch (e: any) {
      setFormError(e.message || 'Could not create this ticket.');
    }
  }

  function openEdit(t: any) {
    setEditTarget(t);
    setEditForm({
      customerId: t.customerId || '', subject: t.subject || '', priority: t.priority || 'MEDIUM',
      description: t.description || '', startDate: toDateInputValue(t.startDate), endDate: toDateInputValue(t.endDate),
    });
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.subject) { setEditError('Subject is required.'); return; }
    if (editForm.startDate && editForm.endDate && editForm.endDate < editForm.startDate) {
      setEditError('End date cannot be before the start date.');
      return;
    }
    setEditError('');
    try {
      await crmApi.updateSupportTicket(editTarget.id, {
        subject: editForm.subject,
        priority: editForm.priority,
        description: editForm.description,
        customerId: editForm.customerId || null,
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : null,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
      });
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditError(e.message || 'Could not update this ticket.');
    }
  }

  async function handleDelete(id: string, subject: string) {
    if (!confirm(`Delete ticket "${subject}"? This can't be undone.`)) return;
    try {
      await crmApi.deleteSupportTicket(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this ticket.');
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      await crmApi.updateSupportTicketStatus(id, status);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not update this ticket\'s status.');
    }
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
          <button className="btn btn-primary" onClick={() => { setFormError(''); setForm(emptyForm); setShowModal(true); }}>
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
              <th>Start – End</th>
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
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {t.startDate || t.endDate
                    ? `${t.startDate ? new Date(t.startDate).toLocaleDateString() : '—'} – ${t.endDate ? new Date(t.endDate).toLocaleDateString() : '—'}`
                    : new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {t.status !== 'RESOLVED' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(t.id, 'RESOLVED')}>
                        Mark Resolved
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(t.id, t.subject)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE TICKET MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Support Ticket">
        {formError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{formError}</div>
        )}
        <FormField label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} required placeholder="e.g. System Access Issue" />
        <FormField label="Customer" type="select" value={form.customerId} onChange={(v) => setForm({ ...form, customerId: v })}
          options={customers.map(c => ({ label: `${c.name} (${c.company || 'Individual'})`, value: c.id }))} />
        <FormField label="Priority" type="select" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}
          options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
        <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
        <FormField label="Description" type="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe the issue..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateTicket}>Create Ticket</button>
        </div>
      </Modal>

      {/* EDIT TICKET MODAL */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Ticket — ${editTarget?.subject || ''}`}>
        {editError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>
        )}
        <FormField label="Subject" value={editForm.subject} onChange={(v) => setEditForm({ ...editForm, subject: v })} required />
        <FormField label="Customer" type="select" value={editForm.customerId} onChange={(v) => setEditForm({ ...editForm, customerId: v })}
          options={customers.map(c => ({ label: `${c.name} (${c.company || 'Individual'})`, value: c.id }))} />
        <FormField label="Priority" type="select" value={editForm.priority} onChange={(v) => setEditForm({ ...editForm, priority: v })}
          options={[{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }]} />
        <FormField label="Start Date" type="date" value={editForm.startDate} onChange={(v) => setEditForm({ ...editForm, startDate: v })} />
        <FormField label="End Date" type="date" value={editForm.endDate} onChange={(v) => setEditForm({ ...editForm, endDate: v })} />
        <FormField label="Description" type="textarea" value={editForm.description} onChange={(v) => setEditForm({ ...editForm, description: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
