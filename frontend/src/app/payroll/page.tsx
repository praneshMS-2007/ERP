'use client';

import { useState, useEffect } from 'react';
import { Wallet, Download } from 'lucide-react';
import { selfApi, uploadApi } from '../../services/api';
import { formatINR } from '../../lib/currency';

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', PAID: 'Paid', REJECTED: 'Returned to HR' };

function statusBadge(s: string) {
  if (s === 'PAID') return 'badge badge-healthy';
  if (s === 'DRAFT') return 'badge badge-warning';
  if (s === 'REJECTED') return 'badge badge-critical';
  return 'badge';
}

export default function EmployeePayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    selfApi.getPayroll()
      .then((data) => setPayrolls(Array.isArray(data) ? data : []))
      .catch((e: any) => setError(e?.message || 'Could not load your payroll records.'))
      .finally(() => setLoading(false));
  }, []);

  const lastPaid = payrolls.find((p) => p.status === 'PAID');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <p>Your own payslips, as issued by HR and Finance — read-only.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">MOST RECENT NET PAY</div>
            <div className="kpi-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Wallet size={20} /></div>
          </div>
          <div className="kpi-card-value">{lastPaid ? formatINR(lastPaid.netPay) : '—'}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{lastPaid ? lastPaid.payPeriod : 'No paid records yet'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">TOTAL PAYSLIPS</div>
            <div className="kpi-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Wallet size={20} /></div>
          </div>
          <div className="kpi-card-value">{payrolls.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-card-label">PENDING</div>
            <div className="kpi-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Wallet size={20} /></div>
          </div>
          <div className="kpi-card-value">{payrolls.filter((p) => p.status === 'DRAFT').length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Payslip History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Pay Period</th>
              <th>Base Salary</th>
              <th>Bonus</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Payslip</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>Loading…</td></tr>
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>No payroll records yet</td></tr>
            ) : payrolls.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.payPeriod}</td>
                <td>{formatINR(p.baseSalary)}</td>
                <td style={{ color: '#16a34a' }}>+{formatINR(p.bonus)}</td>
                <td style={{ color: '#dc2626' }}>-{formatINR(p.deductions)}</td>
                <td style={{ fontWeight: 700 }}>{formatINR(p.netPay)}</td>
                <td><span className={statusBadge(p.status)}>{STATUS_LABEL[p.status] || p.status}</span></td>
                <td>
                  {p.payslipDocument ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => uploadApi.downloadFile(p.payslipDocument.storagePath, p.payslipDocument.fileName).catch((e: any) => alert(e.message || 'Download failed.'))}
                    >
                      <Download size={13} /> Download
                    </button>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12.5 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
