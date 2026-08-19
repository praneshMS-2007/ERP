'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Globe,
  IndianRupee,
  Box,
  FolderKanban,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
  Settings,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Megaphone,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface SubNavItem {
  name: string;
  path: string;
  requiredAction?: string; // defaults to READ — set 'WRITE' for HR/admin-only screens
  // For screens whose real visibility rule isn't a module+action check at
  // all — e.g. Payroll, where Finance must see the page to approve it
  // despite holding HR:READ only, never HR:WRITE. When set, this replaces
  // the requiredAction check entirely rather than adding to it.
  requiredRoles?: string[];
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  requiredModule?: string; // Module permission required to see this item
  // Same meaning as SubNavItem.requiredRoles — a fixed role allowlist that
  // replaces the module check entirely. Used for the Employee-only
  // top-level sections (Attendance/Leave/Payroll below): none of these
  // roles exist to be granted via the module/permission system since
  // they're specific to one role, not a permission tier.
  requiredRoles?: string[];
  // A blocklist layered on top of the module check — module access alone
  // isn't enough to hide this from an Employee (EMPLOYEE holds HR:READ, so
  // "HR Management" would otherwise still render for them with a couple of
  // visible sub-items). This is the one item that needs "everyone with
  // access, except this one role" rather than an allowlist.
  hiddenForRoles?: string[];
  subItems?: SubNavItem[];
}

const allNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  // Hidden entirely from EMPLOYEE — they get Attendance/Leave
  // Management/Payroll as their own dedicated top-level sections instead
  // (below), not nested here.
  { name: 'HR Management', path: '/hrm', icon: Users, requiredModule: 'HR', hiddenForRoles: ['EMPLOYEE'], subItems: [
    { name: 'Overview', path: '/hrm' },
    { name: 'Employee Directory', path: '/hrm/employees' },
    { name: 'Attendance', path: '/hrm/attendance' },
    // Absorbed Leave Management's old link — the repurposed page now
    // handles leave approval AND password-reset requests, both HR/Admin
    // administrative tools, not an employee's own self-service page
    // (employees use their own Leave Management section instead — see
    // the EMPLOYEE-only top-level entry below).
    { name: 'Employee Request', path: '/portal', requiredAction: 'WRITE' },
    // Segregation of duties, locked decision: HR prepares payroll (creates
    // records) here; Finance releases it (marks paid) from its own copy of
    // this link under the Finance section below — same route, but each
    // side only ever sees the one link that's theirs. HR_MANAGER only here,
    // deliberately not FINANCE_MANAGER — see the Finance entry below for
    // the mirror image of this. User Management stays WRITE-only.
    { name: 'Payroll', path: '/hrm/payroll', requiredRoles: ['SUPER_ADMIN', 'HR_MANAGER'] },
    { name: 'User Management', path: '/hrm/user-management', requiredAction: 'WRITE' },
  ]},
  // The next three are an Employee's own dedicated sections — deliberately
  // NOT nested under HR Management (which Employees no longer see at all),
  // each with its own top-level icon. Attendance/Leave/Payroll here are
  // read-only-or-self-only pages, distinct from the management screens
  // above that share similar names.
  { name: 'Attendance', path: '/attendance', icon: CalendarCheck, requiredRoles: ['EMPLOYEE'] },
  { name: 'CRM', path: '/crm', icon: Globe, requiredModule: 'CRM', subItems: [
    { name: 'Sales Pipeline', path: '/crm' },
    { name: 'Leads', path: '/crm/leads' },
    { name: 'Customers', path: '/crm/customers' },
    { name: 'Opportunities', path: '/crm/opportunities' },
    { name: 'Support Tickets', path: '/crm/support' },
    { name: 'Contacts', path: '/crm/contacts' },
  ]},
  { name: 'Finance', path: '/finance', icon: IndianRupee, requiredModule: 'FINANCE', subItems: [
    { name: 'Overview', path: '/finance' },
    { name: 'General Ledger', path: '/finance/ledger' },
    { name: 'Budgets', path: '/finance/budgets' },
    // Mirror of HR Management's Payroll link above — same page (it already
    // adapts its own actions per viewer: HR gets Add Payroll, Finance gets
    // Mark Paid), just reachable from Finance's own section instead, and
    // deliberately not shown to HR_MANAGER here. A distinct path
    // (/finance/payroll, re-exporting the same component) rather than
    // reusing /hrm/payroll, so the two sidebar entries don't both light up
    // as "active" together whenever either one is open.
    { name: 'Payroll', path: '/finance/payroll', requiredRoles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
  ]},
  { name: 'Inventory', path: '/inventory', icon: Box, requiredModule: 'INVENTORY', subItems: [
    { name: 'Overview', path: '/inventory' },
    { name: 'Products', path: '/inventory/products' },
    { name: 'Warehouse', path: '/inventory/warehouse' },
    { name: 'Raw Materials', path: '/inventory/raw-materials' },
    { name: 'Sales Orders', path: '/inventory/sales-orders' },
  ]},
  // "Project Management" is the parent group; its own landing link is now
  // labeled "Projects" (was "Overview") — same page, same route, already
  // scoped per-viewer (Admin/HR see the whole company, everyone else only
  // sees projects they're actually staffed on) with the real status filter.
  // Timesheets used to be a second sub-item here — it now lives inside
  // each project's own Timesheet tab, since a timesheet only ever makes
  // sense in the context of one specific project. With only one
  // destination left, this is a direct link rather than a dropdown.
  { name: 'Project Management', path: '/projects', icon: FolderKanban, requiredModule: 'PROJECTS' },
  { name: 'Leave Management', path: '/leaves', icon: CalendarDays, requiredRoles: ['EMPLOYEE'] },
  // Read-only self view — distinct from HR/Finance's own /hrm/payroll and
  // /finance/payroll (which have real actions), see PayrollPageContent vs
  // this route's much smaller standalone page.
  { name: 'Payroll', path: '/payroll', icon: Wallet, requiredRoles: ['EMPLOYEE'] },
  // No gate at all — visible to every signed-in account, management and
  // Employee alike, matching "independent section for every user account."
  { name: 'Announcements', path: '/announcements', icon: Megaphone },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, requiredModule: 'ANALYTICS' },
  { name: 'AI Assistant', path: '/ai', icon: Sparkles },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Filter both the top-level items AND their sub-items. A group can be
  // visible (e.g. HR Management, because Employee Directory is READable)
  // while individual entries inside it stay hidden (Payroll, User
  // Management — WRITE only). Checking only the parent module was the exact
  // gap that let an EMPLOYEE see and open Payroll from the sidebar.
  const navItems = allNavItems
    .filter((item) => {
      if (item.requiredRoles) return !!user?.role && item.requiredRoles.includes(user.role as string);
      if (item.hiddenForRoles && user?.role && item.hiddenForRoles.includes(user.role as string)) return false;
      return !item.requiredModule || hasPermission(item.requiredModule);
    })
    .map((item) => {
      if (!item.subItems) return item;
      const visibleSubItems = item.subItems.filter((sub) => {
        if (sub.requiredRoles) return !!user?.role && sub.requiredRoles.includes(user.role as string);
        return !item.requiredModule || hasPermission(item.requiredModule, sub.requiredAction ?? 'READ');
      });
      return { ...item, subItems: visibleSubItems };
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
      <div className="sidebar-header" onClick={toggleSidebar} style={{ cursor: 'pointer', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <img src="/shuroq-logo.png" alt="Shuroq" style={{ height: '24px', maxWidth: isOpen ? '110px' : '28px', objectFit: 'contain' }} />
        </div>
        {isOpen && (
          <div className="sidebar-logo-text" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="logo-title" style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>ERP PLATFORM</span>
            <span className="logo-sub" style={{ fontSize: '9.5px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Tech Redefined</span>
          </div>
        )}
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
