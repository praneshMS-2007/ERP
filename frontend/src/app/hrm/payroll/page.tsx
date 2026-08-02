'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, Clock, DollarSign, Filter, MoreHorizontal, Plus, Check } from 'lucide-react';
import { hrmApi, exportApi } from '../../../services/api';
import ExportButton from '../../../components/ExportButton';
import Modal, { FormField } from '../../../components/Modal';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showRunModal, setShowRunModal] = useState(false);
  const [form, setForm] = useState({ employeeId: '', baseSalary: '', bonus: '', deductions: '' });

  async function fetchAll() {
    const [payData, empData] = await Promise.all([hrmApi.getPayrolls(), hrmApi.getEmployees()]);
    setPayrolls(Array.isArray(payData) ? payData : []);
    setEmployees(Array.isArray(empData) ? empData : []);
  }

  useEffect(() => { fetchAll(); }, []);

  const totalDisbursed = payrolls.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.netPay || 0), 0);
  const pendingTotal = payrolls.filter(p => p.status === 'PROCESSING' || p.status === 'PENDING').reduce((s, p) => s + (p.netPay || 0), 0);
  const pendingCount = payrolls.filter(p => p.status === 'PROCESSING' || p.status === 'PENDING').length;

  async function handleRunPayroll() {
    if (!form.employeeId || !form.baseSalary) return;
    await hrmApi.createPayroll({
      employeeId: form.employeeId,
      baseSalary: parseFloat(form.baseSalary),
      bonus: parseFloat(form.bonus || '0'),
      deductions: parseFloat(form.deductions || '0'),
    });
    setShowRunModal(false);
    setForm({ employeeId: '', baseSalary: '', bonus: '', deductions: '' });
    fetchAll();
  }

  async function handleMarkPaid(id: string) {
    await hrmApi.updatePayrollStatus(id, 'PAID');
    fetchAll();
  }

  const badgeClass = (s: string) => {
    if (s === 'PAID') return 'badge badge-healthy';
    if (s === 'PROCESSING') return 'badge badge-warning';
    return 'badge';
  };

  const formatCurrency = (n: number) => '$' + n.toLocaleString();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Payroll Management</h1>
          <p>Process salary disbursements, generate payslips, and manage deductions.</p>
        </div>
        <div className="page-header-actions">
          <ExportButton onExport={(format) => exportApi.exportEmployees(format)} label="Export CSV" />
          <button className="btn btn-primary" onClick={() => setShowRunModal(true)}>
            <Plus size={16} /> Run Payroll
          </button>
        </div>
      </div>

      {/* KPI Grid — LIVE */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Disbursed</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><DollarSign size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatCurrency(totalDisbursed)}</div>
          <div className="kpi-card-trend up">Paid payrolls</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Pending Processing</div>
            <div className="kpi-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={20} /></div>
          </div>
          <div className="kpi-card-value">{formatCurrency(pendingTotal)}</div>
          <div className="kpi-card-trend neutral">{pendingCount} Employees</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-card-label">Total Records</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><FileText size={20} /></div>
          </div>
          <div className="kpi-card-value">{payrolls.length}</div>
          <div className="kpi-card-trend neutral">All time</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Payroll Records ({payrolls.length})</h3>
        </div>
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Base Salary</th><th>Bonus</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No payroll records. Click "Run Payroll" to create one.</td></tr>
            ) : payrolls.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.employee?.firstName} {p.employee?.lastName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{p.employee?.designation?.title || ''}</div>
                </td>
                <td>{formatCurrency(p.baseSalary || 0)}</td>
                <td style={{ color: '#16a34a' }}>+{formatCurrency(p.bonus || 0)}</td>
                <td style={{ color: '#dc2626' }}>-{formatCurrency(p.deductions || 0)}</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(p.netPay || 0)}</td>
                <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                <td>
                  {p.status !== 'PAID' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleMarkPaid(p.id)} style={{ gap: '4px' }}>
                      <Check size={14} /> Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RUN PAYROLL MODAL */}
      <Modal isOpen={showRunModal} onClose={() => setShowRunModal(false)} title="Run Payroll">
        <FormField label="Employee" type="select" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} required
          options={employees.map(e => ({ label: `${e.firstName} ${e.lastName}`, value: e.id }))} />
        <FormField label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => setForm({ ...form, baseSalary: v })} required placeholder="5000" />
        <FormField label="Bonus" type="number" value={form.bonus} onChange={(v) => setForm({ ...form, bonus: v })} placeholder="500" />
        <FormField label="Deductions" type="number" value={form.deductions} onChange={(v) => setForm({ ...form, deductions: v })} placeholder="200" />
        <div style={{ background: 'var(--color-background)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Calculated Net Pay</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
            {formatCurrency((parseFloat(form.baseSalary || '0') + parseFloat(form.bonus || '0') - parseFloat(form.deductions || '0')))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowRunModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRunPayroll}>Process Payroll</button>
        </div>
      </Modal>
    </div>
  );
}
