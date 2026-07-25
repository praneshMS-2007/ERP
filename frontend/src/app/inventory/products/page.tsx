'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { inventoryApi } from '@/services/api';

export default function InventoryProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await inventoryApi.getProducts();
        setProducts(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Preloaded demo data in case backend returns empty
  const demoProducts = products.length > 0 ? products : [
    { id: 1, sku: 'PROD-001', name: 'Wireless Keyboard', category: 'Electronics', stockLevel: 145, minStockLevel: 50, unit: 'pcs', price: 49.99 },
    { id: 2, sku: 'PROD-002', name: 'USB-C Hub', category: 'Accessories', stockLevel: 23, minStockLevel: 30, unit: 'pcs', price: 34.99 },
    { id: 3, sku: 'PROD-003', name: 'Monitor Stand', category: 'Furniture', stockLevel: 87, minStockLevel: 20, unit: 'pcs', price: 79.99 },
    { id: 4, sku: 'PROD-004', name: 'Webcam HD', category: 'Electronics', stockLevel: 12, minStockLevel: 25, unit: 'pcs', price: 59.99 },
    { id: 5, sku: 'PROD-005', name: 'Desk Lamp LED', category: 'Furniture', stockLevel: 200, minStockLevel: 40, unit: 'pcs', price: 29.99 },
  ];

  const filtered = demoProducts.filter((p: any) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>Manage product catalog and stock levels</p>
        </div>
        <div className="page-actions">
          <Link href="/inventory" className="btn btn-secondary btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{marginRight: '4px'}}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Inventory
          </Link>
          <button className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <div className="table-card fade-in">
        <div className="table-toolbar">
          <div className="table-title">All Products ({filtered.length})</div>
          <div className="table-controls">
            <div className="tbl-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '30px', color: 'var(--text-muted)'}}>No products found</td></tr>
            ) : (
              filtered.map((p: any) => {
                const isLowStock = (p.stockLevel || 0) < (p.minStockLevel || 30);
                return (
                  <tr key={p.id}>
                    <td style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{p.sku}</td>
                    <td style={{fontWeight: 600}}>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      <span className="badge" style={{ color: isLowStock ? 'var(--red)' : 'var(--green)', backgroundColor: isLowStock ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
                        {p.stockLevel} {p.unit || 'pcs'}
                      </span>
                    </td>
                    <td style={{fontWeight: 600}}>${p.price}</td>
                    <td>
                      <div className="action-btns">
                        <button className="act-btn act-edit" title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="act-btn act-delete" title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
