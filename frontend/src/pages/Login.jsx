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
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const login = async () => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      sessionStorage.setItem('accessToken', res.data.token);
      setMessage('Logged in');
      await authLogin(res.data.token);
      navigate('/library');
    } catch (e) {
      setMessage('Login failed');
    }
  };

  const signup = async () => {
    try {
      await api.post('/api/auth/register', { email, password, displayName });
      setMessage('Signup successful. Please login.');
      setMode('login');
    } catch (e) {
      setMessage('Signup failed');
    }
  };

  return (
    <div className="card">
      <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <div className="mb-16 mt-8">
        <div className="tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
        </div>
      </div>
      <div className="section">
        <label className="label">Email</label>
        <input className="input" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="section">
        <label className="label">Password</label>
        <input className="input" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      {mode === 'signup' && (
        <div className="section">
          <label className="label">Display Name</label>
          <input className="input" placeholder="display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
      )}
      <div className="mt-16 flex gap-12">
        {mode === 'login' ? (
          <button className="btn btn-primary" onClick={login}>Login</button>
        ) : (
          <button className="btn btn-primary" onClick={signup}>Sign Up</button>
        )}
      </div>
      {message && <p className="mt-16">{message}</p>}
      {token && <p className="mt-8">Logged in</p>}
    </div>
  );
}
