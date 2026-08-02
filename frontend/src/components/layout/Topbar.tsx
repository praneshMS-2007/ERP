'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search, Bell, Settings, LogOut, User, Shield, Sun, Moon, Laptop,
  Globe, Lock, Volume2, Mail, Smartphone, Check, ChevronDown, Key
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const GLOBAL_SEARCH_ROUTES = [
  { name: 'System Administration', path: '/admin' },
  { name: 'User Management', path: '/admin' },
  { name: 'HR Dashboard', path: '/hrm' },
  { name: 'CRM Overview', path: '/crm' },
  { name: 'Inventory Management', path: '/inventory' },
  { name: 'Project Tracking', path: '/projects' },
  { name: 'Finance & Accounting', path: '/finance' },
  { name: 'Enterprise Analytics', path: '/analytics' }
];

export default function Topbar() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('English (US)');
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'preferences'>('preferences');
  
  // Notification Toggles State
  const [notifToggles, setNotifToggles] = useState({
    email: true,
    push: true,
    sound: false,
  });

  // Account Settings State
  const [accountForm, setAccountForm] = useState({
    name: 'Pranesh M S',
    email: 'pranesh@shuroq.com',
    password: '',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Stock Alert: Fiber Optics', desc: 'Inventory fell below minimum threshold (120 units).', time: '10 mins ago', read: false },
    { id: 2, title: 'Leave Request Approved', desc: 'Sarah Jenkins vacation request has been approved.', time: '2 hours ago', read: false }
  ]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load initial theme & language preferences
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const savedLang = localStorage.getItem('language') || 'English (US)';
    setLanguage(savedLang);
  }, []);

  // Theme application logic
  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const filteredRoutes = GLOBAL_SEARCH_ROUTES.filter(route => 
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayEmail = user?.email || 'pranesh@shuroq.com';
  const displayName = displayEmail.split('@')[0].toUpperCase();

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search" style={{ position: 'relative' }} ref={searchRef}>
        <Search className="search-icon" />
        <input 
          type="text" 
          placeholder="Search operations..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '4px', padding: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
            {filteredRoutes.length > 0 ? (
              filteredRoutes.map((route, i) => (
                <div 
                  key={i} 
                  onClick={() => { router.push(route.path); setSearchQuery(''); }}
                  style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', borderRadius: '4px' }} 
                  className="hover-bg-gray"
                >
                  {route.name}
                </div>
              ))
            ) : (
              <div style={{ padding: '8px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>No results found for "{searchQuery}"</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        
        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            className={`topbar-icon-btn ${showNotifications ? 'active' : ''}`} 
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: showNotifications ? 'var(--color-border-light)' : 'transparent' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-dot"></span>}
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '320px', background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
                Notifications ({unreadCount})
                {unreadCount > 0 && (
                  <span onClick={markAllRead} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: 500 }}>Mark all read</span>
                )}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.map(notif => (
                  <div key={notif.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', opacity: notif.read ? 0.6 : 1 }} className="hover-bg-gray">
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{notif.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{notif.desc}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{notif.time}</div>
                  </div>
                )) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No notifications</div>
                )}
              </div>
              <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--color-border)', fontSize: '13px', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} className="hover-bg-gray" onClick={() => setNotifications([])}>
                Clear all
              </div>
            </div>
          )}
        </div>

        {/* Settings Button -> Redirects to Settings Page */}
        <Link 
          href="/settings"
          className="topbar-icon-btn" 
          aria-label="Settings"
        >
          <Settings size={18} />
        </Link>

        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            className="topbar-user" 
            onClick={() => setShowProfile(!showProfile)}
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: showProfile ? 'var(--color-border-light)' : 'transparent', transition: 'background 0.2s' }}
          >
            <div style={{ textAlign: 'right' }}>
              <div className="topbar-user-name">{displayName}</div>
              <div className="topbar-user-role">{typeof user?.role === 'object' ? (user?.role as any)?.name : (user?.role || 'SUPER_ADMIN')}</div>
            </div>
            <div className="topbar-user-avatar">{displayName.substring(0, 2)}</div>
          </div>

          {showProfile && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '220px', background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 50, padding: '8px 0' }}>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border-light)', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{displayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{displayEmail}</div>
              </div>
              
              <Link href="/portal" onClick={() => setShowProfile(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--color-text-primary)', textDecoration: 'none' }} className="hover-bg-gray">
                <User size={16} /> My Portal
              </Link>
              <Link href="/admin" onClick={() => setShowProfile(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--color-text-primary)', textDecoration: 'none' }} className="hover-bg-gray">
                <Shield size={16} /> Administration
              </Link>
              
              <div style={{ height: '1px', background: 'var(--color-border-light)', margin: '8px 0' }}></div>
              
              <button 
                onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }} 
                className="hover-bg-red"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg-gray:hover { background-color: var(--color-background) !important; }
        .hover-bg-red:hover { background-color: #fef2f2 !important; }
      `}} />
    </header>
  );
}
