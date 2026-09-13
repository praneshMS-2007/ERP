'use client';

import { useState, useEffect } from 'react';
import {
  User, Sliders,
  Sun, Moon, Laptop, Globe, Mail, Phone,
  Calendar, MapPin, Shield, Monitor, Home, GraduationCap,
  CheckCircle2, Building, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { settingsApi, API_ORIGIN } from '../../services/api';
import { formatDate } from '../../lib/date';

const EMP_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern',
};

/** A single read-only fact tile — the whole My Profile tab is built out of
 * these, since every field here is HR/Admin-owned (see hrmApi.updateEmployee
 * in the Employee Directory) and never editable from this page. */
function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        <Icon size={13} /> {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '6px' }}>{value || 'Not set'}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  // Navigation active tab: profile, sessions, preferences
  const [activeTab, setActiveTab] = useState<'profile' | 'sessions' | 'preferences'>('profile');

  // My Profile is entirely read-only — every field here comes straight from
  // the Employee record the HR/Admin Employee Directory owns, refetched on
  // every visit, so an edit made there shows up here automatically with no
  // separate sync step. There is no self-service edit path any more: the
  // employee reads their own record, they don't write it.
  const [profile, setProfile] = useState<any>(null);

  // Active Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  // Preferences & Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('English (US)');

  // Sync logged in user and fetch real backend profile & sessions
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const profileData = await settingsApi.getProfile();
        setProfile(profileData || null);

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

  const emp = profile?.employee;
  const displayEmail = profile?.email || (profile?.username ? `@${profile.username}` : 'Not set');
  const displayName = emp ? `${emp.firstName} ${emp.lastName}` : (user?.name || '');

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

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await settingsApi.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      console.error(err);
    }
  };

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
                {emp?.avatarUrl ? (
                  <img src={`${API_ORIGIN}${emp.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  `${emp?.firstName?.charAt(0) || ''}${emp?.lastName?.charAt(0) || ''}`
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
                  {displayName}
                </h1>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(37,99,235,0.3)', border: '1px solid rgba(59,130,246,0.5)',
                  fontSize: '11px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <Shield size={12} /> {user?.role || ''}
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

              <p style={{ fontSize: '13px', color: '#93c5fd', marginTop: '6px', margin: 0 }}>
                Read-only — HR/Admin updates this from the Employee Directory.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px', fontSize: '12.5px', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: '#60a5fa' }} /> {displayEmail}
                </span>
                {emp?.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ color: '#f472b6' }} /> {emp.city}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} style={{ color: '#34d399' }} /> Shuroq Systems Corp
                </span>
              </div>
            </div>
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

              {/* Active Devices & Sessions — password changes are HR/Admin-only
                  now (see the repurposed /portal page), so there's no
                  self-service Security tab any more, just this. */}
              <button
                onClick={() => setActiveTab('sessions')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px', border: 'none',
                  background: activeTab === 'sessions' ? 'var(--color-background)' : 'transparent',
                  color: activeTab === 'sessions' ? '#2563eb' : 'var(--color-text-primary)',
                  fontWeight: activeTab === 'sessions' ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                  borderLeft: activeTab === 'sessions' ? '4px solid #2563eb' : '4px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="hover-bg-gray"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: activeTab === 'sessions' ? '#dbeafe' : 'var(--color-background)', color: activeTab === 'sessions' ? '#2563eb' : 'var(--color-text-muted)' }}>
                    <Monitor size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ lineHeight: 1.2 }}>Sessions</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Devices signed into your account</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ opacity: activeTab === 'sessions' ? 1 : 0.4 }} />
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

            </div>
          </div>

        </div>

        {/* RIGHT CONTENT CARDS CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TAB 1: MY PROFILE — entirely read-only. Every value below comes
              straight off the Employee record HR/Admin maintains in the
              Employee Directory; there is no edit control anywhere on this
              page, and reloading always shows whatever they last set. */}
          {activeTab === 'profile' && (
            <>
              {/* SECTION A: PERSONAL DETAILS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Personal Details</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    From your Employee Directory record.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <InfoTile icon={User} label="First Name" value={emp?.firstName} />
                  <InfoTile icon={User} label="Last Name" value={emp?.lastName} />
                  <InfoTile icon={Mail} label="Work Email / Username" value={displayEmail} />
                  <InfoTile icon={Phone} label="Contact Phone" value={emp?.contact} />
                  <InfoTile icon={User} label="Gender" value={emp?.gender} />
                  <InfoTile icon={Calendar} label="Date of Birth" value={emp?.dob ? formatDate(emp.dob) : undefined} />
                </div>
              </div>

              {/* SECTION B: ADDRESS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Address</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Current residential address on file.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <InfoTile icon={Home} label="Address" value={emp?.address} />
                  <InfoTile icon={MapPin} label="City / State" value={emp?.city && emp?.state ? `${emp.city}, ${emp.state}` : (emp?.city || emp?.state)} />
                  <InfoTile icon={Globe} label="Country" value={emp?.country} />
                </div>
              </div>

              {/* SECTION C: EMPLOYEE DETAILS — real HR-owned fields from
                  Employee.department/designation/empCode/empType/joinDate. */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Employee Details</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Department, employee ID, and employment status from HR records.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <InfoTile icon={Building} label="Department" value={emp?.department?.name} />
                  <InfoTile icon={GraduationCap} label="Designation" value={emp?.designation?.title} />
                  <InfoTile icon={User} label="Employee ID" value={emp?.empCode} />
                  <InfoTile icon={CheckCircle2} label="Employment Status" value={emp?.empType ? (EMP_TYPE_LABEL[emp.empType] || emp.empType) : undefined} />
                  <InfoTile icon={Calendar} label="Date of Joining" value={emp?.joinDate ? formatDate(emp.joinDate) : undefined} />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ACTIVE DEVICES & SESSIONS — password resets are HR/Admin-only
              now, so this tab is just the real session list, no self-service
              password form and no 2FA (there's no 2FA implementation behind
              it to make that toggle real). */}
          {activeTab === 'sessions' && (
            <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Active Devices & Sessions</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                  Devices currently signed into your account, from real login sessions in the database.
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
                            {session.deviceInfo || 'Unknown device'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Expires: {formatDate(session.expiresAt)} • IP: {session.ipAddress || 'Unknown'}
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
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No active sessions found.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <>
              {/* THEME SELECTOR */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Interface Theme</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    Choose your visual mode for the entire Shuroq ERP portal.
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

              {/* LANGUAGE SETTINGS */}
              <div className="card" style={{ padding: '28px', borderRadius: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>Language</h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
                    System language.
                  </p>
                </div>

                <div style={{ maxWidth: '360px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>System Language</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <select
                      value={language}
                      onChange={(e) => { setLanguage(e.target.value); localStorage.setItem('language', e.target.value); }}
                      style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="English (US)">🇺🇸 English (US)</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
