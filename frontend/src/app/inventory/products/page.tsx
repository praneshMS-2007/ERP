'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, ShoppingCart, PackagePlus } from 'lucide-react';
import { inventoryApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatINR } from '../../../lib/currency';

const emptyProductForm = {
  name: '', sku: '', category: '', unit: 'pcs', price: '', costPrice: '', isDigital: false,
  minStockLevel: '10', status: 'ACTIVE', warehouseId: '', initialQuantity: '0',
};

function stockBadge(p: any) {
  if (p.stockLevel <= 0) return { label: 'OUT OF STOCK', cls: 'badge-critical' };
  if (p.stockLevel <= p.minStockLevel) return { label: 'LOW STOCK', cls: 'badge-warning' };
  return { label: 'IN STOCK', cls: 'badge-healthy' };
}

function warehouseBreakdown(p: any) {
  const rows = (p.warehouseStock || []).filter((s: any) => s.quantity > 0);
  if (rows.length === 0) return 'Not assigned to a warehouse';
  return rows.map((s: any) => `${s.warehouse?.name}: ${s.quantity}`).join(' · ');
}

const REASON_LABEL: Record<string, string> = { SALE: 'Sold', RESTOCK: 'Restocked', ADJUSTMENT: 'Stock Added', RETURN: 'Returned' };

export default function ProductsPage() {
  const [tab, setTab] = useState<'active' | 'discontinued' | 'added'>('active');
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [additions, setAdditions] = useState<any[]>([]);
  const [additionsLoaded, setAdditionsLoaded] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyProductForm);
  const [addError, setAddError] = useState('');

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyProductForm);
  const [editError, setEditError] = useState('');

  const [sellTarget, setSellTarget] = useState<any | null>(null);
  const [sellForm, setSellForm] = useState({ warehouseId: '', quantity: '' });
  const [sellError, setSellError] = useState('');

  const [addStockTarget, setAddStockTarget] = useState<any | null>(null);
  const [addStockForm, setAddStockForm] = useState({ warehouseId: '', quantity: '' });
  const [addStockError, setAddStockError] = useState('');

  async function fetchAll() {
    try {
      const [prodData, whData] = await Promise.all([inventoryApi.getProducts(), inventoryApi.getWarehouses()]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
    } catch (e) {
      console.error('Products fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function loadAdditions() {
    try {
      const data = await inventoryApi.getProductAdditionsHistory();
      setAdditions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Product additions fetch error', e);
      setAdditions([]);
    } finally {
      setAdditionsLoaded(true);
    }
  }

  function openTab(next: 'active' | 'discontinued' | 'added') {
    setTab(next);
    if (next === 'added' && !additionsLoaded) loadAdditions();
  }

  async function handleAdd() {
    if (!addForm.name || !addForm.sku || !addForm.unit) { setAddError('Name, SKU, and Unit are required.'); return; }
    if (!addForm.warehouseId) { setAddError('Choose which warehouse this product is stored in.'); return; }
    setAddError('');
    try {
      await inventoryApi.createProduct({
        name: addForm.name, sku: addForm.sku, category: addForm.category, unit: addForm.unit,
        price: parseFloat(addForm.price || '0'), costPrice: parseFloat(addForm.costPrice || '0'),
        minStockLevel: parseInt(addForm.minStockLevel || '0'), status: addForm.status, isDigital: addForm.isDigital,
        warehouseId: addForm.warehouseId || undefined,
        initialQuantity: parseInt(addForm.initialQuantity || '0'),
      });
      setShowAddModal(false);
      setAddForm(emptyProductForm);
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Could not create this product.');
    }
  }

  function openEdit(p: any) {
    setEditTarget(p);
    setEditForm({
      name: p.name || '', sku: p.sku || '', category: p.category || '', unit: p.unit || 'pcs',
      price: String(p.price ?? ''), costPrice: String(p.costPrice ?? ''), isDigital: !!p.isDigital,
      minStockLevel: String(p.minStockLevel ?? 0), status: p.status || 'ACTIVE',
      warehouseId: '', initialQuantity: '',
    });
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.name || !editForm.sku || !editForm.unit) { setEditError('Name, SKU, and Unit are required.'); return; }
    const addQty = parseInt(editForm.initialQuantity || '0');
    if (editForm.warehouseId && addQty <= 0) { setEditError('Enter a quantity greater than zero to add to that warehouse.'); return; }
    setEditError('');
    try {
      await inventoryApi.updateProduct(editTarget.id, {
        name: editForm.name, sku: editForm.sku, category: editForm.category, unit: editForm.unit,
        price: parseFloat(editForm.price || '0'), costPrice: parseFloat(editForm.costPrice || '0'),
        minStockLevel: parseInt(editForm.minStockLevel || '0'), status: editForm.status, isDigital: editForm.isDigital,
      });
      if (editForm.warehouseId && addQty > 0) {
        await inventoryApi.addProductStock(editTarget.id, { warehouseId: editForm.warehouseId, quantity: addQty });
      }
      setEditTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditError(e.message || 'Could not update this product.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete product "${name}"? This can't be undone.`)) return;
    try {
      await inventoryApi.deleteProduct(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this product.');
    }
  }

  function openSell(p: any) {
    const stocked = (p.warehouseStock || []).filter((s: any) => s.quantity > 0);
    setSellTarget(p);
    setSellForm({ warehouseId: stocked.length === 1 ? stocked[0].warehouseId : '', quantity: '' });
    setSellError('');
  }

  async function handleSell() {
    if (!sellTarget) return;
    const qty = parseInt(sellForm.quantity || '0');
    if (!sellForm.warehouseId) { setSellError('Choose which warehouse to sell from.'); return; }
    if (!qty || qty <= 0) { setSellError('Enter a quantity greater than zero.'); return; }
    setSellError('');
    try {
      await inventoryApi.sellProduct(sellTarget.id, { warehouseId: sellForm.warehouseId, quantity: qty });
      setSellTarget(null);
      fetchAll();
    } catch (e: any) {
      setSellError(e.message || 'Could not record this sale.');
    }
  }

  function openAddStock(p: any) {
    setAddStockTarget(p);
    setAddStockForm({ warehouseId: '', quantity: '' });
    setAddStockError('');
  }

  async function handleAddStock() {
    if (!addStockTarget) return;
    const qty = parseInt(addStockForm.quantity || '0');
    if (!addStockForm.warehouseId) { setAddStockError('Choose which warehouse to add stock to.'); return; }
    if (!qty || qty <= 0) { setAddStockError('Enter a quantity greater than zero.'); return; }
    setAddStockError('');
    try {
      await inventoryApi.addProductStock(addStockTarget.id, { warehouseId: addStockForm.warehouseId, quantity: qty });
      setAddStockTarget(null);
      fetchAll();
    } catch (e: any) {
      setAddStockError(e.message || 'Could not add stock for this product.');
    }
  }

  const sellableWarehouses = sellTarget
    ? (sellTarget.warehouseStock || []).filter((s: any) => s.quantity > 0).map((s: any) => ({ label: `${s.warehouse?.name} (${s.quantity} available)`, value: s.warehouseId }))
    : [];

  // A digital product can only ever go into a Virtual warehouse, and a
  // physical one only into a Real warehouse — matches the server-side
  // guard, this is just the dropdown reflecting it.
  const warehousesFor = (isDigital: boolean) => warehouses.filter((w) => w.type === (isDigital ? 'VIRTUAL' : 'REAL'));

  const addWarehouseOptions = warehousesFor(addForm.isDigital).map((w) => ({ label: w.name, value: w.id }));
  const editWarehouseOptions = warehousesFor(editForm.isDigital).map((w) => {
    const existing = (editTarget?.warehouseStock || []).find((s: any) => s.warehouseId === w.id);
    return { label: `${w.name}${existing ? ` (${existing.quantity} on hand)` : ''}`, value: w.id };
  });

  const addStockWarehouseOptions = addStockTarget
    ? warehousesFor(!!addStockTarget.isDigital).map((w) => {
        const existing = (addStockTarget.warehouseStock || []).find((s: any) => s.warehouseId === w.id);
        return { label: `${w.name}${existing ? ` (${existing.quantity} on hand)` : ''}`, value: w.id };
      })
    : [];

  const activeProducts = products.filter((p) => p.status !== 'INACTIVE');
  const discontinuedProducts = products.filter((p) => p.status === 'INACTIVE');
  const visibleProducts = tab === 'active' ? activeProducts : discontinuedProducts;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Every product, where it's stored, and what's still on offer.</p>
        </div>
        {tab === 'active' && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => { setAddError(''); setAddForm(emptyProductForm); setShowAddModal(true); }}>
              <Plus size={16} /> Add Product
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openTab('active')}>Active Products</button>
        <button className={`btn ${tab === 'discontinued' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openTab('discontinued')}>Discontinued Products</button>
        <button className={`btn ${tab === 'added' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openTab('added')}>Stock Added</button>
      </div>

      {tab === 'added' ? (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Stock Added ({additions.length})</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Every unit that's come into a warehouse — from Add Stock, a new product's initial allocation, or a delivered Purchase Order. Sales are on the Sales Orders page's History tab instead.
          </p>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Warehouse</th><th>Reason</th></tr></thead>
            <tbody>
              {!additionsLoaded ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading…</td></tr>
              ) : additions.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No stock has been added yet</td></tr>
              ) : additions.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{m.product?.name || 'Unknown'} <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>({m.product?.sku})</span></td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>+{m.changeAmount}</td>
                  <td>{m.warehouse?.name || 'Unknown'}</td>
                  <td>{REASON_LABEL[m.reason] || m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          {tab === 'active' ? `All Products (${visibleProducts.length})` : `Discontinued Products (${visibleProducts.length})`}
        </h3>
        {tab === 'discontinued' && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            No longer offered. Edit one and set its status back to Active to bring it back.
          </p>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Total Stock</th>
              <th>Status</th><th>Warehouse</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : visibleProducts.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>{tab === 'active' ? 'No products found' : 'No discontinued products'}</td></tr>
            ) : visibleProducts.map((p) => {
              const badge = stockBadge(p);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{p.sku}</td>
                  <td>{p.category || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(p.price)}</td>
                  <td>{p.stockLevel} {p.unit}</td>
                  <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{warehouseBreakdown(p)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                      {tab === 'active' && (
                        <>
                          <button className="btn btn-secondary btn-sm" title="Add stock" onClick={() => openAddStock(p)}><PackagePlus size={13} /></button>
                          <button
                            className="btn btn-secondary btn-sm"
                            title={(p.warehouseStock || []).some((s: any) => s.quantity > 0) ? 'Sell' : 'Not assigned to a warehouse yet — use Add Stock first'}
                            disabled={!(p.warehouseStock || []).some((s: any) => s.quantity > 0)}
                            onClick={() => openSell(p)}
                          ><ShoppingCart size={13} /></button>
                        </>
                      )}
                      <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(p.id, p.name)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* ADD PRODUCT */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product">
        {addError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addError}</div>}
        <FormField label="Product Name" value={addForm.name} onChange={(v) => setAddForm({ ...addForm, name: v })} required placeholder="Industrial Sensor" />
        <FormField label="SKU" value={addForm.sku} onChange={(v) => setAddForm({ ...addForm, sku: v })} required placeholder="SKU-001" />
        <FormField label="Category" value={addForm.category} onChange={(v) => setAddForm({ ...addForm, category: v })} placeholder="Electronics" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Unit" value={addForm.unit} onChange={(v) => setAddForm({ ...addForm, unit: v })} required placeholder="pcs" />
          <FormField label="Status" type="select" value={addForm.status} onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Price" type="number" value={addForm.price} onChange={(v) => setAddForm({ ...addForm, price: v })} placeholder="99.99" />
          <FormField label="Cost Price" type="number" value={addForm.costPrice} onChange={(v) => setAddForm({ ...addForm, costPrice: v })} placeholder="50.00" />
        </div>
        <FormField label="Min Stock Level" type="number" value={addForm.minStockLevel} onChange={(v) => setAddForm({ ...addForm, minStockLevel: v })} placeholder="10" />
        <FormField label="Product Type" type="select" value={addForm.isDigital ? 'DIGITAL' : 'PHYSICAL'}
          onChange={(v) => setAddForm({ ...addForm, isDigital: v === 'DIGITAL', warehouseId: '' })}
          options={[{ label: 'Physical', value: 'PHYSICAL' }, { label: 'Digital / Software', value: 'DIGITAL' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label={`Warehouse (${addForm.isDigital ? 'Virtual' : 'Real'})`} type="select" value={addForm.warehouseId} onChange={(v) => setAddForm({ ...addForm, warehouseId: v })}
            required options={addWarehouseOptions} />
          <FormField label="Initial Quantity" type="number" value={addForm.initialQuantity} onChange={(v) => setAddForm({ ...addForm, initialQuantity: v })} placeholder="0" />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Product</button>
        </div>
      </Modal>

      {/* EDIT PRODUCT */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Product — ${editTarget?.name || ''}`}>
        {editError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>}
        <FormField label="Product Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required />
        <FormField label="SKU" value={editForm.sku} onChange={(v) => setEditForm({ ...editForm, sku: v })} required />
        <FormField label="Category" value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Unit" value={editForm.unit} onChange={(v) => setEditForm({ ...editForm, unit: v })} required />
          <FormField label="Status" type="select" value={editForm.status} onChange={(v) => setEditForm({ ...editForm, status: v })}
            options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Price" type="number" value={editForm.price} onChange={(v) => setEditForm({ ...editForm, price: v })} />
          <FormField label="Cost Price" type="number" value={editForm.costPrice} onChange={(v) => setEditForm({ ...editForm, costPrice: v })} />
        </div>
        <FormField label="Min Stock Level" type="number" value={editForm.minStockLevel} onChange={(v) => setEditForm({ ...editForm, minStockLevel: v })} />
        <FormField label="Product Type" type="select" value={editForm.isDigital ? 'DIGITAL' : 'PHYSICAL'}
          onChange={(v) => setEditForm({ ...editForm, isDigital: v === 'DIGITAL', warehouseId: '' })}
          options={[{ label: 'Physical', value: 'PHYSICAL' }, { label: 'Digital / Software', value: 'DIGITAL' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label={`Add to Warehouse (${editForm.isDigital ? 'Virtual' : 'Real'})`} type="select" value={editForm.warehouseId} onChange={(v) => setEditForm({ ...editForm, warehouseId: v })}
            options={editWarehouseOptions} />
          <FormField label="Quantity to Add" type="number" value={editForm.initialQuantity} onChange={(v) => setEditForm({ ...editForm, initialQuantity: v })} placeholder="0" />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
          Leave the warehouse blank to just edit the product's details without changing its stock.
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>

      {/* SELL PRODUCT */}
      <Modal isOpen={!!sellTarget} onClose={() => setSellTarget(null)} title={`Sell — ${sellTarget?.name || ''}`} width="420px">
        {sellError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{sellError}</div>}
        <FormField label="Warehouse" type="select" value={sellForm.warehouseId} onChange={(v) => setSellForm({ ...sellForm, warehouseId: v })}
          required options={sellableWarehouses} />
        <FormField label="Quantity Sold" type="number" value={sellForm.quantity} onChange={(v) => setSellForm({ ...sellForm, quantity: v })} required placeholder="1" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setSellTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSell}>Record Sale</button>
        </div>
      </Modal>

      {/* ADD STOCK */}
      <Modal isOpen={!!addStockTarget} onClose={() => setAddStockTarget(null)} title={`Add Stock — ${addStockTarget?.name || ''}`} width="420px">
        {addStockError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{addStockError}</div>}
        <FormField label="Warehouse" type="select" value={addStockForm.warehouseId} onChange={(v) => setAddStockForm({ ...addStockForm, warehouseId: v })}
          required options={addStockWarehouseOptions} />
        <FormField label="Quantity to Add" type="number" value={addStockForm.quantity} onChange={(v) => setAddStockForm({ ...addStockForm, quantity: v })} required placeholder="10" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setAddStockTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddStock}>Add Stock</button>
        </div>
      </Modal>
    </div>
  );
}
