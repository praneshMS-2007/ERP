'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('pranesh@shuroq.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authApi.login({ email, password });
      
      if (res.token) {
        // Store token and user data (in a real app, use a proper auth context)
        localStorage.setItem('token', res.token);
        if (res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
        }
        router.push('/');
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#ffffff', margin: 0 }}>
      {/* Left side: Branding / Hero */}
      <div style={{ flex: 1, background: 'var(--color-sidebar)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '40px' }}>
        {/* Background Graphic */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, #2563eb 0%, transparent 60%)', opacity: 0.15, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '800px', height: '800px', background: 'radial-gradient(circle, #3b82f6 0%, transparent 60%)', opacity: 0.1, borderRadius: '50%' }} />
        
        {/* Logo Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
          <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', color: 'white' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em' }}>Enterprise ERP</div>
            <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Operations</div>
          </div>
        </div>

        {/* Hero Text */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto', zIndex: 10 }}>
          <h1 style={{ color: 'white', fontSize: '48px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Unify your<br/>global operations.
          </h1>
          <p style={{ color: '#d1d5db', fontSize: '18px', maxWidth: '400px', lineHeight: 1.5 }}>
            Access real-time insights, manage your workforce, and track inventory from a single, intelligent platform.
          </p>
        </div>

        {/* Footer */}
        <div style={{ zIndex: 10, color: '#6b7280', fontSize: '13px' }}>
          &copy; {new Date().getFullYear()} Shuroq Systems. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', marginBottom: '8px', letterSpacing: '-0.02em' }}>Welcome back</h2>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '40px' }}>Please enter your details to sign in.</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                {error}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Email address</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', outline: 'none' }} 
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Password</label>
                <Link href="#" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', outline: 'none', letterSpacing: '0.2em' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' }}>
              <input type="checkbox" id="remember" style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #d1d5db' }} defaultChecked />
              <label htmlFor="remember" style={{ fontSize: '13px', color: '#4b5563' }}>Remember for 30 days</label>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <button type="button" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            Don&apos;t have an account? <Link href="#" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Contact IT support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
