'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { inventoryApi } from '../../../services/api';

export default function StockAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  async function loadStockAlerts() {
    setLoading(true);
    try {
      const [alertData, suppData] = await Promise.all([
        inventoryApi.getStockAlerts(),
        inventoryApi.getSuppliers(),
      ]);
      if (Array.isArray(alertData)) setAlerts(alertData);
      if (Array.isArray(suppData)) setSuppliers(suppData);
    } catch (e) {
      console.error('Failed to load stock alerts', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStockAlerts();
  }, []);

  async function handleReorder(item: any) {
    const suppId = suppliers.length > 0 ? suppliers[0].id : null;
    if (!suppId) {
      alert('Please create a Supplier first before placing a Purchase Order.');
      return;
    }

    try {
      const quantity = Math.max( item.minStockLevel * 2 - item.stockLevel, 20 );
      await inventoryApi.createPurchaseOrder({
        supplierId: suppId,
        productId: item.id,
        quantity,
        orderDate: new Date().toISOString(),
        status: 'ORDERED',
      });
      setReorderedId(item.id);
      setTimeout(() => setReorderedId(null), 3000);
      loadStockAlerts();
    } catch (e) {
      console.error('Reorder error', e);
    }
  }

  const sevColor = (s: string) => s === 'Critical' ? 'var(--red)' : 'var(--amber)';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock Alerts</h1>
          <p>Products below minimum stock threshold (Live PostgreSQL Audit)</p>
        </div>
        <div className="page-actions">
          <Link href="/inventory" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Inventory
          </Link>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{color: 'var(--red)', marginRight: '8px', verticalAlign: 'middle'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Low Stock Items ({alerts.length})
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live stock alerts...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--green)' }}>✓ All product stock levels are healthy!</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Required</th>
                <th>Severity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{a.sku}</td>
                  <td style={{fontWeight: 600}}>{a.name}</td>
                  <td>{a.category}</td>
                  <td style={{fontWeight: 600, color: 'var(--red)'}}>{a.stockLevel} {a.unit || 'pcs'}</td>
                  <td>{a.minStockLevel} {a.unit || 'pcs'}</td>
                  <td>
                    <span className="badge" style={{ color: sevColor(a.severity), backgroundColor: `${sevColor(a.severity)}15` }}>{a.severity}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleReorder(a)}
                      disabled={reorderedId === a.id}
                    >
                      {reorderedId === a.id ? 'PO Generated ✓' : 'Reorder'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
