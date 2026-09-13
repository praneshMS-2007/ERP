'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, ArrowRightCircle, Plus } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatDate } from '../../../lib/date';

const STATUS_BADGE: Record<string, string> = {
  NEW: 'badge-contacted', CONTACTED: 'badge-contacted', QUALIFIED: 'badge-warning',
  CONVERTED: 'badge-healthy', LOST: 'badge-critical',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: '', status: 'NEW' });
  const [error, setError] = useState('');

  const emptyAddForm = { name: '', email: '', phone: '', company: '', source: '' };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addError, setAddError] = useState('');

  async function fetchAll() {
    try {
      const data = await crmApi.getLeads();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Leads fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function openEdit(l: any) {
    setEditTarget(l);
    setForm({ name: l.name || '', email: l.email || '', phone: l.phone || '', company: l.company || '', source: l.source || '', status: l.status });
    setError('');
  }

  async function handleSave() {
    if (!editTarget) return;
    try {
      await crmApi.updateLead(editTarget.id, form);
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Could not update this lead.');
    }
  }

  async function handleAddLead() {
    if (!addForm.name) { setAddError('Full name is required.'); return; }
    setAddError('');
    try {
      await crmApi.createLead({ ...addForm, status: 'NEW' });
      setShowAddModal(false);
      setAddForm(emptyAddForm);
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Could not create this lead.');
    }
  }

  async function handleConvert(id: string) {
    try {
      await crmApi.convertLead(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not convert this lead.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete lead "${name}"? This can't be undone.`)) return;
    try {
      await crmApi.deleteLead(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this lead.');
    }
  }

  const filtered = filterStatus ? leads.filter(l => l.status === filterStatus) : leads;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p>Every lead ever captured — edit, convert, or remove any of them here.</p>
        </div>
        <div className="page-header-actions">
          <select className="btn btn-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: '13px' }}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONVERTED">Converted</option>
            <option value="LOST">Lost</option>
          </select>
          <button className="btn btn-primary" onClick={() => { setAddError(''); setAddForm(emptyAddForm); setShowAddModal(true); }}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>All Leads ({filtered.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No leads found</td></tr>
            ) : filtered.map((l) => (
              <tr key={l.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{l.company || 'No company'}</div>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div>{l.email || '—'}</div>
                  <div>{l.phone || ''}</div>
                </td>
                <td>{l.source || '—'}</td>
                <td><span className={`badge ${STATUS_BADGE[l.status] || ''}`}>{l.status}</span></td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(l.createdAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}><Pencil size={13} /></button>
                    {l.status !== 'CONVERTED' && l.status !== 'LOST' && (
                      <button className="btn btn-secondary btn-sm" title="Convert to customer" onClick={() => handleConvert(l.id)}><ArrowRightCircle size={13} /></button>
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(l.id, l.name)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Lead — ${editTarget?.name || ''}`}>
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        <FormField label="Source" type="select" value={form.source} onChange={(v) => setForm({ ...form, source: v })}
          options={[{ label: 'Website', value: 'WEBSITE' }, { label: 'Referral', value: 'REFERRAL' }, { label: 'LinkedIn', value: 'LINKEDIN' }, { label: 'Cold Call', value: 'COLD_CALL' }, { label: 'Trade Show', value: 'TRADE_SHOW' }]} />
        <FormField label="Status" type="select" value={form.status} onChange={(v) => setForm({ ...form, status: v })}
          options={[{ label: 'New', value: 'NEW' }, { label: 'Contacted', value: 'CONTACTED' }, { label: 'Qualified', value: 'QUALIFIED' }, { label: 'Lost', value: 'LOST' }]} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Lead">
        {addError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addError}</div>
        )}
        <FormField label="Full Name" value={addForm.name} onChange={(v) => setAddForm({ ...addForm, name: v })} required placeholder="e.g. Sarah Jenkins" />
        <FormField label="Email" type="email" value={addForm.email} onChange={(v) => setAddForm({ ...addForm, email: v })} placeholder="sarah@company.com" />
        <FormField label="Phone" value={addForm.phone} onChange={(v) => setAddForm({ ...addForm, phone: v })} placeholder="+91 98765 43210" />
        <FormField label="Company" value={addForm.company} onChange={(v) => setAddForm({ ...addForm, company: v })} placeholder="Nova Kinetic Ltd" />
        <FormField label="Source" type="select" value={addForm.source} onChange={(v) => setAddForm({ ...addForm, source: v })}
          options={[{ label: 'Website', value: 'WEBSITE' }, { label: 'Referral', value: 'REFERRAL' }, { label: 'LinkedIn', value: 'LINKEDIN' }, { label: 'Cold Call', value: 'COLD_CALL' }, { label: 'Trade Show', value: 'TRADE_SHOW' }]} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddLead}>Create Lead</button>
        </div>
      </Modal>
    </div>
  );
}
