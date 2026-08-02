'use client';

import { X, Globe, Moon, Sun, Bell, Shield, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'security'>('general');
  const [mounted, setMounted] = useState(false);

  // Real settings state
  const [language, setLanguage] = useState('English (US)');
  const [timezone, setTimezone] = useState('(GMT+00:00) UTC');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [requireMfa, setRequireMfa] = useState(true);
  const [passwordRotation, setPasswordRotation] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load persisted settings
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);

    const savedSettingsStr = localStorage.getItem('erp_global_settings');
    if (savedSettingsStr) {
      try {
        const s = JSON.parse(savedSettingsStr);
        if (s.language) setLanguage(s.language);
        if (s.timezone) setTimezone(s.timezone);
        if (s.emailNotifs !== undefined) setEmailNotifs(s.emailNotifs);
        if (s.pushNotifs !== undefined) setPushNotifs(s.pushNotifs);
        if (s.smsNotifs !== undefined) setSmsNotifs(s.smsNotifs);
        if (s.requireMfa !== undefined) setRequireMfa(s.requireMfa);
        if (s.passwordRotation !== undefined) setPasswordRotation(s.passwordRotation);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  function handleThemeChange(newTheme: 'light' | 'dark') {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function handleSave() {
    // Save to localStorage
    const settingsObj = {
      language, timezone, theme, emailNotifs, pushNotifs, smsNotifs, requireMfa, passwordRotation,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('erp_global_settings', JSON.stringify(settingsObj));
    handleThemeChange(theme);
    onClose();
  }

  if (!isOpen || !mounted) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--color-surface, #ffffff)', width: '600px', maxWidth: '90%',
        borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--color-border-light, #e5e7eb)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--color-text-primary, #111827)' }}>Global Settings</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, #9ca3af)'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', minHeight: '350px' }}>
          {/* Sidebar */}
          <div style={{ width: '180px', borderRight: '1px solid var(--color-border-light, #e5e7eb)', padding: '16px 0', background: 'var(--color-background, #f9fafb)' }}>
            <button
              onClick={() => setActiveTab('general')}
              style={{
                width: '100%', padding: '10px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                background: activeTab === 'general' ? '#eff6ff' : 'transparent',
                color: activeTab === 'general' ? '#2563eb' : 'var(--color-text-primary, #111827)',
                border: 'none', cursor: 'pointer', fontWeight: activeTab === 'general' ? 600 : 500
              }}
            >
              <Globe size={18} /> General
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              style={{
                width: '100%', padding: '10px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                background: activeTab === 'appearance' ? '#eff6ff' : 'transparent',
                color: activeTab === 'appearance' ? '#2563eb' : 'var(--color-text-primary, #111827)',
                border: 'none', cursor: 'pointer', fontWeight: activeTab === 'appearance' ? 600 : 500
              }}
            >
              <Sun size={18} /> Appearance
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                width: '100%', padding: '10px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                background: activeTab === 'notifications' ? '#eff6ff' : 'transparent',
                color: activeTab === 'notifications' ? '#2563eb' : 'var(--color-text-primary, #111827)',
                border: 'none', cursor: 'pointer', fontWeight: activeTab === 'notifications' ? 600 : 500
              }}
            >
              <Bell size={18} /> Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              style={{
                width: '100%', padding: '10px 20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                background: activeTab === 'security' ? '#eff6ff' : 'transparent',
                color: activeTab === 'security' ? '#2563eb' : 'var(--color-text-primary, #111827)',
                border: 'none', cursor: 'pointer', fontWeight: activeTab === 'security' ? 600 : 500
              }}
            >
              <Shield size={18} /> Security
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: '24px' }}>
            {activeTab === 'general' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>General Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border-light, #e5e7eb)', background: 'transparent', color: 'inherit' }}>
                      <option>English (US)</option>
                      <option>Spanish (ES)</option>
                      <option>French (FR)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Timezone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border-light, #e5e7eb)', background: 'transparent', color: 'inherit' }}>
                      <option>(GMT-05:00) Eastern Time</option>
                      <option>(GMT-08:00) Pacific Time</option>
                      <option>(GMT+00:00) UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'appearance' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Theme Settings</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div
                    onClick={() => handleThemeChange('light')}
                    style={{ border: theme === 'light' ? '2px solid #2563eb' : '1px solid var(--color-border-light, #e5e7eb)', padding: '16px', borderRadius: '8px', cursor: 'pointer', flex: 1, textAlign: 'center' }}
                  >
                    <Sun size={24} style={{ color: theme === 'light' ? '#2563eb' : 'var(--color-text-muted, #9ca3af)', marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600 }}>Light Mode</div>
                  </div>
                  <div
                    onClick={() => handleThemeChange('dark')}
                    style={{ border: theme === 'dark' ? '2px solid #2563eb' : '1px solid var(--color-border-light, #e5e7eb)', padding: '16px', borderRadius: '8px', cursor: 'pointer', flex: 1, textAlign: 'center' }}
                  >
                    <Moon size={24} style={{ color: theme === 'dark' ? '#2563eb' : 'var(--color-text-muted, #9ca3af)', marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600 }}>Dark Mode</div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Notification Alerts</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Email Notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={pushNotifs} onChange={(e) => setPushNotifs(e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Browser Push Notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={smsNotifs} onChange={(e) => setSmsNotifs(e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>SMS Alerts (Critical only)</span>
                </label>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Security Policies</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={requireMfa} onChange={(e) => setRequireMfa(e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Require MFA for all Admins</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={passwordRotation} onChange={(e) => setPasswordRotation(e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Enforce strict password rotation (30 days)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--color-border-light, #e5e7eb)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          background: 'var(--color-surface, #ffffff)'
        }}>
          <button onClick={onClose} style={{
            padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--color-border-light, #e5e7eb)',
            background: 'var(--color-background, #f9fafb)', cursor: 'pointer', fontWeight: 600,
            color: 'var(--color-text-primary, #111827)'
          }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{
            padding: '10px 16px', borderRadius: '6px', border: 'none',
            background: 'var(--color-primary, #2563eb)', color: 'white', cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
