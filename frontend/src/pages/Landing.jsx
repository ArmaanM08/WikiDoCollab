import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing">
      <div className="hero">
        <div className="hero-content card fade-in">
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
      <div className="features">
        <div className="feature card slide-up">
          <h3>Live Collaboration</h3>
          <p className="item-meta">Edit together with instant updates and conflict‑safe merges.</p>
        </div>
        <div className="feature card slide-up" style={{transitionDelay:'0.05s'}}>
          <h3>Version History</h3>
          <p className="item-meta">Save snapshots, track changes, and download when needed.</p>
        </div>
        <div className="feature card slide-up" style={{transitionDelay:'0.1s'}}>
          <h3>Permissions</h3>
          <p className="item-meta">Owners control access with simple requests and approvals.</p>
        </div>
      </div>
    </div>
  );
}
