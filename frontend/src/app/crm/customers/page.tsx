'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [error, setError] = useState('');

  async function fetchAll() {
    try {
      const data = await crmApi.getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Customers fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function openEdit(c: any) {
    setEditTarget(c);
    setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', company: c.company || '' });
    setError('');
  }

  async function handleSave() {
    if (!editTarget) return;
    try {
      await crmApi.updateCustomer(editTarget.id, form);
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Could not update this customer.');
    }
  }

  async function handleToggleStatus(c: any) {
    const nextStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await crmApi.updateCustomer(c.id, { status: nextStatus });
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not update this customer\'s status.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"? This can't be undone.`)) return;
    try {
      await crmApi.deleteCustomer(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this customer.');
    }
  }

  const filtered = filterStatus ? customers.filter(c => (c.status || 'ACTIVE') === filterStatus) : customers;
  const activeCount = customers.filter(c => (c.status || 'ACTIVE') === 'ACTIVE').length;
  const inactiveCount = customers.filter(c => c.status === 'INACTIVE').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Every customer on file — mark one inactive if they've churned, without deleting their history.</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ cursor: 'pointer', outline: filterStatus === '' ? '2px solid #2563eb' : 'none' }} onClick={() => setFilterStatus('')}>
          <div className="kpi-card-label">ALL CUSTOMERS</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{customers.length}</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', outline: filterStatus === 'ACTIVE' ? '2px solid #16a34a' : 'none' }} onClick={() => setFilterStatus('ACTIVE')}>
          <div className="kpi-card-label">ACTIVE</div>
          <div className="kpi-card-value" style={{ marginTop: '8px', color: '#16a34a' }}>{activeCount}</div>
        </div>
        <div className="kpi-card" style={{ cursor: 'pointer', outline: filterStatus === 'INACTIVE' ? '2px solid #dc2626' : 'none' }} onClick={() => setFilterStatus('INACTIVE')}>
          <div className="kpi-card-label">INACTIVE / CHURNED</div>
          <div className="kpi-card-value" style={{ marginTop: '8px', color: '#dc2626' }}>{inactiveCount}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{filterStatus ? `${filterStatus === 'ACTIVE' ? 'Active' : 'Inactive'} Customers` : 'All Customers'} ({filtered.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Customer Since</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No customers found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{c.company || 'Individual'}</div>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div>{c.email || '—'}</div>
                  <div>{c.phone || ''}</div>
                </td>
                <td>
                  <span className={`badge ${c.status === 'INACTIVE' ? 'badge-critical' : 'badge-healthy'}`}>{c.status || 'ACTIVE'}</span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                    <button
                      className="btn btn-secondary btn-sm"
                      title={c.status === 'ACTIVE' ? 'Mark inactive' : 'Mark active'}
                      onClick={() => handleToggleStatus(c)}
                    >
                      {c.status === 'ACTIVE' ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(c.id, c.name)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Customer — ${editTarget?.name || ''}`}>
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
