'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Download, Plus } from 'lucide-react';
import { inventoryApi, crmApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatINR } from '../../../lib/currency';

const emptyForm = { customerId: '', productId: '', warehouseId: '', quantity: '1' };

export default function SalesOrdersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'shipped' | 'history'>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyProductFilter, setHistoryProductFilter] = useState('');

  async function fetchData() {
    try {
      const [orderData, custData, prodData] = await Promise.all([
        inventoryApi.getSalesOrders(),
        crmApi.getCustomers(),
        inventoryApi.getProducts(),
      ]);
      if (orderData && Array.isArray(orderData)) setOrders(orderData);
      if (custData && Array.isArray(custData)) setCustomers(custData);
      if (prodData && Array.isArray(prodData)) setProducts(prodData);
    } catch (e) {
      console.error('Sales orders fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function loadHistory() {
    try {
      const data = await inventoryApi.getSalesHistory();
      setSalesHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Sales history fetch error', e);
      setSalesHistory([]);
    } finally {
      setHistoryLoaded(true);
    }
  }

  function openTab(tab: typeof activeTab) {
    setActiveTab(tab);
    if (tab === 'history' && !historyLoaded) loadHistory();
  }

  const selectedProduct = products.find((p) => p.id === form.productId);
  const productWarehouseOptions = selectedProduct
    ? (selectedProduct.warehouseStock || []).filter((s: any) => s.quantity > 0).map((s: any) => ({ label: `${s.warehouse?.name} (${s.quantity} available)`, value: s.warehouseId }))
    : [];

  function openCreateModal() {
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  async function handleCreateOrder() {
    if (!form.customerId || !form.productId || !form.warehouseId) {
      setFormError('Customer, product, and warehouse are all required.');
      return;
    }
    const qty = parseInt(form.quantity) || 1;
    if (qty <= 0) { setFormError('Quantity must be greater than zero.'); return; }
    setFormError('');
    const totalAmount = selectedProduct ? selectedProduct.price * qty : 0;

    try {
      await inventoryApi.createSalesOrder({
        customerId: form.customerId,
        productId: form.productId,
        warehouseId: form.warehouseId,
        quantity: qty,
        totalAmount,
      });
      setShowModal(false);
      setForm(emptyForm);
      fetchData();
    } catch (e: any) {
      setFormError(e.message || 'Could not create this sales order.');
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      await inventoryApi.updateSalesOrderStatus(id, status);
      fetchData();
      if (historyLoaded) loadHistory();
    } catch (e: any) {
      alert(e.message || 'Could not update this order.');
    }
  }

  const badgeClass = (s: string) => {
    switch (s) {
      case 'PENDING': return 'badge badge-warning';
      case 'PROCESSING': return 'badge badge-contacted';
      case 'SHIPPED': return 'badge badge-primary';
      case 'DELIVERED': return 'badge badge-healthy';
      default: return 'badge';
    }
  };

  const filteredOrders = orders.filter(o => activeTab === 'all' || (activeTab === 'pending' && (o.status === 'PENDING' || o.status === 'PROCESSING')) || (activeTab === 'shipped' && (o.status === 'SHIPPED' || o.status === 'DELIVERED')));

  const historyProductNames = [...new Set(salesHistory.map((m) => m.product?.name).filter(Boolean))];
  const filteredHistory = historyProductFilter ? salesHistory.filter((m) => m.product?.name === historyProductFilter) : salesHistory;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Sales Orders</h1>
          <p>Manage customer orders, track fulfillment status, and trigger invoicing.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Create Order
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Open Orders</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><ShoppingCart size={20} /></div>
          </div>
          <div className="kpi-card-value">{orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length}</div>
          <div className="kpi-card-trend neutral">Awaiting fulfillment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Orders Delivered</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Package size={20} /></div>
          </div>
          <div className="kpi-card-value">{orders.filter(o => o.status === 'DELIVERED').length}</div>
          <div className="kpi-card-trend up">Completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Order Revenue</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Download size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0))}</div>
          <div className="kpi-card-trend up">Total processed</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'pending', 'shipped', 'history'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => openTab(tab)}
              >
                {tab === 'history' ? 'History' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {activeTab === 'history' && (
            <select className="btn btn-secondary btn-sm" value={historyProductFilter} onChange={(e) => setHistoryProductFilter(e.target.value)} style={{ fontSize: '13px' }}>
              <option value="">All Products</option>
              {historyProductNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>

        {activeTab === 'history' ? (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Quantity Sold</th><th>Warehouse</th></tr></thead>
            <tbody>
              {!historyLoaded ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Loading…</td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No sales recorded yet</td></tr>
              ) : filteredHistory.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{m.product?.name || 'Unknown'} <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>({m.product?.sku})</span></td>
                  <td style={{ fontWeight: 700 }}>{Math.abs(m.changeAmount)}</td>
                  <td>{m.warehouse?.name || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No sales orders found</td></tr>
              ) : filteredOrders.map((o, i) => (
                <tr key={o.id || i}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{o.orderNo || `SO-${i + 1001}`}</td>
                  <td style={{ fontWeight: 600 }}>{o.customer?.company || o.customer?.name || 'Customer'}</td>
                  <td>{o.product ? `${o.product.name} × ${o.quantity}` : '—'}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(o.totalAmount)}</td>
                  <td><span className={badgeClass(o.status)}>{o.status}</span></td>
                  <td>
                    {o.status === 'PENDING' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(o.id, 'DELIVERED')}>
                        Mark Delivered
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Sales Order">
        {formError && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{formError}</div>
        )}
        <FormField label="Customer" type="select" value={form.customerId} onChange={(v) => setForm({ ...form, customerId: v })} required
          options={customers.map(c => ({ label: `${c.name} (${c.company || 'Individual'})`, value: c.id }))} />
        <FormField label="Product Item" type="select" value={form.productId} onChange={(v) => setForm({ ...form, productId: v, warehouseId: '' })} required
          options={products.map(p => ({ label: `${p.name} (${formatINR(p.price)})`, value: p.id }))} />
        <FormField label="Warehouse (fulfilled from)" type="select" value={form.warehouseId} onChange={(v) => setForm({ ...form, warehouseId: v })} required
          options={productWarehouseOptions} />
        {form.productId && productWarehouseOptions.length === 0 && (
          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '-10px', marginBottom: '14px' }}>
            This product has no stock at any warehouse yet — add stock from the Products page first.
          </div>
        )}
        <FormField label="Quantity" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required placeholder="1" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateOrder}>Submit Order</button>
        </div>
      </Modal>
    </div>
  );
}
