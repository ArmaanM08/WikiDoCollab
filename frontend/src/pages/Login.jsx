import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import ShapeGrid from './ShapeGrid.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      const updatedTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(updatedTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const isDark = theme === 'dark';
  const gridBorderColor = isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(56, 41, 63, 0.12)';
  const gridHoverColor = isDark ? 'rgba(221, 160, 142, 0.35)' : 'rgba(178, 106, 84, 0.2)';
  const gridVignetteColor = isDark ? 'rgba(19, 19, 19, 0.75)' : 'rgba(250, 248, 245, 0.9)';

  const [bgDisabled, setBgDisabled] = useState(() => localStorage.getItem('disableBgAnimation') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setBgDisabled(localStorage.getItem('disableBgAnimation') === 'true');
    };
    window.addEventListener('bgAnimationToggled', handleToggle);
    return () => window.removeEventListener('bgAnimationToggled', handleToggle);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/api/auth/login', { email, password });
        const { token, user: userData } = res.data;
        await authLogin(token, userData);
        navigate('/library');
      } else {
        if (!displayName) {
          setErrorMsg('Please enter a display name.');
          setLoading(false);
          return;
        }
        await api.post('/api/auth/register', { email, password, displayName });
        // Successful signup, switch to login mode and clear inputs
        setMode('login');
        setErrorMsg('Sign up successful! Please log in below.');
      }
    } catch (err) {
      const errRes = err.response?.data?.error || 'An error occurred. Please try again.';
      setErrorMsg(errRes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper" style={{ position: 'relative', minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', overflow: 'hidden' }}>
      {!bgDisabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <ShapeGrid
            speed={0.4}
            squareSize={48}
            direction="diagonal"
            borderColor={gridBorderColor}
            hoverFillColor={gridHoverColor}
            shape="hexagon"
            hoverTrailAmount={6}
            vignetteColor={gridVignetteColor}
          />
        </div>
      )}

      <div style={{ maxWidth: '440px', width: '100%', zIndex: 1 }} className="fade-in">
        <div className="card glass">
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          
          <div className="mb-24">
            <div className="tabs">
              <button 
                type="button" 
                className={`tab ${mode === 'login' ? 'active' : ''}`} 
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                Log In
              </button>
              <button 
                type="button" 
                className={`tab ${mode === 'signup' ? 'active' : ''}`} 
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input 
                className="input" 
                type="email" 
                placeholder="name@domain.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
              />
            </div>
            
            <div className="form-group">
              <label className="label">Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>

            {mode === 'signup' && (
              <div className="form-group className='fade-in'">
                <label className="label">Display Name</label>
                <input 
                  className="input" 
                  type="text" 
                  placeholder="Alex Carter" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  required
                />
              </div>
            )}

            {errorMsg && (
              <div style={{ 
                color: errorMsg.includes('successful') ? 'var(--success)' : 'var(--danger)', 
                fontSize: '0.875rem', 
                marginTop: '1rem',
                marginBottom: '1rem',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {errorMsg}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-8" 
              disabled={loading}
              style={{ padding: '0.75rem' }}
            >
              {loading ? 'Processing…' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
