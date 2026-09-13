'use client';

import { useState, useEffect } from 'react';
import { PiggyBank, TrendingUp, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { financeApi } from '../../../services/api';
import Modal, { FormField } from '../../../components/Modal';
import { formatINR } from '../../../lib/currency';
import { formatDate } from '../../../lib/date';

const emptyForm = { department: '', planned: '', actual: '', startDate: '', endDate: '' };

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState('');

  async function fetchData() {
    try {
      const data = await financeApi.getBudgets();
      if (data && Array.isArray(data)) setBudgets(data);
    } catch (e) {
      console.error('Budgets fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAdd() {
    if (!form.department || !form.planned || !form.startDate || !form.endDate) {
      setError('Department, planned amount, start date, and end date are required.');
      return;
    }
    try {
      await financeApi.createBudget({
        department: form.department,
        planned: parseFloat(form.planned),
        actual: form.actual ? parseFloat(form.actual) : 0,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      setShowModal(false);
      setForm(emptyForm);
      setError('');
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Failed to create budget.');
    }
  }

  function openEdit(b: any) {
    setEditTarget(b);
    setEditForm({
      department: b.department,
      planned: String(b.planned ?? ''),
      actual: String(b.actual ?? ''),
      startDate: b.startDate ? b.startDate.slice(0, 10) : '',
      endDate: b.endDate ? b.endDate.slice(0, 10) : '',
    });
    setEditError('');
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.department || !editForm.planned || !editForm.startDate || !editForm.endDate) {
      setEditError('Department, planned amount, start date, and end date are required.');
      return;
    }
    try {
      await financeApi.updateBudget(editTarget.id, {
        department: editForm.department,
        planned: parseFloat(editForm.planned),
        actual: parseFloat(editForm.actual || '0'),
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: new Date(editForm.endDate).toISOString(),
      });
      setEditTarget(null);
      fetchData();
    } catch (e: any) {
      setEditError(e.message || 'Failed to save budget.');
    }
  }

  async function handleDelete(id: string, department: string) {
    if (!confirm(`Delete the budget for "${department}"? This cannot be undone.`)) return;
    try {
      await financeApi.deleteBudget(id);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete budget.');
    }
  }

  const totalPlanned = budgets.reduce((s, b) => s + (b.planned || 0), 0);
  const totalActual = budgets.reduce((s, b) => s + (b.actual || 0), 0);
  const overBudgetCount = budgets.filter(b => (b.actual || 0) > (b.planned || 0)).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p>Plan departmental spending and track actual spend against it.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setError(''); setShowModal(true); }}>
            <Plus size={16} /> New Budget
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Planned</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><PiggyBank size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(totalPlanned)}</div>
          <div className="kpi-card-trend neutral">Across {budgets.length} budget{budgets.length === 1 ? '' : 's'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Actual Spend</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(totalActual)}</div>
          <div className="kpi-card-trend neutral">Recorded actuals</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Over Budget</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><AlertTriangle size={20} /></div>
          </div>
          <div className="kpi-card-value">{overBudgetCount}</div>
          <div className="kpi-card-trend neutral">Department{overBudgetCount === 1 ? '' : 's'} exceeding plan</div>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Period</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Utilization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No budgets defined yet</td></tr>
            ) : budgets.map((b) => {
              const pct = b.planned > 0 ? Math.round(((b.actual || 0) / b.planned) * 100) : 0;
              const over = (b.actual || 0) > (b.planned || 0);
              return (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.department}</td>
                  <td>{formatDate(b.startDate)} – {formatDate(b.endDate)}</td>
                  <td>{formatINR(b.planned)}</td>
                  <td>{formatINR(b.actual || 0)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: over ? '#dc2626' : '#16a34a' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={over ? 'badge badge-critical' : 'badge badge-healthy'}>{over ? 'Over Budget' : 'On Track'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}><Pencil size={13} /></button>
                      <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(b.id, b.department)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ADD BUDGET MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Budget">
        {error && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <FormField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} required placeholder="e.g. Marketing" />
        <FormField label="Planned Amount" type="number" value={form.planned} onChange={(v) => setForm({ ...form, planned: v })} required placeholder="500000" />
        <FormField label="Actual Spend (optional)" type="number" value={form.actual} onChange={(v) => setForm({ ...form, actual: v })} placeholder="0" />
        <FormField label="Start Date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} required />
        <FormField label="End Date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} required />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Create Budget</button>
        </div>
      </Modal>

      {/* EDIT BUDGET MODAL */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Budget">
        {editError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editError}</div>}
        <FormField label="Department" value={editForm.department} onChange={(v) => setEditForm({ ...editForm, department: v })} required />
        <FormField label="Planned Amount" type="number" value={editForm.planned} onChange={(v) => setEditForm({ ...editForm, planned: v })} required />
        <FormField label="Actual Spend" type="number" value={editForm.actual} onChange={(v) => setEditForm({ ...editForm, actual: v })} />
        <FormField label="Start Date" type="date" value={editForm.startDate} onChange={(v) => setEditForm({ ...editForm, startDate: v })} required />
        <FormField label="End Date" type="date" value={editForm.endDate} onChange={(v) => setEditForm({ ...editForm, endDate: v })} required />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
