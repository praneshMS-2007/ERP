'use client';

import React from 'react';
import Link from 'next/link';

export default function StockAlerts() {
  // Preloaded low-stock alerts
  const alerts = [
    { id: 1, sku: 'PROD-002', name: 'USB-C Hub', category: 'Accessories', stockLevel: 23, minStockLevel: 30, unit: 'pcs', severity: 'Warning' },
    { id: 2, sku: 'PROD-004', name: 'Webcam HD', category: 'Electronics', stockLevel: 12, minStockLevel: 25, unit: 'pcs', severity: 'Critical' },
    { id: 3, sku: 'PROD-007', name: 'Ethernet Cable 5m', category: 'Networking', stockLevel: 8, minStockLevel: 50, unit: 'pcs', severity: 'Critical' },
    { id: 4, sku: 'PROD-011', name: 'Mouse Pad XL', category: 'Accessories', stockLevel: 15, minStockLevel: 20, unit: 'pcs', severity: 'Warning' },
  ];

  const sevColor = (s: string) => s === 'Critical' ? 'var(--red)' : 'var(--amber)';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock Alerts</h1>
          <p>Products below minimum stock threshold</p>
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
                <td style={{fontWeight: 600, color: 'var(--red)'}}>{a.stockLevel} {a.unit}</td>
                <td>{a.minStockLevel} {a.unit}</td>
                <td>
                  <span className="badge" style={{ color: sevColor(a.severity), backgroundColor: `${sevColor(a.severity)}15` }}>{a.severity}</span>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm">Reorder</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
