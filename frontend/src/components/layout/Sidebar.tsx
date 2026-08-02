'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Globe,
  DollarSign,
  Box,
  FolderKanban,
  BarChart3,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  requiredModule?: string; // Module permission required to see this item
  subItems?: { name: string; path: string }[];
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Employee Portal', path: '/portal', icon: User, requiredModule: 'HR' },
  { name: 'HR Management', path: '/hrm', icon: Users, requiredModule: 'HR', subItems: [
    { name: 'Overview', path: '/hrm' },
    { name: 'Employee Directory', path: '/hrm/employees' },
    { name: 'Attendance', path: '/hrm/attendance' },
    { name: 'Leave Management', path: '/hrm/leaves' },
    { name: 'Payroll', path: '/hrm/payroll' },
    { name: 'Recruitment', path: '/hrm/recruitment' },
  ]},
  { name: 'CRM', path: '/crm', icon: Globe, requiredModule: 'CRM', subItems: [
    { name: 'Sales Pipeline', path: '/crm' },
    { name: 'Support Tickets', path: '/crm/support' },
    { name: 'Contacts', path: '/crm/contacts' },
  ]},
  { name: 'Finance', path: '/finance', icon: DollarSign, requiredModule: 'FINANCE', subItems: [
    { name: 'Overview', path: '/finance' },
    { name: 'General Ledger', path: '/finance/ledger' },
  ]},
  { name: 'Inventory', path: '/inventory', icon: Box, requiredModule: 'INVENTORY', subItems: [
    { name: 'Overview', path: '/inventory' },
    { name: 'Warehouse', path: '/inventory/warehouse' },
    { name: 'Sales Orders', path: '/inventory/sales-orders' },
  ]},
  { name: 'Projects', path: '/projects', icon: FolderKanban, requiredModule: 'PROJECTS', subItems: [
    { name: 'Overview', path: '/projects' },
    { name: 'Timesheets', path: '/projects/timesheets' },
  ]},
  { name: 'Analytics', path: '/analytics', icon: BarChart3, requiredModule: 'ANALYTICS' },
  { name: 'AI Assistant', path: '/ai', icon: Sparkles },
  { name: 'Administration', path: '/admin', icon: Shield, requiredModule: 'ADMIN' },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((item) => {
    if (!item.requiredModule) return true; // Dashboard, AI — always visible
    return hasPermission(item.requiredModule);
  });

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const isExactActive = (path: string) => {
    return pathname === path;
  };

  const toggleSubmenu = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="logo-title">Enterprise ERP</span>
          <span className="logo-sub">Global Operations</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = isActive(item.path);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus[item.path] || (isItemActive && expandedMenus[item.path] !== false);

          return (
            <div key={item.path}>
              <Link
                href={item.path}
                className={`nav-item ${isExactActive(item.path) ? 'active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={(e) => hasSubItems ? toggleSubmenu(item.path, e) : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.name}</span>
                </div>
                {hasSubItems && (
                  <div className="nav-label">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                )}
              </Link>
              
              {hasSubItems && isExpanded && isOpen && (
                <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', marginBottom: '8px' }}>
                  {item.subItems!.map(sub => (
                    <Link
                      key={sub.path}
                      href={sub.path}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: isExactActive(sub.path) ? '#ffffff' : '#9ca3af',
                        fontWeight: isExactActive(sub.path) ? 700 : 500,
                        textDecoration: 'none',
                        borderRadius: '6px',
                        background: isExactActive(sub.path) ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                      className="hover-sub-item"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — Dynamic user info from AuthContext */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user ? getInitials(user.name) : 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Guest'}</div>
            <div className="sidebar-user-role">{user?.role?.replace(/_/g, ' ') || 'Not logged in'}</div>
          </div>
          {isOpen && (
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '4px',
                marginLeft: 'auto',
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-sub-item:hover { color: #ffffff !important; background: rgba(255, 255, 255, 0.1) !important; }
      `}} />
    </aside>
  );
}
