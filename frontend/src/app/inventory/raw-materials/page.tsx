'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, SlidersHorizontal } from 'lucide-react';
import { rawMaterialApi, inventoryApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatDate } from '../../../lib/date';

const emptyForm = {
  name: '', code: '', unit: 'kg', minLevel: '10', status: 'ACTIVE', warehouseId: '', initialQuantity: '0',
};

function stockBadge(m: any) {
  if (m.quantity <= 0) return { label: 'OUT OF STOCK', cls: 'badge-critical' };
  if (m.quantity <= m.minLevel) return { label: 'LOW STOCK', cls: 'badge-warning' };
  return { label: 'IN STOCK', cls: 'badge-healthy' };
}

function warehouseBreakdown(m: any) {
  const rows = (m.warehouseStock || []).filter((s: any) => s.quantity > 0);
  if (rows.length === 0) return 'Not assigned to a warehouse';
  return rows.map((s: any) => `${s.warehouse?.name}: ${s.quantity}`).join(' · ');
}

export default function RawMaterialsPage() {
  const [tab, setTab] = useState<'all' | 'added'>('all');
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [additions, setAdditions] = useState<any[]>([]);
  const [additionsLoaded, setAdditionsLoaded] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addError, setAddError] = useState('');

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState('');

  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [adjustForm, setAdjustForm] = useState({ warehouseId: '', amount: '', direction: 'increase' as 'increase' | 'decrease' });
  const [adjustError, setAdjustError] = useState('');

  async function fetchAll() {
    try {
      const [matData, whData] = await Promise.all([rawMaterialApi.getRawMaterials(), inventoryApi.getWarehouses()]);
      setMaterials(Array.isArray(matData) ? matData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
    } catch (e) {
      console.error('Raw materials fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function loadAdditions() {
    try {
      const data = await rawMaterialApi.getRawMaterialAdditionsHistory();
      setAdditions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Raw material additions fetch error', e);
      setAdditions([]);
    } finally {
      setAdditionsLoaded(true);
    }
  }

  function openTab(next: 'all' | 'added') {
    setTab(next);
    if (next === 'added' && !additionsLoaded) loadAdditions();
  }

  async function handleAdd() {
    if (!addForm.name || !addForm.code || !addForm.unit) { setAddError('Name, Code, and Unit are required.'); return; }
    if (!addForm.warehouseId) { setAddError('Choose which warehouse this raw material is stored in.'); return; }
    setAddError('');
    try {
      await rawMaterialApi.createRawMaterial({
        name: addForm.name, code: addForm.code, unit: addForm.unit,
        minLevel: parseInt(addForm.minLevel || '0'), status: addForm.status,
        warehouseId: addForm.warehouseId || undefined,
        initialQuantity: parseInt(addForm.initialQuantity || '0'),
      });
      setShowAddModal(false);
      setAddForm(emptyForm);
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Could not create this raw material.');
    }
  }

  function openEdit(m: any) {
    setEditTarget(m);
    setEditForm({
      name: m.name || '', code: m.code || '', unit: m.unit || 'kg',
      minLevel: String(m.minLevel ?? 0), status: m.status || 'ACTIVE', warehouseId: '', initialQuantity: '0',
    });
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.name || !editForm.code || !editForm.unit) { setEditError('Name, Code, and Unit are required.'); return; }
    setEditError('');
    try {
      await rawMaterialApi.updateRawMaterial(editTarget.id, {
        name: editForm.name, code: editForm.code, unit: editForm.unit,
        minLevel: parseInt(editForm.minLevel || '0'), status: editForm.status,
      });
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditError(e.message || 'Could not update this raw material.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete raw material "${name}"? This can't be undone.`)) return;
    try {
      await rawMaterialApi.deleteRawMaterial(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this raw material.');
    }
  }

  function openAdjust(m: any) {
    const stocked = (m.warehouseStock || []);
    setAdjustTarget(m);
    setAdjustForm({ warehouseId: stocked.length === 1 ? stocked[0].warehouseId : '', amount: '', direction: 'increase' });
    setAdjustError('');
  }

  async function handleAdjust() {
    if (!adjustTarget) return;
    const amt = parseInt(adjustForm.amount || '0');
    if (!adjustForm.warehouseId) { setAdjustError('Choose which warehouse to adjust.'); return; }
    if (!amt || amt <= 0) { setAdjustError('Enter an amount greater than zero.'); return; }
    setAdjustError('');
    try {
      await rawMaterialApi.adjustRawMaterialStock(adjustTarget.id, {
        warehouseId: adjustForm.warehouseId,
        delta: adjustForm.direction === 'increase' ? amt : -amt,
      });
      setAdjustTarget(null);
      fetchAll();
    } catch (e: any) {
      setAdjustError(e.message || 'Could not adjust this raw material.');
    }
  }

  const adjustWarehouseOptions = adjustTarget
    ? warehouses.map((w) => {
        const existing = (adjustTarget.warehouseStock || []).find((s: any) => s.warehouseId === w.id);
        return { label: `${w.name}${existing ? ` (${existing.quantity} on hand)` : ''}`, value: w.id };
      })
    : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Raw Materials</h1>
          <p>Materials consumed in production — quantities on hand, and where they're stored.</p>
        </div>
        <div className="page-header-actions">
          {tab === 'all' && (
            <button className="btn btn-primary" onClick={() => { setAddError(''); setAddForm(emptyForm); setShowAddModal(true); }}>
              <Plus size={16} /> Add Raw Material
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openTab('all')}>All Materials</button>
        <button className={`btn ${tab === 'added' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openTab('added')}>Stock Added</button>
      </div>

      {tab === 'added' ? (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Stock Added ({additions.length})</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Every unit that's come into a warehouse — from Adjust (increase) or a new material's initial allocation.
          </p>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Material</th><th>Quantity</th><th>Warehouse</th></tr></thead>
            <tbody>
              {!additionsLoaded ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Loading…</td></tr>
              ) : additions.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No stock has been added yet</td></tr>
              ) : additions.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.date)}</td>
                  <td style={{ fontWeight: 600 }}>{m.rawMaterial?.name || 'Unknown'} <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>({m.rawMaterial?.code})</span></td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>+{m.changeAmount} {m.rawMaterial?.unit}</td>
                  <td>{m.warehouse?.name || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>All Raw Materials ({materials.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Material</th><th>Code</th><th>Quantity</th><th>Min Level</th>
              <th>Status</th><th>Warehouse</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No raw materials found</td></tr>
            ) : materials.map((m) => {
              const badge = stockBadge(m);
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{m.code}</td>
                  <td>{m.quantity} {m.unit}</td>
                  <td>{m.minLevel} {m.unit}</td>
                  <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{warehouseBreakdown(m)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(m)}><Pencil size={13} /></button>
                      <button className="btn btn-secondary btn-sm" title="Adjust stock" onClick={() => openAdjust(m)}><SlidersHorizontal size={13} /></button>
                      <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(m.id, m.name)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* ADD RAW MATERIAL */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Raw Material">
        {addError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addError}</div>}
        <FormField label="Material Name" value={addForm.name} onChange={(v) => setAddForm({ ...addForm, name: v })} required placeholder="Raw Aluminum Sheet" />
        <FormField label="Code" value={addForm.code} onChange={(v) => setAddForm({ ...addForm, code: v })} required placeholder="RM-001" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Unit" value={addForm.unit} onChange={(v) => setAddForm({ ...addForm, unit: v })} required placeholder="kg" />
          <FormField label="Status" type="select" value={addForm.status} onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
        </div>
        <FormField label="Min Level" type="number" value={addForm.minLevel} onChange={(v) => setAddForm({ ...addForm, minLevel: v })} placeholder="10" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Warehouse" type="select" value={addForm.warehouseId} onChange={(v) => setAddForm({ ...addForm, warehouseId: v })}
            required options={warehouses.filter(w => w.type !== 'VIRTUAL').map((w) => ({ label: w.name, value: w.id }))} />
          <FormField label="Initial Quantity" type="number" value={addForm.initialQuantity} onChange={(v) => setAddForm({ ...addForm, initialQuantity: v })} placeholder="0" />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Raw Material</button>
        </div>
      </Modal>

      {/* EDIT RAW MATERIAL */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name || ''}`}>
        {editError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>}
        <FormField label="Material Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required />
        <FormField label="Code" value={editForm.code} onChange={(v) => setEditForm({ ...editForm, code: v })} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Unit" value={editForm.unit} onChange={(v) => setEditForm({ ...editForm, unit: v })} required />
          <FormField label="Status" type="select" value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })}
            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
        </div>
        <FormField label="Min Level" type="number" value={editForm.minLevel} onChange={(v) => setEditForm({ ...editForm, minLevel: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>

      {/* ADJUST STOCK */}
      <Modal isOpen={!!adjustTarget} onClose={() => setAdjustTarget(null)} title={`Adjust Stock — ${adjustTarget?.name || ''}`} width="420px">
        {adjustError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{adjustError}</div>}
        <FormField label="Warehouse" type="select" value={adjustForm.warehouseId} onChange={(v) => setAdjustForm({ ...adjustForm, warehouseId: v })}
          required options={adjustWarehouseOptions} />
        <FormField label="Direction" type="select" value={adjustForm.direction} onChange={(v) => setAdjustForm({ ...adjustForm, direction: v as 'increase' | 'decrease' })}
          options={[{ label: 'Increase', value: 'increase' }, { label: 'Decrease', value: 'decrease' }]} />
        <FormField label="Amount" type="number" value={adjustForm.amount} onChange={(v) => setAdjustForm({ ...adjustForm, amount: v })} required placeholder="10" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setAdjustTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdjust}>Apply</button>
        </div>
      </Modal>
    </div>
  );
}
