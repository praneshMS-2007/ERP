'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Package, Truck, ArrowRightLeft, MapPin, Plus, Filter, LayoutGrid, ArrowRight, ChevronLeft, Pencil } from 'lucide-react';
import { inventoryApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

// Leaflet touches `window` at import time, so both map components can only
// ever run client-side — ssr:false keeps them out of the server bundle
// entirely rather than crashing on "window is not defined".
const LocationPickerMap = dynamic(() => import('../../../components/LocationPickerMap'), { ssr: false });
const WarehouseMap = dynamic(() => import('../../../components/WarehouseMap'), { ssr: false });

const emptyWarehouseForm = { name: '', type: 'REAL', location: '', capacity: '1000', latitude: null as number | null, longitude: null as number | null };

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyWarehouseForm);
  const [addError, setAddError] = useState('');

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyWarehouseForm);
  const [editError, setEditError] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Tons stays the canonical stored unit (that's what the two real
  // warehouses' capacity was already entered as) — kg is purely a display
  // and input convenience layered on top, converting by ×1000/÷1000.
  const [capacityUnit, setCapacityUnit] = useState<'ton' | 'kg'>('ton');
  const [addCapacityUnit, setAddCapacityUnit] = useState<'ton' | 'kg'>('ton');
  const [editCapacityUnit, setEditCapacityUnit] = useState<'ton' | 'kg'>('ton');

  function displayCapacity(tons: number) {
    const v = capacityUnit === 'kg' ? tons * 1000 : tons;
    return v.toLocaleString('en-IN');
  }
  const capacityUnitLabel = capacityUnit === 'kg' ? 'kg' : 'Tons';

  async function fetchData() {
    try {
      const data = await inventoryApi.getWarehouses();
      if (data && Array.isArray(data)) setWarehouses(data);
    } catch (e) {
      console.error('Warehouse fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const data = await inventoryApi.getWarehouseDetail(id);
      setDetail(data);
    } catch (e) {
      console.error('Warehouse detail fetch error', e);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAddWarehouse() {
    if (!form.name || !form.location) { setAddError('Name and location are required.'); return; }
    if (form.type === 'REAL' && (form.latitude == null || form.longitude == null)) {
      setAddError('Pin this warehouse\'s location on the map before saving.');
      return;
    }
    setAddError('');
    try {
      const enteredCapacity = parseFloat(form.capacity) || 1000;
      const capacityInTons = addCapacityUnit === 'kg' ? enteredCapacity / 1000 : enteredCapacity;
      await inventoryApi.createWarehouse({
        name: form.name,
        type: form.type,
        location: form.location,
        capacity: capacityInTons,
        latitude: form.type === 'REAL' ? form.latitude : null,
        longitude: form.type === 'REAL' ? form.longitude : null,
      });
      setShowModal(false);
      setForm(emptyWarehouseForm);
      setAddCapacityUnit('ton');
      fetchData();
    } catch (e: any) {
      setAddError(e.message || 'Could not create this warehouse.');
    }
  }

  function openEdit(w: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(w);
    setEditForm({ name: w.name || '', type: w.type || 'REAL', location: w.location || '', capacity: String(w.capacity ?? 1000), latitude: w.latitude ?? null, longitude: w.longitude ?? null });
    setEditCapacityUnit('ton');
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.name || !editForm.location) { setEditError('Name and location are required.'); return; }
    if (editForm.type === 'REAL' && (editForm.latitude == null || editForm.longitude == null)) {
      setEditError('Pin this warehouse\'s location on the map before saving.');
      return;
    }
    setEditError('');
    const enteredCapacity = parseFloat(editForm.capacity) || 1000;
    const capacityInTons = editCapacityUnit === 'kg' ? enteredCapacity / 1000 : enteredCapacity;
    try {
      await inventoryApi.updateWarehouse(editTarget.id, {
        name: editForm.name,
        type: editForm.type,
        location: editForm.location,
        capacity: capacityInTons,
        latitude: editForm.type === 'REAL' ? editForm.latitude : null,
        longitude: editForm.type === 'REAL' ? editForm.longitude : null,
      });
      setEditTarget(null);
      fetchData();
    } catch (e: any) {
      setEditError(e.message || 'Could not update this warehouse.');
    }
  }

  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const avgCapacity = warehouses.length > 0 ? Math.round(totalCapacity / warehouses.length) : 0;

  const unitToggle = (
    <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        className={`btn btn-sm ${capacityUnit === 'ton' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ borderRadius: 0, border: 'none' }}
        onClick={() => setCapacityUnit('ton')}
      >Tons</button>
      <button
        className={`btn btn-sm ${capacityUnit === 'kg' ? 'btn-primary' : 'btn-secondary'}`}
        style={{ borderRadius: 0, border: 'none' }}
        onClick={() => setCapacityUnit('kg')}
      >kg</button>
    </div>
  );

  // ================= WAREHOUSE DETAIL DRILL-DOWN =================
  if (detailId) {
    const used = detail?.capacityUsed ?? 0;
    const cap = detail?.capacity ?? 1;
    const pct = Math.min(100, Math.round((used / cap) * 100));
    return (
      <div className="fade-in">
        <button onClick={() => { setDetailId(null); setDetail(null); }} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
          <ChevronLeft size={14} /> Back to warehouses
        </button>
        {detailLoading || !detail ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : (
          <>
            <div className="page-header">
              <div>
                <h1>{detail.name}</h1>
                <p>{detail.location}</p>
              </div>
              <div className="page-header-actions">{unitToggle}</div>
            </div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                <span>Capacity Used</span>
                <span>{displayCapacity(used)} / {displayCapacity(detail.capacity)} {capacityUnitLabel} ({pct}%)</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? '#dc2626' : '#2563eb' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Products Stored ({detail.productStock?.length || 0})</h3>
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead>
                  <tbody>
                    {(!detail.productStock || detail.productStock.length === 0) ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>Nothing stored here yet</td></tr>
                    ) : detail.productStock.map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>
                          {s.product?.name}
                          {s.product?.status === 'INACTIVE' && (
                            <span className="badge badge-critical" style={{ marginLeft: '8px', fontSize: '10px' }}>DISCONTINUED</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{s.product?.sku}</td>
                        <td>{s.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Raw Materials Stored ({detail.rawMaterialStock?.length || 0})</h3>
                <table className="data-table">
                  <thead><tr><th>Material</th><th>Code</th><th>Quantity</th></tr></thead>
                  <tbody>
                    {(!detail.rawMaterialStock || detail.rawMaterialStock.length === 0) ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>Nothing stored here yet</td></tr>
                    ) : detail.rawMaterialStock.map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.rawMaterial?.name}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{s.rawMaterial?.code}</td>
                        <td>{s.quantity} {s.rawMaterial?.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Warehouse Management</h1>
          <p>Monitor multi-location inventory, warehouse capacity, and internal transfers.</p>
        </div>
        <div className="page-header-actions">
          {unitToggle}
          <button className="btn btn-primary" onClick={() => { setAddError(''); setForm(emptyWarehouseForm); setAddCapacityUnit('ton'); setShowModal(true); }}>
            <Plus size={16} /> Add Location
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Active Locations</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><MapPin size={20} /></div>
          </div>
          <div className="kpi-card-value">{warehouses.length}</div>
          <div className="kpi-card-trend neutral">Global network</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Avg Capacity ({capacityUnitLabel})</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><LayoutGrid size={20} /></div>
          </div>
          <div className="kpi-card-value">{displayCapacity(avgCapacity)}</div>
          <div className="kpi-card-trend up">{capacityUnitLabel} per facility</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Storage Capacity ({capacityUnitLabel})</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Truck size={20} /></div>
          </div>
          <div className="kpi-card-value">{displayCapacity(totalCapacity)}</div>
          <div className="kpi-card-trend neutral">Combined volume</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Warehouse Map</h3>
        </div>
        <WarehouseMap warehouses={warehouses} onMarkerClick={openDetail} />
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Warehouse Directory ({warehouses.length})</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {warehouses.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No warehouses created yet</div>
          ) : warehouses.map((w, i) => {
            const used = w.capacityUsed ?? 0;
            const pct = w.capacity > 0 ? Math.min(100, Math.round((used / w.capacity) * 100)) : 0;
            return (
            <div key={w.id || i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer' }} onClick={() => openDetail(w.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--color-primary)"/> {w.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', marginLeft: '24px' }}>{w.location}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-contacted">{w.type === 'VIRTUAL' ? 'VIRTUAL' : 'REAL'}</span>
                  <span className={'badge badge-healthy'}>ACTIVE</span>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(w, e)}><Pencil size={13} /></button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <span>Used Capacity</span>
                  <span>{displayCapacity(used)} / {displayCapacity(w.capacity)} {capacityUnitLabel}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? '#dc2626' : '#2563eb' }} />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* ADD LOCATION MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Warehouse Location" width="560px">
        {addError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addError}</div>}
        <FormField label="Facility Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Central Logistics Hub" />
        <FormField label="Type" type="select" value={form.type} onChange={(v) => setForm({ ...form, type: v, latitude: null, longitude: null })}
          options={[{ label: 'Real (physical location)', value: 'REAL' }, { label: 'Virtual (digital/software goods)', value: 'VIRTUAL' }]} />
        <FormField label="Location / City" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required placeholder="Bhiwandi, Maharashtra" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Capacity" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} placeholder="5000" />
          <FormField label="Unit" type="select" value={addCapacityUnit} onChange={(v) => setAddCapacityUnit(v as 'ton' | 'kg')}
            options={[{ label: 'Tons', value: 'ton' }, { label: 'kg', value: 'kg' }]} />
        </div>
        {form.type === 'REAL' && (
          <LocationPickerMap
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(lat, lng, label) => setForm((f) => ({ ...f, latitude: lat, longitude: lng, location: label || f.location }))}
          />
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddWarehouse}>Create Location</button>
        </div>
      </Modal>

      {/* EDIT WAREHOUSE MODAL */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name || ''}`} width="560px">
        {editError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>}
        <FormField label="Facility Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required />
        <FormField label="Type" type="select" value={editForm.type} onChange={(v) => setEditForm({ ...editForm, type: v, latitude: v === 'VIRTUAL' ? null : editForm.latitude, longitude: v === 'VIRTUAL' ? null : editForm.longitude })}
          options={[{ label: 'Real (physical location)', value: 'REAL' }, { label: 'Virtual (digital/software goods)', value: 'VIRTUAL' }]} />
        <FormField label="Location / City" value={editForm.location} onChange={(v) => setEditForm({ ...editForm, location: v })} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Capacity" type="number" value={editForm.capacity} onChange={(v) => setEditForm({ ...editForm, capacity: v })} />
          <FormField label="Unit" type="select" value={editCapacityUnit} onChange={(v) => setEditCapacityUnit(v as 'ton' | 'kg')}
            options={[{ label: 'Tons', value: 'ton' }, { label: 'kg', value: 'kg' }]} />
        </div>
        {editForm.type === 'REAL' && (
          <LocationPickerMap
            latitude={editForm.latitude}
            longitude={editForm.longitude}
            onChange={(lat, lng, label) => setEditForm((f) => ({ ...f, latitude: lat, longitude: lng, location: label || f.location }))}
          />
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>

    </div>
  );
}
