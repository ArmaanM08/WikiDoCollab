import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useParams, useNavigate } from 'react-router-dom';

export default function VersionHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/documents/${id}/versions`)
      .then(res => {
        setVersions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)' }}>Version Commits</h2>
        <button className="btn btn-outline" onClick={() => navigate(`/doc/${id}`)}>
          ← Back to Editor
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading commit history…</p>
        </div>
      ) : versions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No version commits found for this document.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          {/* Vertical timeline axis */}
          <div style={{ 
            position: 'absolute', 
            top: '8px', 
            bottom: '8px', 
            left: '7px', 
            width: '2px', 
            backgroundColor: 'var(--border)',
            zIndex: 0
          }} />

          {versions.map((v, index) => (
            <div key={v._id} className="slide-up" style={{ 
              position: 'relative', 
              marginBottom: '2rem',
              animationDelay: `${index * 0.05}s`
            }}>
              {/* Node indicator dot */}
              <div style={{ 
                position: 'absolute', 
                top: '6px', 
                left: '-2rem', 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)',
                border: '3px solid var(--bg)',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 1
              }} />

              <div className="card glass" style={{ padding: '1.25rem 1.5rem', cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: '600', color: 'var(--text)' }}>
                    {v.message || 'Manual snapshot save'}
                  </span>
                  <span className="item-meta" style={{ fontSize: '0.8125rem' }}>
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
                {v.authorId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      Author
                    </span>
                    <span className="item-meta" style={{ fontWeight: '500' }}>
                      {v.authorId.displayName || v.authorId.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
