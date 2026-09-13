'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, ArrowUpRight, ArrowDownRight, Briefcase, Plus, Filter, Landmark, CheckCircle, Clock } from 'lucide-react';
import { financeApi, exportApi } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';
import Modal, { FormField } from '../../../components/Modal';
import { formatINR } from '../../../lib/currency';
import { formatDate } from '../../../lib/date';

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'taxes'>('ledger');
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [taxRecords, setTaxRecords] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: '', accountCode: '1010-CASH', type: 'DEBIT', amount: '' });

  async function fetchData() {
    try {
      const [ledgerData, taxData] = await Promise.all([
        financeApi.getLedgerEntries(),
        financeApi.getTaxRecords()
      ]);
      if (ledgerData && Array.isArray(ledgerData)) setLedgerEntries(ledgerData);
      if (taxData && Array.isArray(taxData)) setTaxRecords(taxData);
    } catch (e) {
      console.error('Ledger fetch error', e);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAddEntry() {
    if (!form.description || !form.amount) return;
    await financeApi.createLedgerEntry({
      description: form.description,
      accountCode: form.accountCode,
      type: form.type,
      amount: parseFloat(form.amount),
    });
    setShowModal(false);
    setForm({ description: '', accountCode: '1010-CASH', type: 'DEBIT', amount: '' });
    fetchData();
  }

  const totalCredits = ledgerEntries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + (e.amount || 0), 0);
  const totalDebits = ledgerEntries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + (e.amount || 0), 0);
  const pendingTax = taxRecords.filter(t => t.status === 'UNPAID' || t.status === 'PENDING').reduce((s, t) => s + (t.amount || 0), 0);


  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>General Ledger & Taxes</h1>
          <p>Track double-entry accounting records and manage corporate tax liabilities.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportLedger(format)} label="Export Ledger" />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Manual Entry
          </button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Credits</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Landmark size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(totalCredits)}</div>
          <div className="kpi-card-trend up">Total credit movements</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Debits</div>
            <div className="kpi-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Briefcase size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(totalDebits)}</div>
          <div className="kpi-card-trend down">Total debit movements</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Pending Tax Liability</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><FileText size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatINR(pendingTax)}</div>
          <div className="kpi-card-trend neutral">Unpaid tax records</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('ledger')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'ledger' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'ledger' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
        >
          General Ledger ({ledgerEntries.length})
        </button>
        <button 
          onClick={() => setActiveTab('taxes')}
          style={{ padding: '0 0 12px 0', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, color: activeTab === 'taxes' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'taxes' ? '2px solid var(--color-primary)' : '2px solid transparent' }}
        >
          Tax Management ({taxRecords.length})
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Journal Entries</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Credit</th>
                <th>Debit</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No journal entries recorded</td></tr>
              ) : ledgerEntries.map((entry, i) => (
                <tr key={entry.id || i}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{entry.entryNumber || `JE-${i+101}`}</td>
                  <td>{formatDate(entry.date || entry.createdAt)}</td>
                  <td>{entry.description}</td>
                  <td><span className="badge badge-default">{entry.accountCode}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {entry.type === 'CREDIT' ? formatINR(entry.amount) : '-'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
                    {entry.type === 'DEBIT' ? formatINR(entry.amount) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Tax Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {taxRecords.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No tax records found</td></tr>
              ) : taxRecords.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{t.period}</td>
                  <td>{t.type}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(t.amount)}</td>
                  <td>{formatDate(t.dueDate, 'N/A')}</td>
                  <td>
                    <span className={t.status === 'PAID' ? 'badge badge-healthy' : 'badge badge-warning'}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MANUAL ENTRY MODAL */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Journal Entry">
        <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} required placeholder="e.g. Asset Purchase" />
        <FormField label="Account Code" type="select" value={form.accountCode} onChange={(v) => setForm({ ...form, accountCode: v })}
          options={[
            { label: '1010 - CASH & BANK', value: '1010-CASH' },
            { label: '1200 - ACCOUNTS RECEIVABLE', value: '1200-AR' },
            { label: '2010 - ACCOUNTS PAYABLE', value: '2010-AP' },
            { label: '4000 - SALES REVENUE', value: '4000-REV' },
            { label: '5000 - OPERATING EXPENSES', value: '5000-EXP' },
          ]} />
        <FormField label="Entry Type" type="select" value={form.type} onChange={(v) => setForm({ ...form, type: v })}
          options={[{ label: 'DEBIT', value: 'DEBIT' }, { label: 'CREDIT', value: 'CREDIT' }]} />
        <FormField label="Amount" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required placeholder="1250" />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddEntry}>Create Entry</button>
        </div>
      </Modal>
    </div>
  );
}
