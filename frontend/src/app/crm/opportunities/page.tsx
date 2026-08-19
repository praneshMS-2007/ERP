'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatINR } from '../../../lib/currency';

const STAGE_LABEL: Record<string, string> = {
  DISCOVERY: 'Discovery', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won', CLOSED_LOST: 'Closed Lost',
};
const STAGE_COLOR: Record<string, string> = {
  DISCOVERY: '#2563eb', PROPOSAL: '#3b82f6', NEGOTIATION: '#d97706',
  CLOSED_WON: '#16a34a', CLOSED_LOST: '#dc2626',
};
const STAGE_OPTIONS = [
  { label: 'Discovery', value: 'DISCOVERY' },
  { label: 'Proposal', value: 'PROPOSAL' },
  { label: 'Negotiation', value: 'NEGOTIATION' },
  { label: 'Closed Won', value: 'CLOSED_WON' },
  { label: 'Closed Lost', value: 'CLOSED_LOST' },
];

// "2026-09-16T18:59:37.047Z" -> "2026-09-16", so a date input can show it
const toDateInputValue = (iso?: string) => (iso ? iso.slice(0, 10) : '');

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ value: '', stage: '', expectedCloseDate: '' });
  const [error, setError] = useState('');

  const emptyAddForm = { customerId: '', value: '0', stage: 'DISCOVERY', expectedCloseDate: '' };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addError, setAddError] = useState('');

  async function fetchAll() {
    try {
      const [oppData, custData] = await Promise.all([crmApi.getOpportunities(), crmApi.getCustomers()]);
      setOpportunities(Array.isArray(oppData) ? oppData : []);
      setCustomers(Array.isArray(custData) ? custData : []);
    } catch (e) {
      console.error('Opportunities fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function openEdit(o: any) {
    setEditTarget(o);
    setEditForm({ value: String(o.value ?? 0), stage: o.stage, expectedCloseDate: toDateInputValue(o.expectedCloseDate) });
    setError('');
  }

  async function handleSave() {
    if (!editTarget) return;
    try {
      await crmApi.updateOpportunity(editTarget.id, {
        value: parseFloat(editForm.value) || 0,
        stage: editForm.stage,
        expectedCloseDate: editForm.expectedCloseDate ? new Date(editForm.expectedCloseDate).toISOString() : undefined,
      });
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Could not update this opportunity.');
    }
  }

  function openAdd() {
    setAddForm(emptyAddForm);
    setAddError('');
    setShowAddModal(true);
  }

  async function handleAdd() {
    if (!addForm.customerId) { setAddError('Choose which customer this deal is for.'); return; }
    try {
      await crmApi.createOpportunity({
        customerId: addForm.customerId,
        value: parseFloat(addForm.value) || 0,
        stage: addForm.stage,
        expectedCloseDate: addForm.expectedCloseDate ? new Date(addForm.expectedCloseDate).toISOString() : undefined,
      });
      setShowAddModal(false);
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Could not create this opportunity.');
    }
  }

  const openCount = opportunities.filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST').length;
  const openValue = opportunities.filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST').reduce((s, o) => s + (o.value || 0), 0);
  const wonValue = opportunities.filter(o => o.stage === 'CLOSED_WON').reduce((s, o) => s + (o.value || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Opportunities</h1>
          <p>Every deal in the pipeline, and where it stands.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> New Opportunity
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-label">OPEN DEALS</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{openCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">OPEN PIPELINE VALUE</div>
          <div className="kpi-card-value" style={{ marginTop: '8px' }}>{formatINR(openValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-label">WON (ALL TIME)</div>
          <div className="kpi-card-value" style={{ marginTop: '8px', color: '#16a34a' }}>{formatINR(wonValue)}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>All Opportunities ({opportunities.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Stage</th>
              <th>Value</th>
              <th>Expected Close</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : opportunities.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No opportunities yet.</td></tr>
            ) : opportunities.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>{o.customer?.name || '—'}{o.customer?.company ? ` · ${o.customer.company}` : ''}</td>
                <td>
                  <span style={{ color: STAGE_COLOR[o.stage], background: `${STAGE_COLOR[o.stage]}18`, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                    {STAGE_LABEL[o.stage] || o.stage}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{formatINR(o.value)}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(o)}>
                    <Pencil size={13} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT OPPORTUNITY */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Opportunity — ${editTarget?.customer?.name || ''}`} width="420px">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <FormField label="Deal Value (₹)" type="number" value={editForm.value} onChange={(v) => setEditForm({ ...editForm, value: v })} required placeholder="0" />
        <FormField label="Stage" type="select" value={editForm.stage} onChange={(v) => setEditForm({ ...editForm, stage: v })} options={STAGE_OPTIONS} />
        <FormField label="Expected Close Date" type="date" value={editForm.expectedCloseDate} onChange={(v) => setEditForm({ ...editForm, expectedCloseDate: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </Modal>

      {/* NEW OPPORTUNITY */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Opportunity" width="420px">
        {addError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addError}</div>
        )}
        <FormField label="Customer" type="select" value={addForm.customerId} onChange={(v) => setAddForm({ ...addForm, customerId: v })}
          options={customers.map((c) => ({ label: `${c.name}${c.company ? ` (${c.company})` : ''}`, value: c.id }))} />
        <FormField label="Deal Value (₹)" type="number" value={addForm.value} onChange={(v) => setAddForm({ ...addForm, value: v })} placeholder="0" />
        <FormField label="Stage" type="select" value={addForm.stage} onChange={(v) => setAddForm({ ...addForm, stage: v })} options={STAGE_OPTIONS} />
        <FormField label="Expected Close Date" type="date" value={addForm.expectedCloseDate} onChange={(v) => setAddForm({ ...addForm, expectedCloseDate: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Create Opportunity</button>
        </div>
      </Modal>
    </div>
  );
}
