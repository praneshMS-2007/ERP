'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email || 'admin@shuroq.com', password || 'password123');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: '#ffffff', margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      
      {/* LEFT SIDE — Form & Branding */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 80px', background: '#ffffff' }}>
        
        {/* Top Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', background: '#2563eb', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff'
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Enterprise ERP</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>GLOBAL OPERATIONS</div>
          </div>
        </div>

        {/* Center Login Form */}
        <div style={{ maxWidth: '380px', width: '100%', margin: 'auto 0' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px', lineHeight: 1.4 }}>
            Enter your credentials to access the operational dashboard.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Corporate Email Input */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                CORPORATE EMAIL
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#9ca3af' }} />
                <input
                  type="email"
                  placeholder="name@company.com"
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

            {/* Checkbox & Forgot Password Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
                <input type="checkbox" style={{ borderRadius: '4px', border: '1px solid #d1d5db', width: '16px', height: '16px' }} />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to corporate email.')}
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
            Need assistance? <a href="mailto:support@enterprise-erp.com" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Contact IT Support</a>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          &copy; 2026 Enterprise ERP Systems. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE — Dark Hero & High-Tech Visual */}
      <div style={{
        flex: '1', background: 'linear-gradient(135deg, #090e1a 0%, #0d172e 50%, #070c17 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px',
        position: 'relative', overflow: 'hidden'
      }}>
        
        {/* Center Glass Graphic Container — Exact Figma Asset */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <img
            src="/server-hero.png"
            alt="System Security & Live Feed"
            style={{
              maxWidth: '100%',
              maxHeight: '440px',
              borderRadius: '16px',
              objectFit: 'contain',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Bottom Text Header */}
        <div style={{ maxWidth: '500px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Integrated Productivity
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
            Connect your global supply chain, workforce, and financial operations in a single, unified source of truth.
          </p>
        </div>

      </div>

    </div>
  );
}
