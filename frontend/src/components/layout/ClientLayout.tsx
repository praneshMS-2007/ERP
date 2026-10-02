'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar, { canAccessPath } from '@/components/layout/Sidebar';
import { AccessDenied } from '@/components/PageGuard';
import Topbar from '@/components/layout/Topbar';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const forcedChange = !!user?.mustChangePassword;

  // A temporary password must be replaced before anything else in the app opens.
  useEffect(() => {
    if (!isLoading && forcedChange && pathname !== '/change-password') router.replace('/change-password');
  }, [isLoading, forcedChange, pathname, router]);

  // Show login page without sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show children (login page redirect happens in AuthContext)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Forced first-login password change: a plain page, no menu to wander off to.
  if (forcedChange) {
    return pathname === '/change-password' ? <>{children}</> : null;
  }

  return (
    <div className="app-shell">
      <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />
      <div className={`main-area ${!isOpen ? 'sidebar-collapsed' : ''}`}>
        <Topbar />
        <main className="content">
          {canAccessPath(pathname, user?.role, hasPermission) ? children : <AccessDenied />}
        </main>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
