'use client';

import { useEffect, useState } from 'react';
import {
  Package, IndianRupee, AlertTriangle, ShoppingCart, TrendingUp,
  Download, Plus, Filter, MoreVertical, ChevronLeft, ChevronRight, Bot,
} from 'lucide-react';
import { inventoryApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';
import { formatINR, formatINRCompact } from '../../lib/currency';
import { formatDate } from '../../lib/date';

const emptyPoForm = { productId: '', supplierId: '', warehouseId: '', quantity: '', totalAmount: '', orderDate: new Date().toISOString().slice(0, 10) };
const emptyProdForm = { name: '', sku: '', category: '', unit: 'pcs', price: '', costPrice: '', status: 'ACTIVE', warehouseId: '', initialQuantity: '' };

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [stockActivity, setStockActivity] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, totalValue: 0, pendingPOs: 0 });
  const [page, setPage] = useState(0);
  const [filterCat, setFilterCat] = useState('');
  const [showPOModal, setShowPOModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [poForm, setPoForm] = useState(emptyPoForm);
  const [poError, setPoError] = useState('');
  const [prodForm, setProdForm] = useState(emptyProdForm);
  const [prodError, setProdError] = useState('');
  const pageSize = 8;

  async function fetchAll() {
    try {
      const [prodData, poData, activityData, supData, whData] = await Promise.all([
        inventoryApi.getProducts(), inventoryApi.getPurchaseOrders(), inventoryApi.getRecentStockActivity(6), inventoryApi.getSuppliers(), inventoryApi.getWarehouses(),
      ]);
      const prodList = Array.isArray(prodData) ? prodData : [];
      const poList = Array.isArray(poData) ? poData : [];
      const activityList = Array.isArray(activityData) ? activityData : [];
      const supList = Array.isArray(supData) ? supData : [];
      const whList = Array.isArray(whData) ? whData : [];

      setProducts(prodList);
      setPurchaseOrders(poList);
      setStockActivity(activityList);
      setSuppliers(supList);
      setWarehouses(whList);

      const lowStock = prodList.filter((p: any) => p.stockLevel <= p.minStockLevel).length;
      const totalValue = prodList.reduce((s: number, p: any) => s + (p.price * p.stockLevel), 0);
      const pendingPOs = poList.filter((po: any) => po.status === 'PENDING' || po.status === 'ORDERED').length;

      setStats({ total: prodList.length, lowStock, totalValue, pendingPOs });
    } catch (e) { console.error('Inventory error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  let filtered = [...products];
  if (filterCat) filtered = filtered.filter(p => p.category === filterCat);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const uniqueCats = [...new Set(products.map(p => p.category).filter(Boolean))];

  async function handleCreatePO() {
    if (!poForm.productId || !poForm.quantity) { setPoError('Product and quantity are required.'); return; }
    setPoError('');
    try {
      await inventoryApi.createPurchaseOrder({
        productId: poForm.productId, supplierId: poForm.supplierId || undefined, warehouseId: poForm.warehouseId || undefined,
        quantity: parseInt(poForm.quantity), totalAmount: parseFloat(poForm.totalAmount || '0'),
        orderDate: new Date(poForm.orderDate).toISOString(), status: 'ORDERED',
      } as any);
      setShowPOModal(false);
      setPoForm(emptyPoForm);
      fetchAll();
    } catch (e: any) {
      setPoError(e.message || 'Could not create this purchase order.');
    }
  }

  async function handleCreateProduct() {
    if (!prodForm.name || !prodForm.sku || !prodForm.unit) { setProdError('Name, SKU, and Unit are required.'); return; }
    if (!prodForm.warehouseId) { setProdError('Choose which warehouse this product is stored in.'); return; }
    setProdError('');
    try {
      await inventoryApi.createProduct({
        name: prodForm.name, sku: prodForm.sku, category: prodForm.category, unit: prodForm.unit,
        price: parseFloat(prodForm.price || '0'), costPrice: parseFloat(prodForm.costPrice || '0'),
        status: prodForm.status, warehouseId: prodForm.warehouseId || undefined,
        initialQuantity: parseInt(prodForm.initialQuantity || '0'), minStockLevel: 10,
      } as any);
      setShowProductModal(false);
      setProdForm(emptyProdForm);
      fetchAll();
    } catch (e: any) {
      setProdError(e.message || 'Could not create this product.');
    }
  }

  const REASON_LABEL: Record<string, string> = { SALE: 'Sold', RESTOCK: 'Restocked', ADJUSTMENT: 'Stock Added', RETURN: 'Returned' };

  const stockBadge = (p: any) => p.stockLevel <= p.minStockLevel ? 'badge badge-on-leave' : 'badge badge-active';
  const stockLabel = (p: any) => p.stockLevel <= p.minStockLevel ? 'LOW STOCK' : 'IN STOCK';

  const PO_STATUS_BADGE: Record<string, string> = {
    ORDERED: 'badge badge-pending', SHIPPED: 'badge badge-in-transit', DELIVERED: 'badge badge-approved', CANCELLED: 'badge badge-probation',
  };
  // A delivered PO can never move again (its stock has already landed);
  // everything else can still progress toward delivery or be cancelled.
  const NEXT_PO_STATUSES: Record<string, string[]> = {
    ORDERED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    CANCELLED: [],
    DELIVERED: [],
  };
  const [poActionError, setPoActionError] = useState('');

  async function handlePOStatusChange(id: string, status: string) {
    setPoActionError('');
    try {
      await inventoryApi.updatePurchaseOrderStatus(id, status);
      fetchAll();
    } catch (e: any) {
      setPoActionError(e.message || 'Could not update this purchase order.');
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Real-time oversight of global stock and procurement cycles.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportProducts(format)} label="Export Products" />
          <button className="btn btn-secondary" onClick={() => { setProdError(''); setShowProductModal(true); }}><Plus size={16} /> Add Product</button>
          <button className="btn btn-primary" onClick={() => { setPoError(''); setShowPOModal(true); }}><Plus size={16} /> New Purchase Order</button>
        </div>
      </div>

      {/* KPI Grid — LIVE */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Products</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Package size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Low Stock Alerts</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertTriangle size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: stats.lowStock > 0 ? '#dc2626' : undefined }}>{stats.lowStock}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Inventory Value</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><IndianRupee size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINRCompact(stats.totalValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Pending POs</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><ShoppingCart size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.pendingPOs}</div>
        </div>
      </div>

      {/* Main Grid — Product Catalog + Live Stock Movement */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px', marginTop: '16px' }}>

        {/* Products Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Product Catalog</h3>
            <select className="btn btn-secondary btn-sm" value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(0); }} style={{ fontSize: '12px' }}>
              <option value="">All Categories</option>
              {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <table className="data-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No products found</td></tr>
              ) : paginated.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td>{p.category || '-'}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(p.price)}</td>
                  <td>{p.stockLevel} / {p.minStockLevel}</td>
                  <td><span className={stockBadge(p)}>{stockLabel(p)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <span>Showing {filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '13px', padding: '0 8px' }}>{page + 1} / {totalPages || 1}</span>
              <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Stock Movement & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Stock Movement Feed — real additions/sales, not PO ordering status */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Stock Movement</h3>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>LIVE DB</span>
            </div>

            {stockActivity.length === 0 && products.filter(p => p.stockLevel <= p.minStockLevel).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No stock activity logged</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stockActivity.slice(0, 4).map((m: any) => {
                  const added = m.changeAmount > 0;
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: added ? '#16a34a' : '#2563eb', marginTop: 5, flexShrink: 0 }}></div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {added ? 'Stock Added: ' : 'Stock Moved: '}{m.product?.name || 'Unknown product'}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          {added ? '+' : ''}{m.changeAmount} units · {REASON_LABEL[m.reason] || m.reason}{m.warehouse?.name ? ` · ${m.warehouse.name}` : ''}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{formatDate(m.date)}</div>
                      </div>
                    </div>
                  );
                })}

                {products.filter(p => p.stockLevel <= p.minStockLevel).slice(0, 2).map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginTop: 5, flexShrink: 0 }}></div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#dc2626' }}>Low Stock: {p.name}</div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>Current: {p.stockLevel} units (Min: {p.minStockLevel})</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purchase Orders — create happens above (New Purchase Order),
              this is where a PO actually gets progressed to Delivered so
              its stock lands, or cancelled. */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Purchase Orders</h3>
            </div>
            {poActionError && <div style={{ padding: '8px 12px', marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{poActionError}</div>}
            {purchaseOrders.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No purchase orders yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 320, overflowY: 'auto' }}>
                {purchaseOrders.map((po: any) => (
                  <div key={po.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12px', paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>{po.orderNumber}</span>
                      <span className={PO_STATUS_BADGE[po.status] || 'badge'}>{po.status}</span>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {po.product?.name || 'Unknown product'} · {po.quantity} units · {po.supplier?.name || 'No supplier'}
                    </div>
                    {NEXT_PO_STATUSES[po.status]?.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) handlePOStatusChange(po.id, e.target.value); }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, width: 'fit-content' }}
                      >
                        <option value="">Change status…</option>
                        {NEXT_PO_STATUSES[po.status].map((s) => <option key={s} value={s}>{s === 'DELIVERED' ? 'Mark Delivered' : s === 'CANCELLED' ? 'Cancel' : s}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* NEW PURCHASE ORDER MODAL */}
      <Modal isOpen={showPOModal} onClose={() => setShowPOModal(false)} title="Create Purchase Order">
        {poError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{poError}</div>}
        <FormField label="Product" type="select" value={poForm.productId} onChange={(v) => setPoForm({ ...poForm, productId: v })} required
          options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))} />
        <FormField label="Supplier" type="select" value={poForm.supplierId} onChange={(v) => setPoForm({ ...poForm, supplierId: v })}
          options={suppliers.map(s => ({ label: s.name, value: s.id }))} />
        <FormField label="Warehouse (delivers to)" type="select" value={poForm.warehouseId} onChange={(v) => setPoForm({ ...poForm, warehouseId: v })}
          options={warehouses.map(w => ({ label: w.name, value: w.id }))} />
        <FormField label="Quantity" type="number" value={poForm.quantity} onChange={(v) => setPoForm({ ...poForm, quantity: v })} required placeholder="100" />
        <FormField label="Total Amount" type="number" value={poForm.totalAmount} onChange={(v) => setPoForm({ ...poForm, totalAmount: v })} placeholder="5000" />
        <FormField label="Order Date" type="date" value={poForm.orderDate} onChange={(v) => setPoForm({ ...poForm, orderDate: v })} required />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreatePO}>Create PO</button>
        </div>
      </Modal>

      {/* ADD PRODUCT MODAL */}
      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title="Add New Product">
        {prodError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{prodError}</div>}
        <FormField label="Product Name" value={prodForm.name} onChange={(v) => setProdForm({ ...prodForm, name: v })} required placeholder="Industrial Sensor" />
        <FormField label="SKU" value={prodForm.sku} onChange={(v) => setProdForm({ ...prodForm, sku: v })} required placeholder="SKU-001" />
        <FormField label="Category" value={prodForm.category} onChange={(v) => setProdForm({ ...prodForm, category: v })} placeholder="Electronics" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Unit" value={prodForm.unit} onChange={(v) => setProdForm({ ...prodForm, unit: v })} required placeholder="pcs" />
          <FormField label="Status" type="select" value={prodForm.status} onChange={(v) => setProdForm({ ...prodForm, status: v })}
            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Price" type="number" value={prodForm.price} onChange={(v) => setProdForm({ ...prodForm, price: v })} placeholder="99.99" />
          <FormField label="Cost Price" type="number" value={prodForm.costPrice} onChange={(v) => setProdForm({ ...prodForm, costPrice: v })} placeholder="50.00" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Warehouse" type="select" value={prodForm.warehouseId} onChange={(v) => setProdForm({ ...prodForm, warehouseId: v })}
            required options={warehouses.filter(w => w.type !== 'VIRTUAL').map(w => ({ label: w.name, value: w.id }))} />
          <FormField label="Initial Stock" type="number" value={prodForm.initialQuantity} onChange={(v) => setProdForm({ ...prodForm, initialQuantity: v })} placeholder="100" />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateProduct}>Add Product</button>
        </div>
      </Modal>
    </div>
  );
}
