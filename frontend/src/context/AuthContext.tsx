'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Permission {
  module: string;
  action: string;
}

interface User {
  id: string;
  email: string | null; // null for ERP-generated accounts with no mailbox yet
  username: string | null;
  role: string;
  name: string;
  permissions: Permission[];
  /** True while the account still has a generated temporary password. */
  mustChangePassword?: boolean;
  /** Profile photo path on the API server (e.g. /uploads/avatars/x.jpg), if the employee has one. */
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Called once the temporary password has been replaced. */
  completePasswordChange: () => void;
  /** Re-reads name and photo from the server (e.g. after a profile photo changes). */
  refreshUser: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // On mount, check for existing session in localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // The stored user is a snapshot from sign-in. Refresh the parts HR can change
  // later (name, photo) so the header doesn't show stale details until next login.
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return; // expiry is handled by the regular API layer
      const me = await res.json();
      setUser((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          name: me.employee ? `${me.employee.firstName} ${me.employee.lastName}` : prev.name,
          avatarUrl: me.employee?.avatarUrl ?? null,
        };
        localStorage.setItem('user', JSON.stringify(next));
        return next;
      });
    } catch {
      // offline or server down — keep the stored snapshot
    }
  }, [API_BASE]);

  useEffect(() => {
    if (!token) return;
    refreshUser();
    const onChange = () => { refreshUser(); };
    window.addEventListener('erp:profile-changed', onChange);
    return () => window.removeEventListener('erp:profile-changed', onChange);
  }, [token, refreshUser]);

  // Redirect logic
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid credentials');
    }

    const data = await res.json();

    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      router.push(data.user.mustChangePassword ? '/change-password' : '/');
    } else {
      throw new Error('Invalid response from server');
    }
  }, [router]);

  const logout = useCallback(() => {
    // Call backend logout
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {}); // Fire and forget
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [token, router]);

  const completePasswordChange = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const hasPermission = useCallback((module: string, action: string = 'READ') => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;

    return user.permissions?.some(
      (p) => p.module === module && (p.action === action || p.action === 'ALL'),
    ) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        completePasswordChange,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
