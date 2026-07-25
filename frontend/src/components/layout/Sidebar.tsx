'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Globe,
  Box,
  FolderKanban,
  BarChart3,
  Shield,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'HR Management', path: '/hrm', icon: Users },
  { name: 'CRM', path: '/crm', icon: Globe },
  { name: 'Inventory', path: '/inventory', icon: Box },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'AI Assistant', path: '/ai', icon: Sparkles },
  { name: 'Administration', path: '/admin', icon: Shield },
];

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
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
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">PM</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Pranesh M S</div>
            <div className="sidebar-user-role">Operation Director</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
