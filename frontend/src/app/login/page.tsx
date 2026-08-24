'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, Building2, Zap, X } from 'lucide-react';
import { authApi } from '../../services/api';

const SAVED_CREDS_KEY = 'erp_saved_credentials';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
  const { login } = useAuth();

  const [showReset, setShowReset] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleRequestReset() {
    if (!resetIdentifier.trim()) return;
    setResetLoading(true);
    try {
      const res = await authApi.requestPasswordReset(resetIdentifier.trim());
      setResetMessage(res.message || 'If that account exists, HR/Admin has been notified to reset the password.');
    } catch {
      // Same generic message either way — never confirm/deny which identifiers exist.
      setResetMessage('If that account exists, HR/Admin has been notified to reset the password.');
    } finally {
      setResetLoading(false);
    }
  }

  function closeReset() {
    setShowReset(false);
    setResetIdentifier('');
    setResetMessage('');
  }

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CREDS_KEY);
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
          setHasSavedCreds(true);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }
      await login(email, password);

      // Save credentials on successful login if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem(SAVED_CREDS_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(SAVED_CREDS_KEY);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Quick login with saved credentials
  const handleQuickLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Saved credentials failed. Please re-enter.');
      handleClearSaved();
    } finally {
      setLoading(false);
    }
  };

  const handleClearSaved = () => {
    localStorage.removeItem(SAVED_CREDS_KEY);
    setEmail('');
    setPassword('');
    setRememberMe(false);
    setHasSavedCreds(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: '#ffffff', margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      
      {/* LEFT SIDE — Form & Branding */}
      <div style={{ width: '50%', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 64px', background: '#ffffff' }}>
        
        {/* Top Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/shuroq-logo.png"
            alt="Shuroq - Tech Redefined"
            style={{ height: '42px', objectFit: 'contain' }}
          />
        </div>

        {/* Center Login Form */}
        <div style={{ maxWidth: '380px', width: '100%', margin: 'auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px', lineHeight: 1.4 }}>
            Enter your credentials to access the operational dashboard.
          </p>

          {/* Quick Login Banner — shown when saved credentials exist */}
          {hasSavedCreds && (
            <div style={{
              padding: '14px 16px', marginBottom: '20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
              border: '1px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <Zap size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>Quick Login</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>{email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  disabled={loading}
                  style={{
                    padding: '7px 16px', background: '#2563eb', color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  <Zap size={13} /> {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleClearSaved}
                  title="Clear saved credentials"
                  style={{
                    padding: '5px', background: 'none', border: '1px solid #d1d5db',
                    borderRadius: '6px', cursor: 'pointer', color: '#9ca3af',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Email or ERP username — employees provisioned locally log in
                with a username like "lucas.scott", not an email address, so
                this must accept plain text rather than HTML5 email validation. */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                EMAIL OR USERNAME
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#9ca3af' }} />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="name@company.com or your.username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', height: '44px', paddingLeft: '42px', paddingRight: '14px',
                    borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none',
                    color: '#111827', background: '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* Secure Password Input */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                SECURE PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#9ca3af' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', height: '44px', paddingLeft: '42px', paddingRight: '42px',
                    borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none',
                    color: '#111827', background: '#ffffff', letterSpacing: showPassword ? 'normal' : '0.15em'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ borderRadius: '4px', border: '1px solid #d1d5db', width: '16px', height: '16px' }}
                />
                <span>Remember credentials</span>
              </label>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '46px', background: '#2563eb', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '4px', opacity: loading ? 0.7 : 1
              }}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Assistance Link */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '28px', paddingTop: '20px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
            Need assistance? <a href="mailto:support@shuroq.com" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Contact IT Support</a>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          &copy; 2026 Shuroq Technology Services. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE — Expanded Breadth & Structured Brand Showcase */}
      <div style={{
        width: '50%', minWidth: 0,
        background: '#171f39',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '28px 32px',
        position: 'relative', overflow: 'hidden', borderLeft: '1px solid #232d4d'
      }}>
        {/* Ambient Subtle Glows */}
        <div style={{
          position: 'absolute', top: '-15%', right: '-15%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(23,31,57,0) 70%)',
          pointerEvents: 'none', borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-15%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(23,31,57,0) 70%)',
          pointerEvents: 'none', borderRadius: '50%'
        }} />

        {/* 1st Half (Top): Main Shuroq Panoramic Banner with Expanded Breadth */}
        <div style={{
          flex: '1.4', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          width: '100%', zIndex: 1, padding: '12px 0 0'
        }}>
          <div style={{
            width: '100%', maxWidth: '780px', minHeight: '340px',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '18px',
            boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            overflow: 'hidden'
          }}>
            {/* Blurred, scaled-up copy of the same banner fills the card behind
                the sharp image — extends the banner's own background colors
                into the extra height instead of leaving empty frosted space. */}
            <img
              src="/shuroq-banner-exact.png"
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'blur(40px) saturate(1.15) brightness(0.9)',
                transform: 'scale(1.25)',
                zIndex: 0
              }}
            />
            <img
              src="/shuroq-banner-exact.png"
              alt="Shuroq Tech Redefined - Enterprise Solutions, IT Services, Consulting, Business Solutions, Cloud Services"
              style={{
                position: 'relative', zIndex: 1,
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
                boxShadow: '0 12px 34px rgba(0, 0, 0, 0.4)'
              }}
            />
          </div>
        </div>

        {/* 2nd Half (Bottom): Structured Company Brand Section */}
        <div style={{
          flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: '680px', margin: '0 auto', zIndex: 1,
          textAlign: 'center', padding: '8px 0'
        }}>
          {/* Company Title */}
          <h3 style={{
            fontSize: '19px', fontWeight: 800, color: '#ffffff',
            margin: '0 0 10px 0', letterSpacing: '-0.01em', lineHeight: 1.3
          }}>
            Technology Services & Digital Engineering Company
          </h3>

          {/* Mission Statement */}
          <p style={{
            fontSize: '14px', color: '#94a3b8', lineHeight: '1.6',
            maxWidth: '580px', margin: '0 0 10px 0'
          }}>
            Empowering businesses with cutting-edge technology solutions, cloud infrastructure, and digital transformation services.
          </p>

          {/* Tagline */}
          <div style={{
            fontSize: '14.5px', fontWeight: 800, color: '#f8fafc',
            letterSpacing: '0.04em', marginBottom: '14px'
          }}>
            Tech Redefined
          </div>

          {/* Social Icons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '14px' }}>
            {/* Instagram */}
            <a
              href="https://instagram.com" target="_blank" rel="noreferrer"
              style={{
                width: '38px', height: '38px', borderRadius: '50%', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#171f39',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'transform 0.15s'
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com" target="_blank" rel="noreferrer"
              style={{
                width: '38px', height: '38px', borderRadius: '50%', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#171f39',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'transform 0.15s'
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect width="4" height="12" x="2" y="9"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com" target="_blank" rel="noreferrer"
              style={{
                width: '38px', height: '38px', borderRadius: '50%', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#171f39',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'transform 0.15s'
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                <path d="M9 18c-4.51 2-5-2-7-2"/>
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:support@shuroq.com"
              style={{
                width: '38px', height: '38px', borderRadius: '50%', background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#171f39',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', transition: 'transform 0.15s'
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </a>
          </div>

          {/* Copyright Subtext */}
          <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '0.02em' }}>
            &copy; 2026 Shuroq Technology Services. All rights reserved.
          </div>
        </div>

      </div>

      {/* Forgot Password Modal — submits to HR/Admin's inbox; no automatic reset happens */}
      {showReset && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeReset(); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '420px', maxWidth: '92vw', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#111827' }}>Reset your password</h2>
              <button onClick={closeReset} style={{ border: 'none', background: '#f3f4f6', cursor: 'pointer', borderRadius: '8px', padding: '6px', color: '#6b7280', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {resetMessage ? (
                <p style={{ fontSize: '13.5px', color: '#374151', lineHeight: 1.5 }}>{resetMessage}</p>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
                    Enter your email or username. HR/Admin will see your request and reset the password manually — there's no automatic reset.
                  </p>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    EMAIL OR USERNAME
                  </label>
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="name@company.com or your.username"
                    style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', color: '#111827' }}
                  />
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                {resetMessage ? (
                  <button onClick={closeReset} style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Done</button>
                ) : (
                  <>
                    <button onClick={closeReset} style={{ padding: '10px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleRequestReset} disabled={resetLoading || !resetIdentifier.trim()} style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: resetLoading || !resetIdentifier.trim() ? 0.6 : 1 }}>
                      {resetLoading ? 'Submitting…' : 'Submit Request'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
