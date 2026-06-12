import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './Login.jsx';
import DocumentLibrary from './DocumentLibrary.jsx';
import EditorSession from './EditorSession.jsx';
import VersionHistory from './VersionHistory.jsx';
import Profile from './Profile.jsx';
import Landing from './Landing.jsx';
import { AuthProvider, useAuth } from '../auth.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const initial = saved || 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  // Hide header only on landing page to maximize space for video art
  if (location.pathname === '/') return null;

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand">
          <Link to="/library" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            <span style={{ fontSize: '1.25rem' }}>🖋️</span>
            <span>WikiDoCollab</span>
          </Link>
        </div>
        <nav className="nav-links">
          <NavLink to="/library" end className={({ isActive }) => isActive ? 'active' : ''}>Library</NavLink>
          {user && <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>}
        </nav>
        <div className="nav-actions">
          <button className="btn btn-outline" onClick={toggleTheme} aria-label="Toggle dark mode" style={{ width: '38px', height: '38px', padding: 0 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <button className="btn btn-primary" onClick={() => { logout(); navigate('/'); }}>Logout</button>
          ) : (
            <Link to="/login" className="btn btn-primary">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '6rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Checking authentication status…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/library" element={<DocumentLibrary />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route path="/doc/:id" element={<EditorSession />} />
          <Route path="/doc/:id/versions" element={<VersionHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
