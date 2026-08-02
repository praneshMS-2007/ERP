'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, FileText,
  Download, Plus, PieChart, ChevronLeft, ChevronRight, MoreVertical, Filter
} from 'lucide-react';
import Link from 'next/link';
import { financeApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';

export default function FinancePage() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingInvoices: 0 });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invPage, setInvPage] = useState(0);
  const [expPage, setExpPage] = useState(0);
  const pageSize = 6;

  const [expForm, setExpForm] = useState({ description: '', amount: '', category: '', date: '' });
  const [invForm, setInvForm] = useState({ clientName: '', amount: '', dueDate: '', description: '' });

  async function fetchAll() {
    try {
      const [dashMetrics, expData, invData, payData] = await Promise.all([
        financeApi.getDashboardMetrics(), financeApi.getExpenses(),
        financeApi.getInvoices(), financeApi.getPayments(),
      ]);
      setMetrics(dashMetrics || { totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingInvoices: 0 });
      setExpenses(Array.isArray(expData) ? expData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
    } catch (e) { console.error('Finance error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleAddExpense() {
    if (!expForm.description || !expForm.amount) return;
    await financeApi.createExpense({
      description: expForm.description, amount: parseFloat(expForm.amount),
      category: expForm.category || 'GENERAL',
      date: expForm.date ? new Date(expForm.date).toISOString() : new Date().toISOString(),
    });
    setShowExpenseModal(false);
    setExpForm({ description: '', amount: '', category: '', date: '' });
    fetchAll();
  }

  async function handleAddInvoice() {
    if (!invForm.clientName || !invForm.amount) return;
    await financeApi.createInvoice({
      clientName: invForm.clientName, amount: parseFloat(invForm.amount),
      dueDate: invForm.dueDate ? new Date(invForm.dueDate).toISOString() : new Date().toISOString(),
      description: invForm.description,
    });
    setShowInvoiceModal(false);
    setInvForm({ clientName: '', amount: '', dueDate: '', description: '' });
    fetchAll();
  }

  const badgeClass = (s: string) => {
    const map: Record<string, string> = {
      'PAID': 'badge badge-healthy', 'PENDING': 'badge badge-warning',
      'UNPAID': 'badge badge-warning', 'OVERDUE': 'badge badge-critical',
      'APPROVED': 'badge badge-healthy', 'REJECTED': 'badge badge-critical',
    };
    return map[s] || 'badge';
  };

  const formatCurrency = (val: number) => '$' + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const invTotalPages = Math.ceil(invoices.length / pageSize);
  const paginatedInv = invoices.slice(invPage * pageSize, (invPage + 1) * pageSize);
  const expTotalPages = Math.ceil(expenses.length / pageSize);
  const paginatedExp = expenses.slice(expPage * pageSize, (expPage + 1) * pageSize);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Finance & Accounting</h1>
          <p>Real-time financial health, expense tracking, and invoicing.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportExpenses(format)} label="Export Report" />
          <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(true)}>
            <FileText size={16} /> New Invoice
          </button>
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>
            <Plus size={16} /> New Expense
          </button>
        </div>
      </div>

      {/* KPI Grid — LIVE */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Revenue</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatCurrency(metrics.totalRevenue)}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> Live from database</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Expenses</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><TrendingDown size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatCurrency(metrics.totalExpenses)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Net Profit</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><PieChart size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: metrics.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(metrics.netProfit)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Outstanding Invoices</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><FileText size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatCurrency(metrics.outstandingInvoices)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Invoices Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Invoices ({invoices.length})</h3>
          </div>
          <table className="data-table">
            <thead><tr><th>Invoice No</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              {paginatedInv.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No invoices yet</td></tr>
              ) : paginatedInv.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{inv.invoiceNo}</td>
                  <td>{inv.clientName}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td><span className={badgeClass(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {invTotalPages > 1 && (
            <div className="pagination">
              <span>{invPage * pageSize + 1}–{Math.min((invPage + 1) * pageSize, invoices.length)} of {invoices.length}</span>
              <div className="pagination-buttons">
                <button className="pagination-btn" disabled={invPage === 0} onClick={() => setInvPage(p => p - 1)}><ChevronLeft size={14} /></button>
                <button className="pagination-btn" disabled={invPage >= invTotalPages - 1} onClick={() => setInvPage(p => p + 1)}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Activity — LIVE */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Payment Activity</h3>
          <div className="timeline">
            {payments.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No payment records</div>
            ) : payments.slice(0, 5).map((pay, i) => (
              <div key={pay.id || i} className="timeline-item">
                <div className="timeline-dot" style={{ background: pay.type === 'INCOME' ? '#16a34a' : '#dc2626' }} />
                <div className="timeline-title">{pay.type === 'INCOME' ? 'Payment Received' : 'Payment Made'}</div>
                <div className="timeline-desc">{pay.description || 'Transaction'} — {formatCurrency(pay.amount)}</div>
                <div className="timeline-time">{new Date(pay.date || pay.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', paddingTop: '12px' }}>
            <Link href="/finance/ledger" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center', textTransform: 'uppercase', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
              View Ledger
            </Link>
          </div>
        </div>
      </div>

      {/* Expense Tracking */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Expense Tracking ({expenses.length})</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowExpenseModal(true)}>Log Expense</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {paginatedExp.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No expenses recorded</td></tr>
            ) : paginatedExp.map((exp) => (
              <tr key={exp.id}>
                <td>{new Date(exp.date).toLocaleDateString()}</td>
                <td>{exp.description}</td>
                <td><span style={{ fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#4b5563' }}>{exp.category}</span></td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                <td><span className={badgeClass(exp.status)}>{exp.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {expTotalPages > 1 && (
          <div className="pagination">
            <span>{expPage * pageSize + 1}–{Math.min((expPage + 1) * pageSize, expenses.length)} of {expenses.length}</span>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={expPage === 0} onClick={() => setExpPage(p => p - 1)}><ChevronLeft size={14} /></button>
              <button className="pagination-btn" disabled={expPage >= expTotalPages - 1} onClick={() => setExpPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Log New Expense">
        <FormField label="Description" value={expForm.description} onChange={(v) => setExpForm({ ...expForm, description: v })} required placeholder="e.g. Office Supplies" />
        <FormField label="Amount" type="number" value={expForm.amount} onChange={(v) => setExpForm({ ...expForm, amount: v })} required placeholder="500" />
        <FormField label="Category" type="select" value={expForm.category} onChange={(v) => setExpForm({ ...expForm, category: v })}
          options={[
            { label: 'General', value: 'GENERAL' }, { label: 'Payroll', value: 'PAYROLL' },
            { label: 'Operations', value: 'OPERATIONS' }, { label: 'Marketing', value: 'MARKETING' },
            { label: 'IT & Software', value: 'IT_SOFTWARE' }, { label: 'Travel', value: 'TRAVEL' },
            { label: 'Utilities', value: 'UTILITIES' },
          ]} />
        <FormField label="Date" type="date" value={expForm.date} onChange={(v) => setExpForm({ ...expForm, date: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddExpense}>Log Expense</button>
        </div>
      </Modal>

      {/* ADD INVOICE MODAL */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Create New Invoice">
        <FormField label="Client Name" value={invForm.clientName} onChange={(v) => setInvForm({ ...invForm, clientName: v })} required placeholder="Acme Corp" />
        <FormField label="Amount" type="number" value={invForm.amount} onChange={(v) => setInvForm({ ...invForm, amount: v })} required placeholder="15000" />
        <FormField label="Due Date" type="date" value={invForm.dueDate} onChange={(v) => setInvForm({ ...invForm, dueDate: v })} />
        <FormField label="Description" type="textarea" value={invForm.description} onChange={(v) => setInvForm({ ...invForm, description: v })} placeholder="Services rendered..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddInvoice}>Create Invoice</button>
        </div>
      </Modal>
    </div>
  );
}
