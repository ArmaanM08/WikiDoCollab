import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Set dark mode as default for landing page
    const saved = localStorage.getItem('theme');
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div className="landing fade-in">
      <button className="theme-toggle-landing" onClick={toggleTheme}>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
      <div className="hero slide-up">
        <div className='video-background'>
          <iframe 
            src="https://www.youtube.com/embed/tmCMfwXzTaY?autoplay=1&mute=1&loop=1&playlist=tmCMfwXzTaY&controls=0&showinfo=0&modestbranding=1&playsinline=1" 
            title="Background Video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
        <div className="hero-content card glass">
          <h1 className="hero-title">Collaborate. Create. Commit.</h1>
          <p className="hero-sub">A sleek, real‑time docs platform for teams and classmates. Simple to use, powerful under the hood.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/login">Get Started</Link>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/')}>
              Browse Documents
            </button>
          </div>
        </div>
      </div>
      <div className="features slide-up">
        <div className="feature card glass">
          <h3>Live Collaboration</h3>
          <p className="item-meta">Edit together with instant updates and conflict‑safe merges.</p>
        </div>
        <div className="feature card glass" style={{transitionDelay:'0.05s'}}>
          <h3>Version History</h3>
          <p className="item-meta">Save snapshots, track changes, and download when needed.</p>
        </div>
        <div className="feature card glass" style={{transitionDelay:'0.1s'}}>
          <h3>Permissions</h3>
          <p className="item-meta">Owners control access with simple requests and approvals.</p>
        </div>
      </div>
    </div>
  );
}
