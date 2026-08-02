'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({ isOpen, onClose, title, children, width = '520px' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--color-card)', borderRadius: '16px',
          width, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'var(--color-background)', cursor: 'pointer',
              borderRadius: '8px', padding: '6px', color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ========== REUSABLE FORM FIELD ==========
interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export function FormField({ label, type = 'text', value, onChange, placeholder, required, options }: FormFieldProps) {
  const baseStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--color-border)', background: 'var(--color-background)',
    fontSize: '14px', color: 'var(--color-text)', outline: 'none',
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {type === 'select' && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={baseStyle}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={baseStyle} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} style={baseStyle} />
      )}
    </div>
  );
}
