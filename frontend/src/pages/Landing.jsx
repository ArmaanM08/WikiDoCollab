import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
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
      <button className="theme-toggle-landing btn btn-outline" onClick={toggleTheme}>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div className="hero">
        <div className="video-background">
          <video autoPlay muted loop playsInline>
            <source src="/Background.mp4" type="video/mp4" />
            <source src="/Background.webm" type="video/webm" />
          </video>
        </div>

        <div className="hero-content card glass slide-up">
          <h1 className="hero-title">Collaborate.<br />Create. Commit.</h1>
          <p className="hero-sub">
            A real-time workspace for documentation and editing. Refined tools, elegant design, and seamless version history.
          </p>
          <div className="hero-actions">
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/library')}>
                Go to Library
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
                  Get Started
                </button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/library')}>
                  Browse Documents
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="features slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="feature">
          <h3>BlockNote Rich Text</h3>
          <p className="item-meta">
            Create structured, media-rich documents with a powerful block-based canvas.
          </p>
        </div>
        <div className="feature">
          <h3>Real-time Sync</h3>
          <p className="item-meta">
            Edit simultaneously with team members. Edits update live without conflict loops.
          </p>
        </div>
        <div className="feature">
          <h3>Version Snapshots</h3>
          <p className="item-meta">
            Save manual snapshots with custom logs and export to HTML, DOCX, or PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
