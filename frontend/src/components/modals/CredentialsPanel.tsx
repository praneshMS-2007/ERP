'use client';

import { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  username: string;
  password: string;
}

/**
 * Shown exactly once, right after an account is created or a password is
 * reset. The password exists only in memory at this point — the database
 * holds nothing but its bcrypt hash — so if this panel is dismissed without
 * copying it down, it is gone for good and the only recovery is another
 * reset from User Management.
 *
 * Per team decision: credentials are never emailed. This is the only place
 * they are ever displayed; HR hands them over in person or by phone.
 */
export default function CredentialsPanel({ isOpen, onClose, personName, username, password }: Props) {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  function copy(field: 'username' | 'password', value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ERP account for ${personName}`} width="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Row label="Username" value={username} field="username" copiedField={copiedField} onCopy={copy} />
        <Row label="Password" value={password} field="password" copiedField={copiedField} onCopy={copy} />

        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 14px',
          borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 13, lineHeight: 1.5,
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            This password will not be shown again — it is not stored anywhere in plain text. Note it down now,
            and hand it to {personName} in person or by phone. Per policy, never send it by email.
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          I have noted this down
        </button>
      </div>
    </Modal>
  );
}

function Row({
  label, value, field, copiedField, onCopy,
}: {
  label: string; value: string; field: 'username' | 'password';
  copiedField: string | null; onCopy: (f: 'username' | 'password', v: string) => void;
}) {
  const copied = copiedField === field;
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <code style={{
          flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
          background: 'var(--color-background)', fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 14.5, letterSpacing: '.02em', color: 'var(--color-text)',
        }}>
          {value}
        </code>
        <button
          onClick={() => onCopy(field, value)}
          title={`Copy ${label.toLowerCase()}`}
          style={{
            width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: '1px solid var(--color-border)',
            background: copied ? '#f0fdf4' : 'var(--color-background)',
            color: copied ? '#15803d' : 'var(--color-text-muted)', cursor: 'pointer',
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}
