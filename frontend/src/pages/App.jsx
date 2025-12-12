import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import Login from './Login.jsx';
import DocumentLibrary from './DocumentLibrary.jsx';
import EditorSession from './EditorSession.jsx';
import VersionHistory from './VersionHistory.jsx';
import Profile from './Profile.jsx';
import Requests from './Requests.jsx';
import { AuthProvider, useAuth } from '../auth.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('');

  useEffect(() => {
    // Initialize theme from localStorage or OS preference
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = (theme === 'dark') ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };
  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand"><Link to="/" style={{ textDecoration: 'none', color: 'inherit', transitions: 'none', boxShadow: 'none'}}>WikiDoCollab</Link></div>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Library</NavLink>
          {user && <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>}
          {user && <NavLink to="/requests" className={({ isActive }) => isActive ? 'active' : ''}>Requests</NavLink>}
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
          <Route path="/" element={<DocumentLibrary />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/doc/:id" element={<EditorSession />} />
          <Route path="/doc/:id/versions" element={<VersionHistory />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
