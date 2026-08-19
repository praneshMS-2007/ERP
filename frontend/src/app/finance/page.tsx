'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, CreditCard, FileText,
  Download, Plus, PieChart, ChevronLeft, ChevronRight, MoreVertical, Filter, Pencil, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { financeApi, exportApi } from '../../services/api';
import ExportButton from '../../components/ExportButton';
import Modal, { FormField } from '../../components/Modal';
import { formatINR } from '../../lib/currency';

const emptyPaymentForm = { amount: '', method: 'BANK_TRANSFER', date: new Date().toISOString().slice(0, 10) };

const emptyExpForm = { description: '', amount: '', category: '', date: '' };
const emptyInvForm = { clientName: '', amount: '', dueDate: '', description: '' };
const emptyIncomeForm = { source: '', amount: '', date: '', description: '' };

export default function FinancePage() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingInvoices: 0 });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invPage, setInvPage] = useState(0);
  const [expPage, setExpPage] = useState(0);
  const [incPage, setIncPage] = useState(0);
  const pageSize = 6;

  const [expForm, setExpForm] = useState(emptyExpForm);
  const [expError, setExpError] = useState('');
  const [editExpTarget, setEditExpTarget] = useState<any | null>(null);
  const [editExpForm, setEditExpForm] = useState(emptyExpForm);
  const [editExpError, setEditExpError] = useState('');

  const [invForm, setInvForm] = useState(emptyInvForm);
  const [invError, setInvError] = useState('');
  const [editInvTarget, setEditInvTarget] = useState<any | null>(null);
  const [editInvForm, setEditInvForm] = useState(emptyInvForm);
  const [editInvError, setEditInvError] = useState('');

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState(emptyIncomeForm);
  const [incomeError, setIncomeError] = useState('');
  const [editIncomeTarget, setEditIncomeTarget] = useState<any | null>(null);
  const [editIncomeForm, setEditIncomeForm] = useState(emptyIncomeForm);
  const [editIncomeError, setEditIncomeError] = useState('');

  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [paymentError, setPaymentError] = useState('');

  async function fetchAll() {
    try {
      const [dashMetrics, expData, invData, payData, incData] = await Promise.all([
        financeApi.getDashboardMetrics(), financeApi.getExpenses(),
        financeApi.getInvoices(), financeApi.getPayments(), financeApi.getIncomes(),
      ]);
      setMetrics(dashMetrics || { totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingInvoices: 0 });
      setExpenses(Array.isArray(expData) ? expData : []);
      setInvoices(Array.isArray(invData) ? invData : []);
      setPayments(Array.isArray(payData) ? payData : []);
      setIncomes(Array.isArray(incData) ? incData : []);
    } catch (e) { console.error('Finance error', e); }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleAddExpense() {
    if (!expForm.description || !expForm.amount) { setExpError('Description and amount are required.'); return; }
    setExpError('');
    try {
      await financeApi.createExpense({
        description: expForm.description, amount: parseFloat(expForm.amount),
        category: expForm.category || 'GENERAL',
        date: expForm.date ? new Date(expForm.date).toISOString() : new Date().toISOString(),
      });
      setShowExpenseModal(false);
      setExpForm(emptyExpForm);
      fetchAll();
    } catch (e: any) {
      setExpError(e.message || 'Could not log this expense.');
    }
  }

  function openEditExpense(exp: any) {
    setEditExpTarget(exp);
    setEditExpForm({
      description: exp.description || '', amount: String(exp.amount ?? ''),
      category: exp.category || '', date: exp.date ? exp.date.slice(0, 10) : '',
    });
    setEditExpError('');
  }

  async function handleSaveExpense() {
    if (!editExpTarget) return;
    if (!editExpForm.description || !editExpForm.amount) { setEditExpError('Description and amount are required.'); return; }
    setEditExpError('');
    try {
      await financeApi.updateExpense(editExpTarget.id, {
        description: editExpForm.description, amount: parseFloat(editExpForm.amount),
        category: editExpForm.category || 'GENERAL',
        date: editExpForm.date ? new Date(editExpForm.date).toISOString() : undefined,
      });
      setEditExpTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditExpError(e.message || 'Could not update this expense.');
    }
  }

  async function handleDeleteExpense(id: string, description: string) {
    if (!confirm(`Delete expense "${description}"? This can't be undone.`)) return;
    try {
      await financeApi.deleteExpense(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this expense.');
    }
  }

  async function handleAddInvoice() {
    if (!invForm.clientName || !invForm.amount) { setInvError('Client name and amount are required.'); return; }
    setInvError('');
    try {
      await financeApi.createInvoice({
        clientName: invForm.clientName, amount: parseFloat(invForm.amount),
        dueDate: invForm.dueDate ? new Date(invForm.dueDate).toISOString() : new Date().toISOString(),
        description: invForm.description,
      });
      setShowInvoiceModal(false);
      setInvForm(emptyInvForm);
      fetchAll();
    } catch (e: any) {
      setInvError(e.message || 'Could not create this invoice.');
    }
  }

  function openEditInvoice(inv: any) {
    setEditInvTarget(inv);
    setEditInvForm({
      clientName: inv.clientName || '', amount: String(inv.amount ?? ''),
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '', description: inv.description || '',
    });
    setEditInvError('');
  }

  async function handleSaveInvoice() {
    if (!editInvTarget) return;
    if (!editInvForm.clientName || !editInvForm.amount) { setEditInvError('Client name and amount are required.'); return; }
    setEditInvError('');
    try {
      await financeApi.updateInvoice(editInvTarget.id, {
        clientName: editInvForm.clientName, amount: parseFloat(editInvForm.amount),
        dueDate: editInvForm.dueDate ? new Date(editInvForm.dueDate).toISOString() : undefined,
        description: editInvForm.description,
      });
      setEditInvTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditInvError(e.message || 'Could not update this invoice.');
    }
  }

  async function handleDeleteInvoice(id: string, invoiceNo: string) {
    if (!confirm(`Delete invoice "${invoiceNo}"? This can't be undone.`)) return;
    try {
      await financeApi.deleteInvoice(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this invoice.');
    }
  }

  async function handleAddIncome() {
    if (!incomeForm.source || !incomeForm.amount) { setIncomeError('Source and amount are required.'); return; }
    setIncomeError('');
    try {
      await financeApi.createIncome({
        source: incomeForm.source, amount: parseFloat(incomeForm.amount),
        description: incomeForm.description,
        date: incomeForm.date ? new Date(incomeForm.date).toISOString() : new Date().toISOString(),
      });
      setShowIncomeModal(false);
      setIncomeForm(emptyIncomeForm);
      fetchAll();
    } catch (e: any) {
      setIncomeError(e.message || 'Could not log this income.');
    }
  }

  function openEditIncome(inc: any) {
    setEditIncomeTarget(inc);
    setEditIncomeForm({
      source: inc.source || '', amount: String(inc.amount ?? ''),
      date: inc.date ? inc.date.slice(0, 10) : '', description: inc.description || '',
    });
    setEditIncomeError('');
  }

  async function handleSaveIncome() {
    if (!editIncomeTarget) return;
    if (!editIncomeForm.source || !editIncomeForm.amount) { setEditIncomeError('Source and amount are required.'); return; }
    setEditIncomeError('');
    try {
      await financeApi.updateIncome(editIncomeTarget.id, {
        source: editIncomeForm.source, amount: parseFloat(editIncomeForm.amount),
        description: editIncomeForm.description,
        date: editIncomeForm.date ? new Date(editIncomeForm.date).toISOString() : undefined,
      });
      setEditIncomeTarget(null);
      fetchAll();
    } catch (e: any) {
      setEditIncomeError(e.message || 'Could not update this income.');
    }
  }

  async function handleDeleteIncome(id: string, source: string) {
    if (!confirm(`Delete income "${source}"? This can't be undone.`)) return;
    try {
      await financeApi.deleteIncome(id);
      fetchAll();
    } catch (e: any) {
      alert(e.message || 'Could not delete this income.');
    }
  }

  function openRecordPayment(inv: any) {
    const alreadyPaid = (inv.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const remaining = Math.max(0, inv.amount - alreadyPaid);
    setPaymentTarget(inv);
    setPaymentForm({ ...emptyPaymentForm, amount: String(remaining) });
    setPaymentError('');
  }

  async function handleRecordPayment() {
    if (!paymentTarget) return;
    const amount = parseFloat(paymentForm.amount || '0');
    if (!amount || amount <= 0) { setPaymentError('Enter an amount greater than zero.'); return; }
    setPaymentError('');
    try {
      await financeApi.createPayment({
        invoiceId: paymentTarget.id,
        amount,
        method: paymentForm.method,
        date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
      });
      setPaymentTarget(null);
      fetchAll();
    } catch (e: any) {
      setPaymentError(e.message || 'Could not record this payment.');
    }
  }

  const badgeClass = (s: string) => {
    const map: Record<string, string> = {
      'PAID': 'badge badge-healthy', 'PENDING': 'badge badge-warning',
      'UNPAID': 'badge badge-warning', 'OVERDUE': 'badge badge-critical',
      'APPROVED': 'badge badge-healthy', 'REJECTED': 'badge badge-critical',
    };
    return map[s] || 'badge';
  };


  const invTotalPages = Math.ceil(invoices.length / pageSize);
  const paginatedInv = invoices.slice(invPage * pageSize, (invPage + 1) * pageSize);
  const expTotalPages = Math.ceil(expenses.length / pageSize);
  const paginatedExp = expenses.slice(expPage * pageSize, (expPage + 1) * pageSize);
  const incTotalPages = Math.ceil(incomes.length / pageSize);
  const paginatedInc = incomes.slice(incPage * pageSize, (incPage + 1) * pageSize);

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
          <div className="kpi-card-value">{formatINR(metrics.totalRevenue)}</div>
          <div className="kpi-card-trend up"><TrendingUp size={14} /> Live from database</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Expenses</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><TrendingDown size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(metrics.totalExpenses)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Net Profit</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><PieChart size={20} /></div>
          </div>
          <div className="kpi-card-value" style={{ color: metrics.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{formatINR(metrics.netProfit)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Outstanding Invoices</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><FileText size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(metrics.outstandingInvoices)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Invoices Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Invoices ({invoices.length})</h3>
          </div>
          <table className="data-table">
            <thead><tr><th>Invoice No</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {paginatedInv.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No invoices yet</td></tr>
              ) : paginatedInv.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>{inv.invoiceNo}</td>
                  <td>{inv.clientName}</td>
                  <td style={{ fontWeight: 600 }}>{formatINR(inv.amount)}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td><span className={badgeClass(inv.status)}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {inv.status !== 'PAID' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openRecordPayment(inv)}>Record Payment</button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditInvoice(inv)}><Pencil size={13} /></button>
                      <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNo)}><Trash2 size={13} /></button>
                    </div>
                  </td>
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
                {/* Every Payment here is against an invoice — always money received, never an outgoing payment (that's what Expenses are for) */}
                <div className="timeline-dot" style={{ background: '#16a34a' }} />
                <div className="timeline-title">Payment Received{pay.invoice?.invoiceNo ? ` — ${pay.invoice.invoiceNo}` : ''}</div>
                <div className="timeline-desc">{pay.invoice?.clientName || 'Unknown client'} · {pay.method?.replace('_', ' ')} — {formatINR(pay.amount)}</div>
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
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {paginatedExp.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No expenses recorded</td></tr>
            ) : paginatedExp.map((exp) => (
              <tr key={exp.id}>
                <td>{new Date(exp.date).toLocaleDateString()}</td>
                <td>{exp.description}</td>
                <td><span style={{ fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#4b5563' }}>{exp.category}</span></td>
                <td style={{ fontWeight: 600 }}>{formatINR(exp.amount)}</td>
                <td><span className={badgeClass(exp.status)}>{exp.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditExpense(exp)}><Pencil size={13} /></button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteExpense(exp.id, exp.description)}><Trash2 size={13} /></button>
                  </div>
                </td>
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

      {/* Income Tracking */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Income Tracking ({incomes.length})</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => { setIncomeError(''); setIncomeForm(emptyIncomeForm); setShowIncomeModal(true); }}>Log Income</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Date</th><th>Source</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {paginatedInc.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No income recorded</td></tr>
            ) : paginatedInc.map((inc) => (
              <tr key={inc.id}>
                <td>{new Date(inc.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600 }}>{inc.source}</td>
                <td>{inc.description || '—'}</td>
                <td style={{ fontWeight: 600, color: '#16a34a' }}>{formatINR(inc.amount)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditIncome(inc)}><Pencil size={13} /></button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteIncome(inc.id, inc.source)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {incTotalPages > 1 && (
          <div className="pagination">
            <span>{incPage * pageSize + 1}–{Math.min((incPage + 1) * pageSize, incomes.length)} of {incomes.length}</span>
            <div className="pagination-buttons">
              <button className="pagination-btn" disabled={incPage === 0} onClick={() => setIncPage(p => p - 1)}><ChevronLeft size={14} /></button>
              <button className="pagination-btn" disabled={incPage >= incTotalPages - 1} onClick={() => setIncPage(p => p + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Log New Expense">
        {expError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{expError}</div>}
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

      {/* EDIT EXPENSE MODAL */}
      <Modal isOpen={!!editExpTarget} onClose={() => setEditExpTarget(null)} title="Edit Expense">
        {editExpError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editExpError}</div>}
        <FormField label="Description" value={editExpForm.description} onChange={(v) => setEditExpForm({ ...editExpForm, description: v })} required />
        <FormField label="Amount" type="number" value={editExpForm.amount} onChange={(v) => setEditExpForm({ ...editExpForm, amount: v })} required />
        <FormField label="Category" type="select" value={editExpForm.category} onChange={(v) => setEditExpForm({ ...editExpForm, category: v })}
          options={[
            { label: 'General', value: 'GENERAL' }, { label: 'Payroll', value: 'PAYROLL' },
            { label: 'Operations', value: 'OPERATIONS' }, { label: 'Marketing', value: 'MARKETING' },
            { label: 'IT & Software', value: 'IT_SOFTWARE' }, { label: 'Travel', value: 'TRAVEL' },
            { label: 'Utilities', value: 'UTILITIES' },
          ]} />
        <FormField label="Date" type="date" value={editExpForm.date} onChange={(v) => setEditExpForm({ ...editExpForm, date: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditExpTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveExpense}>Save</button>
        </div>
      </Modal>

      {/* ADD INVOICE MODAL */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Create New Invoice">
        {invError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{invError}</div>}
        <FormField label="Client Name" value={invForm.clientName} onChange={(v) => setInvForm({ ...invForm, clientName: v })} required placeholder="Acme Corp" />
        <FormField label="Amount" type="number" value={invForm.amount} onChange={(v) => setInvForm({ ...invForm, amount: v })} required placeholder="15000" />
        <FormField label="Due Date" type="date" value={invForm.dueDate} onChange={(v) => setInvForm({ ...invForm, dueDate: v })} />
        <FormField label="Description" type="textarea" value={invForm.description} onChange={(v) => setInvForm({ ...invForm, description: v })} placeholder="Services rendered..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddInvoice}>Create Invoice</button>
        </div>
      </Modal>

      {/* EDIT INVOICE MODAL */}
      <Modal isOpen={!!editInvTarget} onClose={() => setEditInvTarget(null)} title={`Edit Invoice — ${editInvTarget?.invoiceNo || ''}`}>
        {editInvError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editInvError}</div>}
        <FormField label="Client Name" value={editInvForm.clientName} onChange={(v) => setEditInvForm({ ...editInvForm, clientName: v })} required />
        <FormField label="Amount" type="number" value={editInvForm.amount} onChange={(v) => setEditInvForm({ ...editInvForm, amount: v })} required />
        <FormField label="Due Date" type="date" value={editInvForm.dueDate} onChange={(v) => setEditInvForm({ ...editInvForm, dueDate: v })} />
        <FormField label="Description" type="textarea" value={editInvForm.description} onChange={(v) => setEditInvForm({ ...editInvForm, description: v })} />
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
          Status isn't editable here — it only changes via Record Payment, so it always reflects what's actually been paid.
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditInvTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveInvoice}>Save</button>
        </div>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal isOpen={!!paymentTarget} onClose={() => setPaymentTarget(null)} title={`Record Payment — ${paymentTarget?.invoiceNo || ''}`} width="420px">
        {paymentError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{paymentError}</div>}
        <FormField label="Amount" type="number" value={paymentForm.amount} onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })} required placeholder="15000" />
        <FormField label="Method" type="select" value={paymentForm.method} onChange={(v) => setPaymentForm({ ...paymentForm, method: v })}
          options={[
            { label: 'Bank Transfer', value: 'BANK_TRANSFER' }, { label: 'Credit Card', value: 'CREDIT_CARD' },
            { label: 'Cash', value: 'CASH' }, { label: 'Check', value: 'CHECK' },
            { label: 'Stripe', value: 'STRIPE' }, { label: 'PayPal', value: 'PAYPAL' },
          ]} />
        <FormField label="Date" type="date" value={paymentForm.date} onChange={(v) => setPaymentForm({ ...paymentForm, date: v })} required />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setPaymentTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRecordPayment}>Record Payment</button>
        </div>
      </Modal>

      {/* ADD INCOME MODAL */}
      <Modal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} title="Log New Income">
        {incomeError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{incomeError}</div>}
        <FormField label="Source" value={incomeForm.source} onChange={(v) => setIncomeForm({ ...incomeForm, source: v })} required placeholder="e.g. Consulting Retainer" />
        <FormField label="Amount" type="number" value={incomeForm.amount} onChange={(v) => setIncomeForm({ ...incomeForm, amount: v })} required placeholder="10000" />
        <FormField label="Date" type="date" value={incomeForm.date} onChange={(v) => setIncomeForm({ ...incomeForm, date: v })} />
        <FormField label="Description" type="textarea" value={incomeForm.description} onChange={(v) => setIncomeForm({ ...incomeForm, description: v })} placeholder="Optional detail..." />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowIncomeModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddIncome}>Log Income</button>
        </div>
      </Modal>

      {/* EDIT INCOME MODAL */}
      <Modal isOpen={!!editIncomeTarget} onClose={() => setEditIncomeTarget(null)} title="Edit Income">
        {editIncomeError && <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{editIncomeError}</div>}
        <FormField label="Source" value={editIncomeForm.source} onChange={(v) => setEditIncomeForm({ ...editIncomeForm, source: v })} required />
        <FormField label="Amount" type="number" value={editIncomeForm.amount} onChange={(v) => setEditIncomeForm({ ...editIncomeForm, amount: v })} required />
        <FormField label="Date" type="date" value={editIncomeForm.date} onChange={(v) => setEditIncomeForm({ ...editIncomeForm, date: v })} />
        <FormField label="Description" type="textarea" value={editIncomeForm.description} onChange={(v) => setEditIncomeForm({ ...editIncomeForm, description: v })} />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setEditIncomeTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveIncome}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
