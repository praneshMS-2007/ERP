'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, LogOut, User, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
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

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search" style={{ position: 'relative' }}>
        <Search className="search-icon" />
        <input 
          type="text" 
          placeholder="Search operations..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50 }}>
            <div style={{ padding: '8px', fontSize: '13px', color: '#6b7280' }}>Press Enter to search for "{searchQuery}"</div>
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
            style={{ background: showNotifications ? '#f3f4f6' : 'transparent' }}
          >
            <Bell size={18} />
            <span className="notification-dot"></span>
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Notifications
                <span style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer' }}>Mark all read</span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} className="hover-bg-gray">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Stock Alert: Fiber Optics</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Inventory fell below minimum threshold (120 units).</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>10 mins ago</div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} className="hover-bg-gray">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Leave Request Approved</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Sarah Jenkins vacation request has been approved.</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>2 hours ago</div>
                </div>
              </div>
              <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} className="hover-bg-gray">
                View all notifications
              </div>
            </div>
          )}
        </div>

        {/* Settings Link */}
        <Link href="/admin">
          <button className="topbar-icon-btn" aria-label="Settings">
            <Settings size={18} />
          </button>
        </Link>

        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            className="topbar-user" 
            onClick={() => setShowProfile(!showProfile)}
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: showProfile ? '#f3f4f6' : 'transparent', transition: 'background 0.2s' }}
          >
            <div style={{ textAlign: 'right' }}>
              <div className="topbar-user-name">Pranesh M S</div>
              <div className="topbar-user-role">Operation Director</div>
            </div>
            <div className="topbar-user-avatar">PM</div>
          </div>

          {showProfile && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '220px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 50, padding: '8px 0' }}>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Pranesh M S</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>pranesh@shuroq.com</div>
              </div>
              
              <Link href="/hrm" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: '#374151', textDecoration: 'none' }} className="hover-bg-gray">
                <User size={16} /> My Profile
              </Link>
              <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', color: '#374151', textDecoration: 'none' }} className="hover-bg-gray">
                <Shield size={16} /> Administration
              </Link>
              
              <div style={{ height: '1px', background: '#e5e7eb', margin: '8px 0' }}></div>
              
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
      
      {/* Inline styles for hover effects in this component */}
      <style dangerouslySetInnerHTML={{__html: `
        .hover-bg-gray:hover { background-color: #f9fafb; }
        .hover-bg-red:hover { background-color: #fef2f2; }
      `}} />
    </header>
  );
}
