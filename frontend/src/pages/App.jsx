import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Login from './Login.jsx';
import DocumentLibrary from './DocumentLibrary.jsx';
import EditorSession from './EditorSession.jsx';
import VersionHistory from './VersionHistory.jsx';
import Profile from './Profile.jsx';
import Requests from './Requests.jsx';
import Landing from './Landing.jsx';
import { AuthProvider, useAuth } from '../auth.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Initialize theme from localStorage; default to light regardless of OS
    const saved = localStorage.getItem('theme');
    const initial = saved || 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = (theme === 'dark') ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };
  // Hide nav on Landing and Profile routes per requirements
  if (location.pathname === '/landing' || location.pathname.startsWith('/profile') || location.pathname === '/') return null;

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand"><Link to="/library" style={{ textDecoration: 'none', color: 'inherit' }}>WikiDoCollab</Link></div>
        <nav className="nav-links fancy">
          <NavLink to="/library" end className={({ isActive }) => isActive ? 'active' : ''}>Library</NavLink>
          {user && <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>}
        </nav>
        <div className="nav-actions">
          <button className="btn" onClick={toggleTheme}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>
          {user ? (
            <button className="btn" onClick={() => { logout(); navigate('/'); }}>Logout</button>
          ) : (
            <Link to="/login" className="btn">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/doc/:id" element={<EditorSession />} />
          <Route path="/doc/:id/versions" element={<VersionHistory />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
