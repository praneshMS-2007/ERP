'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User, Lock, Sliders, Bell, Edit2, Check, Save,
  Sun, Moon, Laptop, Globe, Eye, EyeOff, ShieldCheck, Mail, Phone,
  Calendar, MapPin, Hash, Briefcase, Shield, Key, Smartphone, Monitor,
  AlertCircle, CheckCircle2, Award, Building, Sparkles, ChevronRight, Upload, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { settingsApi } from '../../services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  
  // Navigation active tab: profile, security, preferences, notifications, organization
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'notifications' | 'organization'>('profile');
  const [isEditing, setIsEditing] = useState(false);

  // User Profile Form State
  const [firstName, setFirstName] = useState('Pranesh');
  const [lastName, setLastName] = useState('M S');
  const [email, setEmail] = useState('pranesh@shuroq.com');
  const [phone, setPhone] = useState('+971 50 123 4567');
  const [bio, setBio] = useState('Chief Executive & Enterprise Systems Architect');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('14 October, 1992');
  const [nationalId, setNationalId] = useState('784-1992-1234567-1');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Address State
  const [country, setCountry] = useState('United Arab Emirates');
  const [cityState, setCityState] = useState('Dubai / Jumeirah');
  const [postalCode, setPostalCode] = useState('00000');
  const [taxId, setTaxId] = useState('TAX-AE-9988223');

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  // Preferences & Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [language, setLanguage] = useState('English (US)');
  const [timezone, setTimezone] = useState('(GMT+04:00) Gulf Standard Time (Dubai)');

  // Notification Toggles State
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(true);
  const [notifSecurityAlerts, setNotifSecurityAlerts] = useState(true);

  // Save feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync logged in user and fetch real backend profile & sessions
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const profileData = await settingsApi.getProfile();
        if (profileData && profileData.employee) {
          setFirstName(profileData.employee.firstName || 'Pranesh');
          setLastName(profileData.employee.lastName || 'M S');
          if (profileData.employee.contact) setPhone(profileData.employee.contact);
          if (profileData.employee.country) setCountry(profileData.employee.country);
          if (profileData.employee.city) setCityState(profileData.employee.city);
        }
        if (profileData && profileData.email) {
          setEmail(profileData.email);
        }

        const activeSessions = await settingsApi.getSessions();
        if (Array.isArray(activeSessions) && activeSessions.length > 0) {
          setSessions(activeSessions);
        }
      } catch (err) {
        console.error('Error loading settings from backend:', err);
      }
    };

    fetchBackendData();

    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light';
    setTheme(savedTheme);

    const savedLang = localStorage.getItem('language') || 'English (US)';
    setLanguage(savedLang);
  }, []);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('File size exceeds 15MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.updateProfile({
        firstName,
        lastName,
        phone,
        address: cityState,
        country,
      });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update profile in database');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (!currentPassword || !newPassword) {
      setPassError('Please enter both current and new passwords');
      return;
    }

    try {
      await settingsApi.changePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await settingsApi.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      console.error(err);
    }
  };

  // Calculate password strength indicator
  const getPasswordStrength = () => {
    if (!newPassword) return { label: 'Empty', percent: 0, color: '#d1d5db' };
    if (newPassword.length < 6) return { label: 'Weak', percent: 30, color: '#ef4444' };
    if (newPassword.length < 10) return { label: 'Medium', percent: 65, color: '#f59e0b' };
    return { label: 'Strong & Secure', percent: 100, color: '#10b981' };
  };

  const passStrength = getPasswordStrength();

  return (
    <div className="fade-in" style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '50px' }}>

      {/* LUXURY HERO HEADER BANNER */}
      <div style={{
        position: 'relative',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
        padding: '32px 40px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        overflow: 'hidden'
      }}>
        {/* Background Ambient Glowing Orbs */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '20%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(30px)' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* User Info & Avatar Overlay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                border: '4px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 800, color: 'white',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}>
                {profilePic ? (
                  <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  `${firstName.charAt(0)}${lastName.charAt(0)}`
                )}
              </div>
              <div style={{
                position: 'absolute', bottom: '4px', right: '4px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#10b981', border: '3px solid #0f172a'
              }} title="Online & Active" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.02em' }}>
                  {firstName} {lastName}
                </h1>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(37,99,235,0.3)', border: '1px solid rgba(59,130,246,0.5)',
                  fontSize: '11px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <Shield size={12} /> {user?.role || 'SUPER_ADMIN'}
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)',
                  fontSize: '11px', fontWeight: 700, color: '#6ee7b7'
                }}>
                  <CheckCircle2 size={12} /> Verified Account
                </span>
              </div>

              <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '6px', margin: 0, maxWidth: '600px' }}>
                {bio}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px', fontSize: '12.5px', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: '#60a5fa' }} /> {email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: '#f472b6' }} /> {cityState.split('/')[0]}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} style={{ color: '#34d399' }} /> Shuroq Systems Corp
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hero Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png, image/jpeg"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease', backdropFilter: 'blur(8px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <Upload size={15} /> Upload Photo
            </button>

            <button
              type="button"
              onClick={() => {
                if (isEditing) handleSave();
                else setIsEditing(true);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '12px', border: 'none',
                background: isEditing ? '#10b981' : '#2563eb',
                color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)', transition: 'all 0.2s ease'
              }}
            >
              {isEditing ? <><Save size={15} /> Save Changes</> : <><Edit2 size={15} /> Edit Profile</>}
            </button>
          </div>

        </div>
      </div>

      {/* MAIN 2-COLUMN SETTINGS DASHBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '310px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* LEFT SUB-SIDEBAR: Navigation & System Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--color-border-light)', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Settings Hub</h2>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px', margin: 0 }}>
                Configure account, security, and global parameters.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* My Profile */}
              <button
                onClick={() => setActiveTab('profile')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'profile' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'profile' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'profile' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'profile' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'profile' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'profile' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <User size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>My Profile</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Personal info & contacts</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: activeTab === 'profile' ? 1 : 0.4 }} />
              </button>

              {/* Security & Auth */}
              <button
                onClick={() => setActiveTab('security')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'security' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'security' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'security' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'security' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'security' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'security' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <Lock size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>Security & Auth</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Password, 2FA, Sessions</div>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>SECURE</span>
              </button>

              {/* Preferences & Theme */}
              <button
                onClick={() => setActiveTab('preferences')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'preferences' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'preferences' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'preferences' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'preferences' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'preferences' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'preferences' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <Sliders size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>Preferences</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Theme, language, region</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: activeTab === 'preferences' ? 1 : 0.4 }} />
              </button>

              {/* Notifications */}
              <button
                onClick={() => setActiveTab('notifications')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'notifications' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'notifications' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'notifications' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'notifications' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'notifications' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'notifications' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <Bell size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>Notifications</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Alerts & digests</div>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>ACTIVE</span>
              </button>

              {/* Organization & Roles */}
              <button
                onClick={() => setActiveTab('organization')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'organization' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'organization' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'organization' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'organization' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'organization' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'organization' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <Building size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>Organization</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Role & permission tree</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: activeTab === 'organization' ? 1 : 0.4 }} />
              </button>

            </div>
          </div>

          {/* SECURITY SCORE CARD */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Health</span>
              <ShieldCheck size={20} style={{ color: '#34d399' }} />
            </div>

            <div style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>98 / 100</div>
            <div style={{ fontSize: '12px', color: '#c7d2fe', marginBottom: '14px' }}>Excellent. 2FA is active and all sessions are encrypted.</div>

            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '98%', height: '100%', background: '#34d399', borderRadius: '3px' }} />
            </div>
          </div>

        </div>

        {/* RIGHT CONTENT CARDS CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && (
            <>
              {/* SECTION A: PERSONAL DETAILS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Personal Details</h3>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                      Primary identification credentials used across enterprise logs.
                    </p>
                  </div>
                  {saveSuccess && (
                    <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} /> Saved!
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>First Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Last Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Work Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="email"
                        disabled={!isEditing}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Contact Phone</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Professional Bio / Title</label>
                    <div style={{ position: 'relative' }}>
                      <Briefcase size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Gender</label>
                    <div style={{ position: 'relative' }}>
                      <Sparkles size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Date of Birth</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>National Emirates ID / Passport</label>
                    <div style={{ position: 'relative' }}>
                      <Hash size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: ADDRESS & REGIONAL DETAILS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Address & Tax Location</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Official billing and corporate domicile settings.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Country</label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>City / District / State</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={cityState}
                        onChange={(e) => setCityState(e.target.value)}
                        style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Postal Code / P.O. Box</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Corporate TAX / TRN Registration ID</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: isEditing ? 'var(--color-background)' : 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: WORK & ENTERPRISE METRICS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Workplace & Security Governance</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Assigned organizational unit and system clearance level.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Department</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>Executive Operations</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Employee ID</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>EMP-EX-001</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Employment Status</div>
                    <div style={{ marginTop: '4px' }}>
                      <span className="badge badge-active" style={{ fontSize: '12px' }}>FULL TIME</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SECURITY & AUTH */}
          {activeTab === 'security' && (
            <>
              {/* PASSWORD MANAGEMENT */}
              <form onSubmit={handlePasswordChange} className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Password & Authentication</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Update your primary master password with minimum 10 characters.
                  </p>
                </div>

                {passError && (
                  <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                    {passError}
                  </div>
                )}

                {passSuccess && (
                  <div style={{ padding: '12px', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Password updated successfully in database!
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ width: '100%', padding: '12px 42px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                      >
                        {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ width: '100%', padding: '12px 42px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* PASSWORD STRENGTH BAR */}
                    {newPassword && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: passStrength.color, marginBottom: '4px' }}>
                          <span>Password Strength</span>
                          <span>{passStrength.label}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${passStrength.percent}%`, height: '100%', background: passStrength.color, transition: 'all 0.3s ease' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  Update Password
                </button>
              </form>

              {/* TWO-FACTOR AUTHENTICATION */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a' }}>
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Two-Factor Authentication (2FA)</h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                        Requires an authenticator app (Google Authenticator or Authy) on login.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`badge ${twoFactor ? 'badge-active' : 'badge-warning'}`}
                    style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
                  >
                    {twoFactor ? '2FA ENABLED' : 'ENABLE 2FA'}
                  </button>
                </div>
              </div>

              {/* ACTIVE SESSIONS LIST */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Active Devices & Sessions</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Devices currently signed into your account from database sessions.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessions.length > 0 ? (
                    sessions.map((session, idx) => (
                      <div key={session.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <Monitor size={22} style={{ color: '#2563eb' }} />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {session.deviceInfo || 'Active Session Token'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Expires: {new Date(session.expiresAt).toLocaleDateString()} • IP: {session.ipAddress || '185.120.44.10'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#dc2626' }}
                        >
                          Revoke Session
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Monitor size={22} style={{ color: '#2563eb' }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Windows 11 PC — Chrome Browser</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Dubai, UAE • IP: 185.120.44.10 • Active JWT Session</div>
                        </div>
                      </div>
                      <span className="badge badge-active">CURRENT DEVICE</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <>
              {/* THEME SELECTOR */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Interface Theme</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Choose your visual mode for the entire Enterprise ERP portal.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  
                  {/* Light Mode Card */}
                  <div
                    onClick={() => applyTheme('light')}
                    style={{
                      padding: '24px', borderRadius: '14px', cursor: 'pointer',
                      border: theme === 'light' ? '2px solid #2563eb' : '1px solid var(--color-border)',
                      background: theme === 'light' ? '#eff6ff' : 'var(--color-background)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                      <Sun size={24} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: theme === 'light' ? '#2563eb' : 'var(--color-text-primary)' }}>Light Theme</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Clean high-contrast daylight mode</div>
                  </div>

                  {/* Dark Mode Card */}
                  <div
                    onClick={() => applyTheme('dark')}
                    style={{
                      padding: '24px', borderRadius: '14px', cursor: 'pointer',
                      border: theme === 'dark' ? '2px solid #2563eb' : '1px solid var(--color-border)',
                      background: theme === 'dark' ? '#1e293b' : 'var(--color-background)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                      <Moon size={24} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: theme === 'dark' ? '#38bdf8' : 'var(--color-text-primary)' }}>Dark Theme</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Sleek slate navy mode for low light</div>
                  </div>

                  {/* System Default */}
                  <div
                    onClick={() => applyTheme('system')}
                    style={{
                      padding: '24px', borderRadius: '14px', cursor: 'pointer',
                      border: theme === 'system' ? '2px solid #2563eb' : '1px solid var(--color-border)',
                      background: theme === 'system' ? '#eff6ff' : 'var(--color-background)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <Laptop size={24} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: theme === 'system' ? '#7c3aed' : 'var(--color-text-primary)' }}>System Auto</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>Matches operating system setting</div>
                  </div>

                </div>
              </div>

              {/* LANGUAGE & REGIONAL SETTINGS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Localization & Regional Settings</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Select preferred system language, currency unit, and timezone.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>System Language</label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <select
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value); localStorage.setItem('language', e.target.value); }}
                        style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="English (US)">🇺🇸 English (US)</option>
                        <option value="Spanish (ES)">🇪🇸 Spanish (ES)</option>
                        <option value="French (FR)">🇫🇷 French (FR)</option>
                        <option value="Arabic (AR)">🇦🇪 Arabic (AR)</option>
                        <option value="German (DE)">🇩🇪 German (DE)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Timezone</label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Enterprise Notification Matrix</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                  Manage delivery channels for operational, financial, and security alerts.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Mail size={22} style={{ color: '#2563eb' }} />
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Email Operational Digests</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Receive daily executive summaries of CRM sales, inventory restocks, and HR approvals.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifEmail}
                    onChange={() => setNotifEmail(!notifEmail)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Bell size={22} style={{ color: '#7c3aed' }} />
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Desktop Push Popups</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Instant browser notifications for urgent support tickets and low-stock alerts.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPush}
                    onChange={() => setNotifPush(!notifPush)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <ShieldCheck size={22} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Real-Time Security Alerts</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Immediate notification when new login sessions or API key changes occur.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSecurityAlerts}
                    onChange={() => setNotifSecurityAlerts(!notifSecurityAlerts)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: ORGANIZATION & ROLE PERMISSIONS */}
          {activeTab === 'organization' && (
            <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Role & Permission Tree</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                  Active system access grants mapped to your role ({user?.role || 'SUPER_ADMIN'}).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { module: 'HR Management', grant: 'FULL ACCESS (READ / WRITE / DELETE)', active: true },
                  { module: 'CRM Pipeline', grant: 'FULL ACCESS (READ / WRITE / DELETE)', active: true },
                  { module: 'Inventory & Warehouses', grant: 'FULL ACCESS (READ / WRITE / DELETE)', active: true },
                  { module: 'Projects & Timesheets', grant: 'FULL ACCESS (READ / WRITE / DELETE)', active: true },
                  { module: 'Finance & Ledger', grant: 'FULL ACCESS (READ / WRITE / DELETE)', active: true },
                  { module: 'Administration & System Logs', grant: 'FULL ACCESS (ADMIN)', active: true },
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.module}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{item.grant}</div>
                    </div>
                    <span className="badge badge-active" style={{ fontSize: '11px' }}>GRANTED</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
