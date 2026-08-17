'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Modal, { FormField } from './Modal';

/**
 * Shared by the Employee's own Attendance page and HR's per-employee
 * history drill-down — a date-range picker feeding into the same
 * server-side validation (can't start before the join date, can't end
 * after today), so the error message shown here always comes straight
 * from that one real rule, not a client-side guess at it.
 */
export default function AttendanceExportButton({ onExport, description }: { onExport: (from: string, to: string) => Promise<void>; description?: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (!from || !to) {
      setError('Choose both a start and end date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onExport(from, to);
      setOpen(false);
    } catch (e: any) {
      setError(e.message || 'Could not export this range.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => { setError(''); setOpen(true); }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <FileSpreadsheet size={14} /> Export as Excel
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Export Attendance History" width="420px">
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{error}</div>
        )}
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          {description || 'Choose a date range within the tracked history — from the join date through today.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="From" type="date" value={from} onChange={setFrom} required />
          <FormField label="To" type="date" value={to} onChange={setTo} required />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
          <button className="btn btn-secondary" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={loading}>{loading ? 'Exporting…' : 'Download'}</button>
        </div>
      </Modal>
    </>
  );
}
