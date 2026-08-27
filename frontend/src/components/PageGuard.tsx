'use client';

import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page whose sidebar entry is hidden from some roles (via
 * `requiredAction: 'WRITE'` in Sidebar.tsx) — the nav link disappearing
 * isn't a route guard, so a role that shouldn't be here could still land on
 * this page directly (a typed URL, a bookmark, a stale link) and would
 * otherwise see the page's own raw API error text instead of a real
 * "you don't have access" message. This is the missing guard: checked
 * before the page's own content (and its data-fetching) ever renders.
 */
export default function PageGuard({
  module,
  action = 'WRITE',
  children,
}: {
  module: string;
  action?: string;
  children: React.ReactNode;
}) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  if (!hasPermission(module, action)) {
    return (
      <div className="fade-in" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <ShieldAlert size={40} style={{ color: 'var(--color-text-muted)', marginBottom: 16 }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 8 }}>You don&apos;t have access to this page</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Contact an administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
