import React, { useState } from 'react';
import { api } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div style={{ maxWidth: '440px', margin: '4rem auto' }} className="fade-in">
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
  );
}
