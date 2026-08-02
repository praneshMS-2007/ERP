'use client';

import { useState, useEffect } from 'react';
import { Package, Truck, ArrowRightLeft, MapPin, Plus, Filter, LayoutGrid, ArrowRight } from 'lucide-react';
import { inventoryApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', capacity: '1000' });

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

  async function handleAddWarehouse() {
    if (!form.name || !form.location) return;
    await inventoryApi.createWarehouse({
      name: form.name,
      location: form.location,
      capacity: parseInt(form.capacity) || 1000,
    });
    setShowModal(false);
    setForm({ name: '', location: '', capacity: '1000' });
    fetchData();
  }

  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
  const avgCapacity = warehouses.length > 0 ? Math.round(totalCapacity / warehouses.length) : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Warehouse Management</h1>
          <p>Monitor multi-location inventory, warehouse capacity, and internal transfers.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
            <div className="kpi-card-label">Avg Capacity Units</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><LayoutGrid size={20} /></div>
          </div>
          <div className="kpi-card-value">{avgCapacity}</div>
          <div className="kpi-card-trend up">Units per facility</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Storage Capacity</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Truck size={20} /></div>
          </div>
          <div className="kpi-card-value">{totalCapacity}</div>
          <div className="kpi-card-trend neutral">Combined volume</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Warehouse Directory ({warehouses.length})</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {warehouses.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No warehouses created yet</div>
          ) : warehouses.map((w, i) => (
            <div key={w.id || i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--color-primary)"/> {w.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', marginLeft: '24px' }}>{w.location}</div>
                </div>
                <span className={'badge badge-healthy'}>
                  ACTIVE
                </span>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <span>Max Capacity</span>
                  <span>{w.capacity} Units</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '65%', background: '#2563eb' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD LOCATION MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Warehouse Location">
        <FormField label="Facility Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Central Logistics Hub" />
        <FormField label="Location / City" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required placeholder="Dubai, UAE" />
        <FormField label="Capacity (Units)" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} placeholder="5000" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddWarehouse}>Create Location</button>
        </div>
      </Modal>

    </div>
  );
}
