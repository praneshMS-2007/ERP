'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { notificationApi, searchApi } from '../../services/api';

export default function Topbar() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function loadNotifications() {
    try {
      const data = await notificationApi.getNotifications();
      if (Array.isArray(data)) setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  // Live unified global search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchApi.globalSearch(searchQuery);
        setSearchResults(res);
      } catch (e) {
        console.error('Global search error', e);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('');
        setSearchResults(null);
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

  const markAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      loadNotifications();
    } catch (e) {
      console.error('Failed to mark notifications read', e);
    }
  };

  // "virtual-" ids are computed fresh on every load (task/deadline
  // reminders), not real rows — nothing to persist as read, they just stop
  // appearing once the underlying task/project changes.
  const handleNotifClick = async (notif: any) => {
    setShowNotifications(false);
    if (!String(notif.id).startsWith('virtual-') && !notif.isRead) {
      try { await notificationApi.markAsRead(notif.id); } catch (e) { console.error('Failed to mark notification read', e); }
    }
    if (notif.link) router.push(notif.link);
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Never fall back to a hardcoded person's identity — ERP-provisioned
  // accounts (username + password, no mailbox) have email: null by design.
  const displayName = (user?.name || 'User').toUpperCase();
  const displayContact = user?.email || (user?.username ? `@${user.username}` : '');
  const initials = (user?.name || 'U').trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const hasSearchResults = searchResults && (
    (searchResults.employees && searchResults.employees.length > 0) ||
    (searchResults.products && searchResults.products.length > 0) ||
    (searchResults.customers && searchResults.customers.length > 0) ||
    (searchResults.invoices && searchResults.invoices.length > 0) ||
    (searchResults.projects && searchResults.projects.length > 0)
  );

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search" style={{ position: 'relative' }} ref={searchRef}>
        <Search className="search-icon" />
        <input 
          type="text" 
          placeholder="Global Search (Employees, Invoices, Products, Projects...)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '4px', padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '350px', overflowY: 'auto' }}>
            {searching ? (
              <div style={{ padding: '8px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Searching database...</div>
            ) : hasSearchResults ? (
              <div>
                {searchResults.employees?.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', marginBottom: '4px' }}>Employees</div>
                    {searchResults.employees.map((e: any) => (
                      <div key={e.id} onClick={() => { router.push('/hrm/employees'); setSearchQuery(''); }} style={{ padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-gray">
                        {e.firstName} {e.lastName} ({e.empCode})
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.products?.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#10b981', marginBottom: '4px' }}>Products</div>
                    {searchResults.products.map((p: any) => (
                      <div key={p.id} onClick={() => { router.push('/inventory/products'); setSearchQuery(''); }} style={{ padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-gray">
                        {p.name} ({p.sku}) — Stock: {p.stockLevel}
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.invoices?.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '4px' }}>Invoices</div>
                    {searchResults.invoices.map((inv: any) => (
                      <div key={inv.id} onClick={() => { router.push('/finance'); setSearchQuery(''); }} style={{ padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-gray">
                        {inv.invoiceNo} — {inv.clientName} (${inv.amount})
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.projects?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '4px' }}>Projects</div>
                    {searchResults.projects.map((proj: any) => (
                      <div key={proj.id} onClick={() => { router.push('/projects'); setSearchQuery(''); }} style={{ padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-gray">
                        {proj.name} ({proj.progress}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '8px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>No matching records for "{searchQuery}"</div>
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
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '340px', background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-text-primary)' }}>
                Notifications ({unreadCount})
                {unreadCount > 0 && (
                  <span onClick={markAllRead} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: 500 }}>Mark all read</span>
                )}
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer', opacity: notif.isRead ? 0.6 : 1 }}
                    className="hover-bg-gray"
                  >
                    <div style={{
                      fontSize: '12.5px', color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      <span style={{ fontWeight: 700 }}>{notif.title}:</span> {notif.message}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '3px' }}>{new Date(notif.createdAt).toLocaleString()}</div>
                  </div>
                )) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
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
              <div className="topbar-user-role">{user?.role || ''}</div>
            </div>
            <div className="topbar-user-avatar">{initials}</div>
          </div>

          {showProfile && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '220px', background: 'var(--color-surface, white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, padding: '8px 0' }}>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border-light)', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{displayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{displayContact}</div>
              </div>
              
              <Link href="/settings" onClick={() => setShowProfile(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--color-text-primary)', textDecoration: 'none' }} className="hover-bg-gray">
                <User size={16} /> My Profile
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
