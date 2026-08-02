'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <div className="app-shell">
      <Sidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />
      <div className={`main-area ${!isOpen ? 'sidebar-collapsed' : ''}`}>
        <Topbar />
        <main className="content">
          {children}
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
