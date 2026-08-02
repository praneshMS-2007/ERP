'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  onExport: (format: string) => Promise<void>;
  label?: string;
}

export default function ExportButton({ onExport, label = 'Export' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: string) => {
    setExporting(true);
    setIsOpen(false);
    try {
      await onExport(format);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Download size={14} />
        {exporting ? 'Exporting...' : label}
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 50,
            minWidth: '160px',
          }}
        >
          <button
            onClick={() => handleExport('xlsx')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-text)',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileSpreadsheet size={16} style={{ color: '#22c55e' }} />
            Export as Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-text)',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileText size={16} style={{ color: '#ef4444' }} />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
