'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Download,
  Plus,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { inventoryApi } from '../../services/api';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStockValue: 0,
    lowStockCount: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodData] = await Promise.all([
          inventoryApi.getProducts(),
        ]);

        let inStockValue = 0;
        let lowStockCount = 0;

        const formattedProducts = prodData.map((p: any) => {
          inStockValue += (p.price || 0) * (p.stockLevel || 0);
          
          let status = 'HEALTHY';
          if (p.stockLevel <= p.minStockLevel) {
            status = 'CRITICAL';
            lowStockCount++;
          } else if (p.stockLevel <= p.minStockLevel * 2) {
            status = 'WARNING';
          }

          return {
            icon: p.category === 'Electronics' ? '⊕' : p.category === 'Networking' ? '⬡' : '▣',
            name: p.name,
            sku: p.sku,
            category: p.category,
            qty: p.stockLevel,
            status,
          };
        });

        setStats({
          totalProducts: prodData.length,
          inStockValue,
          lowStockCount,
          pendingOrders: 156, // Mock for now until PO endpoint returns data
        });

        setProducts(formattedProducts);
      } catch (e) {
        console.error('Failed to fetch inventory data:', e);
      }
    }
    fetchData();
  }, []);

  const badgeClass = (s: string) => {
    if (s === 'HEALTHY') return 'badge badge-healthy';
    if (s === 'CRITICAL') return 'badge badge-critical';
    if (s === 'WARNING') return 'badge badge-warning';
    return 'badge';
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Real-time oversight of global stock and procurement cycles.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><Download size={16} /> Export Report</button>
          <button className="btn btn-primary"><Plus size={16} /> New Purchase Order</button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Products</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Package size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.totalProducts}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> +4.2% from last month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">In-Stock Value</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={20} /></div>
          </div>
          <div className="kpi-card-value">${(stats.inStockValue / 1000).toFixed(1)}K</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>Updated 2m ago</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Low Stock SKU</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertTriangle size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: '#dc2626' }}>{stats.lowStockCount}</div>
          <div className="kpi-card-trend down">Action required immediately</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Pending Orders</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><ShoppingCart size={20} /></div>
          </div>
          <div className="kpi-card-value">{stats.pendingOrders}</div>
          <div className="kpi-card-trend neutral" style={{color: 'var(--color-text-muted)'}}>Avg. process time: 1.4 days</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Live Inventory Status */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Live Inventory Status</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Filter size={16} /></button>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><MoreVertical size={16} /></button>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>QTY</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading or no data...</td></tr>
              ) : products.slice(0, 5).map((p, i) => (
                <tr key={i}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar" style={{ background: '#eff6ff', color: '#2563eb', fontSize: '16px' }}>{p.icon}</div>
                      <div className="employee-name">{p.name}</div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.sku}</td>
                  <td>{p.category}</td>
                  <td style={{ fontWeight: 700, color: p.status === 'CRITICAL' ? '#dc2626' : p.status === 'WARNING' ? '#d97706' : 'inherit' }}>{p.qty?.toLocaleString()}</td>
                  <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>Showing {Math.min(5, products.length)} of {products.length} products</span>
            <div className="pagination-buttons">
              <button className="pagination-btn"><ChevronLeft size={14} /></button>
              <button className="pagination-btn"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Stock Movement Timeline */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Stock Movement</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot" style={{ background: '#16a34a' }} />
                <div className="timeline-title">Shipment Received</div>
                <div className="timeline-desc">500 units of Neural Core X1</div>
                <div className="timeline-time">Today, 09:12 AM</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot" style={{ background: '#2563eb' }} />
                <div className="timeline-title">Internal Transfer</div>
                <div className="timeline-desc">20 units sent to Berlin Site</div>
                <div className="timeline-time">Today, 07:45 AM</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot" style={{ background: '#dc2626' }} />
                <div className="timeline-title">Cycle Count Mismatch</div>
                <div className="timeline-desc">-2 units of Fiber Optic</div>
                <div className="timeline-time">Yesterday, 11:30 PM</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', paddingTop: '12px' }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>View Full Log</button>
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#d97706' }} /> Stock Alerts
            </h3>
            {products.filter(p => p.status === 'CRITICAL' || p.status === 'WARNING').slice(0, 2).map((p, i) => (
              <div key={i} className={`stock-alert-item ${p.status === 'CRITICAL' ? 'critical' : ''}`}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: p.status === 'CRITICAL' ? '#dc2626' : '#d97706' }}>{p.qty} units remaining</div>
                </div>
                <button className={`btn btn-sm ${p.status === 'CRITICAL' ? 'btn-danger' : 'btn-secondary'}`}>Order Now</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Purchase Orders */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Active Purchase Orders</h3>
          <button className="btn btn-secondary btn-sm" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 700 }}>Manage Suppliers</button>
        </div>
        <div className="po-grid">
          {[
            { id: 'PO-2024-889', status: 'IN TRANSIT', statusCls: 'badge-in-transit', company: 'Global Tech Supply Inc.', detail: 'Neural Core Components (x400)', progress: 75, footer: 'Estimated Arrival: Oct 24' },
            { id: 'PO-2024-912', status: 'PENDING', statusCls: 'badge-pending', company: 'Optic Flow Solutions', detail: 'Fiber Optic Cabling (x2000)', progress: 25, footer: 'Awaiting Supplier Approval' },
            { id: 'PO-2024-925', status: 'APPROVED', statusCls: 'badge-approved', company: 'Nexus Power Systems', detail: 'Solid State Batteries (x150)', progress: 50, footer: 'Order Processed' },
          ].map((po) => (
            <div key={po.id} className="po-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="po-card-id">{po.id}</div>
                <span className={`badge ${po.statusCls}`}>{po.status}</span>
              </div>
              <div className="po-card-company">{po.company}</div>
              <div className="po-card-detail">{po.detail}</div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${po.progress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div className="po-card-footer">{po.footer}</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{po.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI FAB */}
      <button className="ai-fab" aria-label="AI Assistant"><Bot size={24} /></button>
    </div>
  );
}
