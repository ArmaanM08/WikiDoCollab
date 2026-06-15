import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Particles from './Particles.jsx';
import SplitText from './SplitText.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [bgDisabled, setBgDisabled] = useState(() => localStorage.getItem('disableBgAnimation') === 'true');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setBgDisabled(localStorage.getItem('disableBgAnimation') === 'true');
    };
    window.addEventListener('bgAnimationToggled', handleToggle);
    return () => window.removeEventListener('bgAnimationToggled', handleToggle);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div className="landing fade-in" style={{ position: 'relative' }}>
      {!bgDisabled && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Particles
            particleColors={theme === 'dark' ? ["#DDA08E", "#B26A54", "#ffffff"] : ["#B26A54", "#38293F", "#191919"]}
            particleCount={750}
            particleSpread={12}
            speed={0.15}
            particleBaseSize={240}
            moveParticlesOnHover={true}
            alphaParticles={true}
            disableRotation={false}
          />
        </div>
      )}

      <button className="theme-toggle-landing btn btn-outline" onClick={toggleTheme} style={{ zIndex: 10 }}>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div className="hero" style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SplitText
          text="WikiDoCollab"
          className="hero-brand-title"
          delay={80}
          duration={0.8}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 30 }}
          to={{ opacity: 1, y: 0 }}
          textAlign="center"
          tag="h1"
          loop={true}
          loopDelay={4}
        />

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
